import { expect, test } from "./fixtures/test";
import { settled } from "./fixtures/settle";

/**
 * Management (STORY_040): the video-creator plugin described from the stub's capabilities, its switch making a text-only
 * workstation and back; a skill created on the Skills tab, listed under + › Skills, and Use'd into the composer.
 * The settings and the skill are restored at the end.
 */
test.describe("Management (STORY_040)", () => {
  test("the plugin row, its switch off → no Video generation → on again; a created skill is listed under + › Skills and Use fills the composer", async ({ page, request }, testInfo) => {
    const narrow = testInfo.project.name === "narrow";
    await request.patch("/api/settings", { data: { videoEnabled: true } });
    await page.goto("/plugins");
    await settled(page);
    const row = page.getByTestId("plugin-row");
    await expect(row).toContainText("video-creator");
    await expect(row).toContainText("on the Spark through the adapter · 768P · 4–15 s · ● reachable"); // the stub's capabilities
    await row.getByRole("button", { name: "Details" }).click();
    await expect(page.getByTestId("plugin-details")).toContainText("Reference images");
    const toggle = row.getByRole("switch", { name: "video-creator enabled" });
    await expect(toggle).toHaveAttribute("aria-checked", "true");
    const off = page.waitForResponse((r) => r.url().endsWith("/api/settings") && r.request().method() === "PATCH");
    await toggle.click();
    expect((await off).ok()).toBe(true);
    await expect(toggle).toHaveAttribute("aria-checked", "false");
    await page.goto("/");
    await settled(page);
    await expect(page.getByRole("button", { name: /Video generation/ })).toHaveCount(0); // a text-only workstation
    await page.goto("/plugins");
    await settled(page);
    const on = page.waitForResponse((r) => r.url().endsWith("/api/settings") && r.request().method() === "PATCH");
    await page.getByRole("switch", { name: "video-creator enabled" }).click();
    expect((await on).ok()).toBe(true);
    await page.goto("/");
    await settled(page);
    await expect(page.getByRole("button", { name: /Video generation/ })).toBeVisible();
    // Skills: create one, find it under + › Skills, Use it
    const tag = String(Date.now()).slice(-6);
    await page.goto("/plugins?tab=Skills&create=1");
    await settled(page);
    const form = page.getByRole("form", { name: "Create skill" });
    await form.getByRole("textbox", { name: "Skill name" }).fill(`Slow push-in ${tag}`);
    await form.getByRole("textbox", { name: "Skill description" }).fill("A slow dolly toward the subject");
    await form.getByRole("textbox", { name: "Skill template" }).fill(`Slow dolly toward {{idea}}, ${tag}`);
    const created = page.waitForResponse((r) => r.url().endsWith("/api/skills") && r.request().method() === "POST");
    await form.getByRole("button", { name: "Create skill" }).click();
    expect((await created).status()).toBe(201);
    const skillRow = page.getByTestId("skill-row").filter({ hasText: `Slow push-in ${tag}` });
    await expect(skillRow).toBeVisible();
    await expect(page.getByTestId("skill-row").filter({ hasText: "Short-to-script" })).toContainText("Built-in");
    await page.goto("/");
    await settled(page);
    await page.getByRole("textbox", { name: "Message" }).fill("a paper boat");
    await page.getByRole("button", { name: "Add attachment" }).click();
    await page.getByRole("menuitem", { name: "Skills" }).click();
    await page.getByRole("menu", { name: "Skills" }).getByRole("menuitem", { name: `Slow push-in ${tag}` }).click();
    await expect(page.getByRole("textbox", { name: "Message" })).toHaveValue(`Slow dolly toward a paper boat, ${tag}`);
    // Use from the tab lands on the home composer with the template (the slot left for the idea)
    await page.goto("/plugins?tab=Skills");
    await settled(page);
    await skillRow.getByRole("button", { name: `Use Slow push-in ${tag}` }).click();
    await expect(page).toHaveURL(/\/\?skill=/);
    await expect(page.getByRole("textbox", { name: "Message" })).toHaveValue(`Slow dolly toward {{idea}}, ${tag}`);
    if (narrow) await expect(page.getByTestId("manage-page")).toHaveCount(0);
    // clean up: the skill goes; the built-in cannot
    const skills = (await (await request.get("/api/skills")).json()) as { skills: { id: string; name: string }[] };
    const mine = skills.skills.find((s) => s.name === `Slow push-in ${tag}`);
    expect(mine).toBeDefined();
    expect((await request.delete(`/api/skills/${mine?.id ?? ""}`)).status()).toBe(204);
    expect((await request.delete("/api/skills/short-to-script")).status()).toBe(400);
  });
});
