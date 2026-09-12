import { expect, test } from "./fixtures/test";
import { settled } from "./fixtures/settle";
import { REFERENCE_IMAGE } from "./fixtures/upload";

test.describe("composer and video mode (STORY_013)", () => {
  test("video parameters and the model menu reflect the Spark's capabilities", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Video generation/ }).click();
    await settled(page);
    await expect(page.getByText("video-creator")).toBeVisible();
    const params = page.getByRole("button", { name: /^Video parameters:/ });
    await expect(params).toHaveAccessibleName("Video parameters: 16:9 768P 5s");
    await params.click();
    await settled(page);
    await expect(page.getByRole("radio", { name: /2K/ })).toBeDisabled();
    await page.getByRole("radio", { name: "9:16" }).click();
    await page.getByRole("radio", { name: "10s" }).click();
    await expect(page.getByRole("button", { name: "Video parameters: 9:16 768P 10s" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Video parameters" })).toBeHidden();
    await page.getByRole("button", { name: /^Model:/ }).click();
    await settled(page);
    await expect(page.getByRole("menuitemradio", { name: /Hailuo-2.3/ })).toBeDisabled();
    await expect(page.getByRole("menuitemradio", { name: /MiniMax-H3-Max/ })).toBeDisabled();
    await page.keyboard.press("Escape");
  });

  test("a reference image is accepted as a thumbnail and can be removed", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Video generation/ }).click();
    await page.getByTestId("reference-input").setInputFiles(REFERENCE_IMAGE);
    await expect(page.getByRole("img", { name: "Reference image 1" })).toBeVisible();
    await page.getByRole("button", { name: "Remove Reference image 1" }).click();
    await expect(page.getByRole("img", { name: "Reference image 1" })).toBeHidden();
  });

  test("Send creates the job the stub receives and lands on the task URL", async ({ page, stubApi }) => {
    await page.goto("/?script=done-after-1-poll");
    await page.getByRole("button", { name: /Video generation/ }).click();
    await page.getByRole("button", { name: /^Video parameters:/ }).click();
    await page.getByRole("radio", { name: "9:16" }).click();
    await page.getByRole("radio", { name: "8s" }).click();
    await page.keyboard.press("Escape");
    await page.getByTestId("reference-input").setInputFiles(REFERENCE_IMAGE);
    await page.getByRole("textbox", { name: "Message" }).fill("A small paper boat drifting");
    const created = page.waitForResponse((r) => r.url().includes("/api/jobs") && r.request().method() === "POST");
    await page.getByRole("button", { name: "Send message" }).click();
    const response = await created;
    expect(response.status()).toBe(202);
    const { id } = (await response.json()) as { id: string };
    await expect(page).toHaveURL(new RegExp(`/task/${id}$`));
    const received = await stubApi.received(id);
    expect(received.request).toMatchObject({ prompt: "A small paper boat drifting", ratio: "9:16", durationSeconds: 8, referenceImages: 1 });
    expect(received.uploads[0]?.filename).toBe("fixture-reference.png");
    // finish the job so the afterEach guard sees nothing running (the task page polls only from STORY_014)
    const status = await page.request.get(`/api/jobs/${id}`);
    expect(((await status.json()) as { status: string }).status).toBe("done");
  });

  test("Send outside video mode explains that only videos are generated", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("textbox", { name: "Message" }).fill("hello");
    await page.getByRole("button", { name: "Send message" }).click();
    // Next's route announcer is also role=alert; pick ours by its text.
    await expect(page.getByRole("alert").filter({ hasText: "only generates videos" })).toBeVisible();
  });
});
