import { expect, test } from "./fixtures/test";
import { settled } from "./fixtures/settle";
import { REFERENCE_IMAGE } from "./fixtures/upload";

test.describe("composer and video mode (STORY_013)", () => {
  test("video parameters and the model menu reflect the Spark's capabilities", async ({ page }, testInfo) => {
    await page.goto("/");
    await settled(page);
    const params = page.getByRole("button", { name: /^Video parameters:/ });
    await expect(params).toHaveAccessibleName("Video parameters: 16:9 768P 5s");
    await params.click();
    await settled(page);
    await expect(page.getByRole("radiogroup", { name: "Resolution" }).getByRole("radio")).toHaveText(["768P"]); // STORY_026: no greyed 2K
    await page.getByRole("radio", { name: "9:16" }).click();
    await page.getByRole("radio", { name: "10s" }).click();
    await expect(page.getByRole("button", { name: "Video parameters: 9:16 768P 10s" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Video parameters" })).toBeHidden();
    if (testInfo.project.name === "narrow") {
      // narrow-composer-video-mode@390: the reference does not show the Model control at 390 (STORY_022), so neither do we.
      await expect(page.getByRole("button", { name: /^Model:/ })).toBeHidden();
      return;
    }
    await page.getByRole("button", { name: /^Model:/ }).click();
    await settled(page);
    await expect(page.getByRole("menuitemradio")).toHaveText(["● MiniMax-H3"]); // STORY_026: only what the Spark reports
    await page.keyboard.press("Escape");
  });

  test("a reference image is accepted as a thumbnail and can be removed", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("reference-input").setInputFiles(REFERENCE_IMAGE);
    await expect(page.getByRole("img", { name: "Reference image 1" })).toBeVisible();
    await page.getByRole("button", { name: "Remove Reference image 1" }).click();
    await expect(page.getByRole("img", { name: "Reference image 1" })).toBeHidden();
  });

  test("Send creates the job the stub receives and lands on the task URL", async ({ page, stubApi }) => {
    await page.goto("/?script=done-after-1-poll");
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

  test("the home opens in video mode: the reference button, the placeholder saying what to do, nothing under the card, no card in the corner (STORY_058); no plugin tag, no cloud pill (STORY_059)", async ({ page }) => {
    await page.goto("/");
    await settled(page);
    await expect(page.getByText("video-creator", { exact: true })).toHaveCount(0); // STORY_059: the plugin's tag went with the plugin
    await expect(page.getByRole("button", { name: "MiniMax-M3" })).toHaveCount(0); // and the reference's cloud-agent pill
    await expect(page.getByRole("button", { name: "Add reference image" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Message" })).toHaveAttribute("placeholder", "Describe the video — or attach a photo and turn Agent on");
    await expect(page.getByRole("group", { name: "Modes" })).toHaveCount(0);
    await expect(page.getByTestId("showcase")).toHaveCount(0);
    await expect(page.getByTestId("promo-card")).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1, name: "MiniMax" })).toBeVisible();
  });
});

test.describe("environment variables (STORY_035)", () => {
  test("a variable added through + › Environment variables survives a reload, listed by name and masked; removing it and saving clears it", async ({ page, request }) => {
    await request.put("/api/env", { data: { vars: {} } });
    await page.goto("/");
    await settled(page);
    await page.getByRole("button", { name: "Add attachment" }).click();
    await page.getByRole("menuitem", { name: "Environment variables" }).click();
    const dialog = page.getByRole("dialog", { name: "Environment variables" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByTestId("env-row")).toHaveCount(1);
    await dialog.getByRole("textbox", { name: "key name" }).fill("telegram_bot_token");
    await expect(dialog.getByRole("textbox", { name: "key name" })).toHaveValue("TELEGRAM_BOT_TOKEN");
    await dialog.getByLabel("Key value").fill("123456:not-a-real-token");
    const saved = page.waitForResponse((r) => r.url().endsWith("/api/env") && r.request().method() === "PUT");
    await dialog.getByRole("button", { name: "Save" }).click();
    expect((await saved).ok()).toBe(true);
    await expect(dialog).toBeHidden();
    const listed = (await (await request.get("/api/env")).json()) as { vars: { key: string; masked: string }[] };
    expect(listed).toEqual({ vars: [{ key: "TELEGRAM_BOT_TOKEN", masked: "••••••••" }] });
    await page.reload();
    await settled(page);
    await page.getByRole("button", { name: "Add attachment" }).click();
    await page.getByRole("menuitem", { name: "Environment variables" }).click();
    await expect(dialog.getByRole("textbox", { name: "key name" })).toHaveValue("TELEGRAM_BOT_TOKEN");
    await expect(dialog.getByLabel("Key value")).toHaveAttribute("placeholder", "••••••••");
    await expect(dialog.getByLabel("Key value")).toHaveValue(""); // the value never reaches the browser
    await dialog.getByRole("button", { name: "Remove TELEGRAM_BOT_TOKEN" }).click();
    const cleared = page.waitForResponse((r) => r.url().endsWith("/api/env") && r.request().method() === "PUT");
    await dialog.getByRole("button", { name: "Save" }).click();
    expect((await cleared).ok()).toBe(true);
    expect(await (await request.get("/api/env")).json()).toEqual({ vars: [] });
  });
});

test.describe("the home and composer match the reference (STORY_022)", () => {
  test("desktop: the heading and the composer card sit where the capture has them", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "positions are the 1440 × 900 capture's");
    await page.goto("/");
    const heading = await page.getByRole("heading", { level: 1, name: "MiniMax" }).boundingBox();
    const card = await page.getByTestId("composer").boundingBox();
    // home-signed-in@1440: heading top 231, card top 302 (tokens.md › Elements); ± 2 px.
    expect(Math.abs((heading?.y ?? 0) - 231)).toBeLessThanOrEqual(2);
    expect(Math.abs((card?.y ?? 0) - 302)).toBeLessThanOrEqual(2);
  });

  test("no mode chips (STORY_026 removed the others, STORY_058 the last); the + menu has no Plugins submenu", async ({ page }) => {
    await page.goto("/");
    await settled(page);
    await expect(page.getByRole("group", { name: "Modes" })).toHaveCount(0);
    for (const name of ["Video generation", "Document", "Website", "Image Generation", "More", "Forest Dawn Fly-through"]) await expect(page.getByRole("button", { name, exact: false })).toHaveCount(0);
    await page.getByRole("button", { name: "Add attachment" }).click();
    await expect(page.getByRole("menu", { name: "Add attachment" }).getByRole("menuitem")).toHaveText(["Add files or photos", "Add to project", "Skills", "Environment variables"]);
    await page.keyboard.press("Escape");
  });

  test("the + menu's Add files or photos opens the reference chooser in video mode", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Add attachment" }).click();
    await expect(page.getByRole("menu", { name: "Add attachment" })).toBeVisible();
    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("menuitem", { name: "Add files or photos" }).click();
    expect((await chooser).isMultiple()).toBe(true);
  });
});
