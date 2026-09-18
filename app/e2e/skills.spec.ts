import { expect, test } from "./fixtures/test";
import { settled } from "./fixtures/settle";

/**
 * Skills (STORY_040's templates on STORY_059's page): /plugins and /plugins?tab=Skills&create=1 redirect to /skills;
 * the sidebar row reads Skills; a template created on the page is listed under + › Skills › Templates and Use'd into
 * the composer. The template is restored at the end.
 */
test.describe("Skills (STORY_040, STORY_059)", () => {
  test("the page has no tabs and no plugin switch; the old Plugins links redirect; a created template is listed under + › Skills › Templates and Use fills the composer", async ({ page, request }, testInfo) => {
    const narrow = testInfo.project.name === "narrow";
    await page.goto("/plugins");
    await expect(page).toHaveURL(/\/skills$/);
    await expect(page.getByRole("heading", { level: 1, name: "Skills" })).toBeVisible();
    await expect(page.getByRole("tablist")).toHaveCount(0);
    await expect(page.getByTestId("plugin-row")).toHaveCount(0);
    await expect(page.getByRole("switch", { name: "video-creator enabled" })).toHaveCount(0);
    await expect(page.getByTestId("director-row")).toHaveCount(2);
    await expect(page.getByTestId("templates")).toBeVisible();
    expect((await request.patch("/api/settings", { data: { videoEnabled: false } })).status()).toBe(400); // STORY_059 retired the switch's setting
    // Templates (STORY_054's wording): create one, find it under + › Skills › Templates, Use it
    const tag = String(Date.now()).slice(-6);
    await page.goto("/plugins?tab=Skills&create=1"); // the old link (+ › Skills › Add template before STORY_059) still lands
    await expect(page).toHaveURL(/\/skills\?create=1$/);
    await settled(page);
    const form = page.getByRole("form", { name: "Create template" });
    await form.getByRole("textbox", { name: "Template name" }).fill(`Slow push-in ${tag}`);
    await form.getByRole("textbox", { name: "Template description" }).fill("A slow dolly toward the subject");
    await form.getByRole("textbox", { name: "Template text" }).fill(`Slow dolly toward {{idea}}, ${tag}`);
    const created = page.waitForResponse((r) => r.url().endsWith("/api/skills") && r.request().method() === "POST");
    await form.getByRole("button", { name: "Create template" }).click();
    expect((await created).status()).toBe(201);
    const skillRow = page.getByTestId("skill-row").filter({ hasText: `Slow push-in ${tag}` });
    await expect(skillRow).toBeVisible();
    await expect(page.getByTestId("skill-row").filter({ hasText: "Short-to-script" })).toContainText("Built-in");
    await page.goto("/");
    await settled(page);
    await page.getByRole("textbox", { name: "Message" }).fill("a paper boat");
    await page.getByRole("button", { name: "Add attachment" }).click();
    await page.getByRole("menuitem", { name: "Skills" }).click();
    await page.getByRole("menu", { name: "Skills" }).getByRole("menuitem", { name: "Templates" }).click();
    await page.getByRole("menu", { name: "Templates" }).getByRole("menuitem", { name: `Slow push-in ${tag}` }).click();
    await expect(page.getByRole("textbox", { name: "Message" })).toHaveValue(`Slow dolly toward a paper boat, ${tag}`);
    // Use from the tab lands on the home composer with the template (the slot left for the idea)
    await page.goto("/skills");
    await settled(page);
    await skillRow.getByRole("button", { name: `Use Slow push-in ${tag}` }).click();
    await expect(page).toHaveURL(/\/\?skill=/);
    await expect(page.getByRole("textbox", { name: "Message" })).toHaveValue(`Slow dolly toward {{idea}}, ${tag}`);
    if (narrow) await expect(page.getByTestId("skills-page")).toHaveCount(0);
    // clean up: the template goes; the built-in cannot
    const skills = (await (await request.get("/api/skills")).json()) as { skills: { id: string; name: string }[] };
    const mine = skills.skills.find((s) => s.name === `Slow push-in ${tag}`);
    expect(mine).toBeDefined();
    expect((await request.delete(`/api/skills/${mine?.id ?? ""}`)).status()).toBe(204);
    expect((await request.delete("/api/skills/short-to-script")).status()).toBe(400);
  });
});
