import { expect, test } from "./fixtures/test";
import { clearHistory, listHistory } from "./fixtures/history";
import { waitForTerminalStatus } from "./fixtures/job";
import { settled } from "./fixtures/settle";

test.describe("shell (STORY_012)", () => {
  test("New task is active on the home page and Assets navigates", async ({ page }, testInfo) => {
    await page.goto("/");
    await settled(page);
    if (testInfo.project.name === "narrow") {
      await page.getByRole("button", { name: "Expand sidebar" }).click();
      await settled(page);
    }
    const sidebar = page.getByRole("navigation", { name: "Sidebar" });
    await expect(sidebar.getByRole("link", { name: "New task" })).toHaveAttribute("aria-current", "page");
    await sidebar.getByRole("link", { name: "Assets" }).click();
    await expect(page).toHaveURL(/\/assets$/);
    if (testInfo.project.name === "narrow") {
      await page.getByRole("button", { name: "Expand sidebar" }).click();
      await settled(page);
    }
    await expect(sidebar.getByRole("link", { name: "Assets" })).toHaveAttribute("aria-current", "page");
  });

  test("the sidebar's rows open our renderings of the reference's pages, whose controls are inert (STORY_025)", async ({ page }, testInfo) => {
    const narrow = testInfo.project.name === "narrow";
    const openDrawer = async () => {
      if (narrow) {
        await page.getByRole("button", { name: "Expand sidebar" }).click();
        await settled(page);
      }
    };
    const sidebar = page.getByRole("navigation", { name: "Sidebar" });
    // force: Playwright's actionability check treats aria-disabled as not enabled; the control does respond — that is the point.
    // STORY_026: Plugins is the Management page; Scheduled is gone
    const rows: readonly { row: string; url: RegExp; inert: string; testid: string }[] = [
      { row: "Plugins", url: /\/plugins$/, inert: "Create agent", testid: "manage-page" },
    ]; // CHORE_010: Connect mobile is gone
    for (const { row, url, inert, testid } of rows) {
      await page.goto("/");
      await settled(page);
      await openDrawer();
      await sidebar.getByRole("link", { name: row }).click();
      await expect(page).toHaveURL(url);
      await expect(page.getByTestId(testid)).toBeVisible();
      await settled(page); // the drawer slides shut on navigation at 390; a forced click through it would land on a row
      if (row === "Plugins") await page.getByRole("tab", { name: /^Agents/ }).click(); // STORY_040: Plugins opens first; the inert editor is the Agents tab
      const control = page.getByRole("button", { name: inert });
      await expect(control).toHaveAttribute("aria-disabled", "true");
      await control.click({ force: true });
      await expect(page.getByRole("status").filter({ hasText: "Not part of MiniMax Local" }).first()).toBeVisible();
      await expect(page).toHaveURL(url);
      await openDrawer();
      await expect(sidebar.getByRole("link", { name: row })).toHaveAttribute("aria-current", "page");
    }
  });

  test("the Agents guide's View now opens the Management page at /plugins; /plugins/manage redirects there; /max-hermes and /max-claw are gone and /scheduled is back (STORY_025, STORY_026, STORY_028, STORY_041)", async ({ page }, testInfo) => {
    await page.goto("/");
    await settled(page);
    if (testInfo.project.name === "narrow") {
      await page.getByRole("button", { name: "Expand sidebar" }).click();
      await settled(page);
    }
    await page.getByRole("link", { name: "View now" }).click();
    await expect(page).toHaveURL(/\/plugins\?tab=Agents$/); // the guide promises Agents, so it lands on that tab (STORY_040)
    await expect(page.getByRole("heading", { name: "Management" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Name" })).toHaveValue("General");
    await expect(page.getByRole("tab", { name: "Personal" })).toBeHidden(); // the marketplace is gone
    await page.goto("/plugins/manage");
    await expect(page).toHaveURL(/\/plugins$/);
    for (const path of ["/max-hermes", "/max-claw", "/connect-mobile"]) expect((await page.request.get(path)).status(), path).toBe(404); // /connect-mobile: CHORE_010; /scheduled is back (STORY_041)
    expect((await page.request.get("/scheduled")).status()).toBe(200);
    await page.goto("/");
    await settled(page);
    if (testInfo.project.name === "narrow") {
      await page.getByRole("button", { name: "Expand sidebar" }).click();
      await settled(page);
    }
    const sidebar = page.getByRole("navigation", { name: "Sidebar" });
    await expect(sidebar.getByRole("button", { name: "More", exact: true })).toHaveCount(0); // STORY_028: no More section
    await expect(sidebar.getByRole("button", { name: "Projects", exact: true })).toBeVisible();
  });

  test("what STORY_026 removed is absent at both widths: the home bar's Changelog and Download, the footer's Download desktop, the user menu's entries but Settings, the credits and thumbs, the office chips", async ({ page }, testInfo) => {
    await page.goto("/");
    await settled(page);
    for (const name of ["Changelog", "Download", "Download desktop"]) await expect(page.getByRole("button", { name, exact: true })).toHaveCount(0);
    await expect(page.getByRole("group", { name: "Modes" })).toHaveCount(0); // STORY_058: no chips row at all
    if (testInfo.project.name === "narrow") {
      await page.getByRole("button", { name: "Expand sidebar" }).click();
      await settled(page);
    }
    await page.getByRole("button", { name: "Owner" }).click();
    await expect(page.getByRole("menu", { name: "User menu" }).getByRole("menuitem")).toHaveText(["Settings"]);
    await page.keyboard.press("Escape");
    await page.goto("/assets");
    await settled(page);
    await expect(page.getByRole("button", { name: /^(Websites|Documents|Excel|PPT)$/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^(All|Images|Videos|Audio)$/ })).toHaveCount(4);
  });

  test("narrow: the sidebar is a drawer with a large enough toggle; Escape closes it", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "narrow", "drawer exists only below 900 px");
    await page.goto("/");
    await settled(page);
    const toggle = page.getByRole("button", { name: "Expand sidebar" });
    const box = await toggle.boundingBox();
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    const sidebar = page.getByRole("navigation", { name: "Sidebar" });
    await expect(sidebar).toBeHidden();
    await toggle.click();
    await settled(page);
    await expect(sidebar).toBeVisible();
    await page.keyboard.press("Escape");
    await settled(page);
    await expect(sidebar).toBeHidden();
  });

  test("desktop: the sidebar is visible without a toggle", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop only");
    await page.goto("/");
    await expect(page.getByRole("navigation", { name: "Sidebar" })).toBeVisible();
    // The page's own Expand sidebar toggle exists only at 390; the rail's is inside the sidebar and shows only when collapsed.
    await expect(page.getByRole("button", { name: "Expand sidebar" })).toBeHidden();
    const width = await page.getByRole("navigation", { name: "Sidebar" }).evaluate((el) => el.getBoundingClientRect().width);
    expect(Math.round(width)).toBe(260);
  });
});

test.describe("shell (STORY_021)", () => {
  const sidebarWidth = (page: Parameters<typeof settled>[0]) => page.locator('nav[aria-label="Sidebar"]').evaluate((el) => Math.round(el.getBoundingClientRect().width));

  test("desktop: Collapse sidebar leaves a 52 px rail, Expand sidebar restores 260, and the choice survives a reload", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the rail exists only at ≥ 900 px");
    await page.goto("/");
    await settled(page);
    await page.getByRole("button", { name: "Collapse sidebar" }).click();
    await settled(page);
    expect(await sidebarWidth(page)).toBe(52);
    await expect(page.getByRole("navigation", { name: "Sidebar" }).getByRole("link", { name: "New task" })).toHaveAttribute("aria-current", "page");
    await page.reload();
    await settled(page);
    expect(await sidebarWidth(page)).toBe(52);
    await page.getByRole("button", { name: "Expand sidebar" }).click();
    await settled(page);
    expect(await sidebarWidth(page)).toBe(260);
  });

  test("Dark mode survives a reload with a stored sidebar preference — the preference must not undo the theme (BUG_005)", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the sidebar collapses to a rail only at 1440");
    await page.addInitScript(() => {
      localStorage.setItem("minimax-local.theme", "dark");
    });
    await page.goto("/");
    await settled(page);
    await page.getByRole("button", { name: "Collapse sidebar" }).click(); // a stored preference (STORY_028 removed the More fold this test used)
    await expect(page.getByRole("button", { name: "Expand sidebar" })).toBeVisible();
    await page.reload();
    await settled(page);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe("rgb(28, 28, 28)");
    await expect(page.getByRole("button", { name: "Expand sidebar" })).toBeVisible();
    await page.getByRole("button", { name: "Expand sidebar" }).click();
  });

  test("Search finds a job by title and opens it; the Recents menu's Delete forgets it", async ({ page, stubApi }, testInfo) => {
    const narrow = testInfo.project.name === "narrow";
    // A finished job to find and then delete (the stub finishes it in one poll).
    await page.goto("/?script=done-after-1-poll");
    await page.getByRole("textbox", { name: "Message" }).fill("Find me by title");
    const terminal = waitForTerminalStatus(page);
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page).toHaveURL(/\/task\/[^/]+$/);
    const id = page.url().split("/task/")[1] ?? "";
    await terminal;
    await page.goto("/");
    await settled(page);
    if (narrow) {
      await page.getByRole("button", { name: "Expand sidebar" }).click();
      await settled(page);
    }
    await page.getByRole("navigation", { name: "Sidebar" }).getByRole("button", { name: "Search" }).click();
    const dialog = page.getByRole("dialog", { name: "Search tasks" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("searchbox").fill("find me");
    await expect(dialog.getByText("Previous 7 days")).toBeVisible();
    await dialog.getByRole("button", { name: "Find me by title" }).click();
    await expect(page).toHaveURL(new RegExp(`/task/${id}$`));
    // Delete from the row menu: confirm, then the row is gone and the page leaves the task.
    if (narrow) {
      await page.getByRole("button", { name: "Expand sidebar" }).click();
      await settled(page);
    }
    page.once("dialog", (d) => void d.accept());
    const row = page.getByRole("navigation", { name: "Sidebar" }).getByRole("link", { name: /Find me by title/ });
    await row.hover();
    await page.getByRole("button", { name: "More actions for Find me by title" }).click();
    await page.getByRole("menuitem", { name: "Delete" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("navigation", { name: "Sidebar" }).getByRole("link", { name: /Find me by title/ })).toHaveCount(0);
    expect((await listHistory(page.request)).find((e) => e.id === id)).toBeUndefined();
    expect(await stubApi.openJobs()).toEqual([]);
  });

  test("a Recents row is renamed inline, pinned into the Pinned section, and its id copied (STORY_029)", async ({ page, stubApi }, testInfo) => {
    const narrow = testInfo.project.name === "narrow";
    // the clipboard is stubbed before the app loads: headless browsers deny writeText without a permission grant
    await page.addInitScript(() => {
      const copied: string[] = [];
      Object.defineProperty(window, "__copied", { value: copied });
      Object.defineProperty(navigator, "clipboard", { value: { writeText: (text: string) => { copied.push(text); return Promise.resolve(); } }, configurable: true });
    });
    await page.goto("/?script=done-after-1-poll");
    await page.getByRole("textbox", { name: "Message" }).fill("Rename me and pin me");
    const terminal = waitForTerminalStatus(page);
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page).toHaveURL(/\/task\/[^/]+$/);
    const id = page.url().split("/task/")[1] ?? "";
    await terminal;
    // reopened, the task shows its file card and no preview pane, so the narrow bar's Expand sidebar is clickable
    await page.goto(`/task/${id}`);
    await settled(page);
    const toast = page.getByTestId("toast"); // the task page's indicator is a status too
    const sidebar = page.getByRole("navigation", { name: "Sidebar" });
    const openSidebar = async (): Promise<void> => {
      if (narrow && !(await sidebar.isVisible())) {
        await page.getByRole("button", { name: "Expand sidebar" }).click();
        await settled(page);
      }
    };
    await openSidebar();
    const row = sidebar.getByRole("link", { name: /Rename me and pin me/ });
    const stamp = (await row.textContent()) ?? "";
    // Rename: the label becomes an input holding the title; Enter commits; the top bar and Search see the new title; the label is still the stamp (CHORE_008)
    await row.hover();
    await sidebar.getByRole("button", { name: "More actions for Rename me and pin me" }).click();
    await page.getByRole("menuitem", { name: "Rename" }).click();
    const input = sidebar.getByRole("textbox", { name: "Rename Rename me and pin me" });
    await expect(input).toHaveValue("Rename me and pin me");
    await input.fill("Renamed by the row");
    const renamed = page.waitForResponse((r) => r.url().includes(`/api/history/${id}`) && r.request().method() === "PATCH");
    await input.press("Enter");
    expect((await renamed).ok()).toBe(true);
    await expect(toast).toHaveText(/Task renamed/);
    const renamedRow = sidebar.getByRole("link", { name: /Renamed by the row/ });
    await expect(renamedRow).toBeVisible();
    expect(await renamedRow.textContent()).toBe(stamp);
    await expect(toast).toBeHidden({ timeout: 5000 }); // gone by itself after two seconds
    await expect(page.getByTestId("topbar-title")).toHaveText("Renamed by the row"); // the top bar names the task by its title
    // Pin: the hover pin puts the row in a Pinned section above Projects; its entry reads Unpin; the Recents copy stays
    await renamedRow.hover();
    const pinned = page.waitForResponse((r) => r.url().includes(`/api/history/${id}`) && r.request().method() === "PATCH");
    await sidebar.getByRole("button", { name: "Pin Renamed by the row" }).click();
    expect((await pinned).ok()).toBe(true);
    await expect(toast).toHaveText(/Task pinned/);
    const pinnedSection = page.getByTestId("pinned-section");
    await expect(pinnedSection).toBeVisible();
    await expect(pinnedSection.getByRole("link", { name: /Renamed by the row/ })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: /Renamed by the row/ })).toHaveCount(2);
    expect(await pinnedSection.evaluate((el) => el.nextElementSibling?.textContent.startsWith("Projects"))).toBe(true);
    expect((await listHistory(page.request)).find((e) => e.id === id)).toMatchObject({ title: "Renamed by the row" });
    expect(((await (await page.request.get(`/api/history/${id}`)).json()) as { pinned?: boolean }).pinned).toBe(true);
    // Copy conversation ID: the row's id lands in the clipboard and the toast says so
    await pinnedSection.getByRole("link", { name: /Renamed by the row/ }).hover();
    await pinnedSection.getByRole("button", { name: "More actions for Renamed by the row" }).click();
    await page.getByRole("menuitem", { name: "Copy conversation ID" }).click();
    await expect(toast).toHaveText(/Conversation ID copied/);
    expect(await page.evaluate(() => (window as unknown as { __copied: string[] }).__copied)).toEqual([id]);
    // Unpin from the menu: the section goes away when nothing is pinned
    await pinnedSection.getByRole("link", { name: /Renamed by the row/ }).hover();
    await pinnedSection.getByRole("button", { name: "More actions for Renamed by the row" }).click();
    await page.getByRole("menuitem", { name: "Unpin" }).click();
    await expect(toast).toHaveText(/Task unpinned/);
    await expect(page.getByTestId("pinned-section")).toHaveCount(0);
    await page.request.delete(`/api/history/${id}`);
    expect(await stubApi.openJobs()).toEqual([]);
  });

  test("Archive takes a task out of Recents and Search into Settings › Archived tasks, where it is searched, restored, and Delete all forgets the rest (STORY_030)", async ({ page, stubApi }, testInfo) => {
    const narrow = testInfo.project.name === "narrow";
    const sidebar = page.getByRole("navigation", { name: "Sidebar" });
    const toast = page.getByTestId("toast");
    const openSidebar = async (): Promise<void> => {
      if (narrow && !(await sidebar.isVisible())) {
        await page.getByRole("button", { name: "Expand sidebar" }).click();
        await settled(page);
      }
    };
    const makeJob = async (prompt: string): Promise<string> => {
      await page.goto("/?script=done-after-1-poll");
      await page.getByRole("textbox", { name: "Message" }).fill(prompt);
      const terminal = waitForTerminalStatus(page);
      await page.getByRole("button", { name: "Send message" }).click();
      await expect(page).toHaveURL(/\/task\/[^/]+$/);
      const id = page.url().split("/task/")[1] ?? "";
      await terminal;
      return id;
    };
    const first = await makeJob("Archive me first");
    const second = await makeJob("Archive me second");
    await page.goto("/");
    await settled(page);
    await openSidebar();
    // Archive from the ⋯: no confirm, the row leaves Recents, the reference's toast offers Undo and Settings
    const row = sidebar.getByRole("link", { name: /Archive me first/ });
    await row.hover();
    await sidebar.getByRole("button", { name: "More actions for Archive me first" }).click();
    const archived = page.waitForResponse((r) => r.url().includes(`/api/history/${first}`) && r.request().method() === "PATCH");
    await page.getByRole("menuitem", { name: "Archive" }).click();
    expect((await archived).ok()).toBe(true);
    await expect(toast).toHaveText(/Undo or view archived tasks in Settings/);
    await expect(sidebar.getByRole("link", { name: /Archive me first/ })).toHaveCount(0);
    await expect(sidebar.getByRole("link", { name: /Archive me second/ })).toBeVisible();
    // the task still opens by URL, and Search no longer finds it
    await page.goto(`/task/${first}`);
    await settled(page);
    await expect(page.getByTestId("topbar-title")).toHaveText("Archive me first");
    await openSidebar();
    await sidebar.getByRole("button", { name: "Search" }).click();
    const search = page.getByRole("dialog", { name: "Search tasks" });
    await search.getByRole("searchbox").fill("archive me");
    await expect(search.getByRole("button", { name: /Archive me second/ })).toBeVisible();
    await expect(search.getByRole("button", { name: /Archive me first/ })).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(search).toBeHidden();
    // Settings › Archived tasks lists it with the archive time; the search filters; Unarchive puts it back
    await openSettings(page, narrow);
    await page.getByRole("button", { name: "Archived tasks" }).click();
    const rowsOf = page.getByTestId("archived-row");
    await expect(rowsOf).toHaveCount(1);
    await expect(rowsOf.first()).toContainText("Archive me first");
    await expect(rowsOf.first()).toContainText(/[A-Z][a-z]{2} \d{1,2}, \d{4}, \d{1,2}:\d{2} [AP]M/);
    await page.getByRole("textbox", { name: "Search archived tasks" }).fill("nothing like this");
    await expect(page.getByText("No archived tasks match.")).toBeVisible();
    await page.getByRole("textbox", { name: "Search archived tasks" }).fill("me first");
    await expect(rowsOf).toHaveCount(1);
    const restored = page.waitForResponse((r) => r.url().includes(`/api/history/${first}`) && r.request().method() === "PATCH");
    await page.getByRole("button", { name: "Unarchive Archive me first" }).click();
    expect((await restored).ok()).toBe(true);
    await expect(page.getByText("No archived tasks.")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Archived tasks" })).toBeHidden();
    await openSidebar();
    await expect(sidebar.getByRole("link", { name: /Archive me first/ })).toBeVisible();
    // the toast's Undo restores too; its Settings link lands on Archived tasks; Delete all forgets what is listed
    await sidebar.getByRole("link", { name: /Archive me second/ }).hover();
    await sidebar.getByRole("button", { name: "More actions for Archive me second" }).click();
    await page.getByRole("menuitem", { name: "Archive" }).click();
    await expect(toast).toBeVisible();
    const undone = page.waitForResponse((r) => r.url().includes(`/api/history/${second}`) && r.request().method() === "PATCH");
    await toast.getByRole("button", { name: "Undo" }).click();
    expect((await undone).ok()).toBe(true);
    await expect(sidebar.getByRole("link", { name: /Archive me second/ })).toBeVisible();
    await sidebar.getByRole("link", { name: /Archive me second/ }).hover();
    await sidebar.getByRole("button", { name: "More actions for Archive me second" }).click();
    await page.getByRole("menuitem", { name: "Archive" }).click();
    await toast.getByRole("button", { name: "Settings" }).click();
    await expect(page.getByRole("dialog", { name: "Archived tasks" })).toBeVisible();
    await expect(rowsOf).toHaveCount(1);
    page.once("dialog", (d) => void d.accept());
    const bulk = page.waitForResponse((r) => r.url().includes("/api/history?ids=") && r.request().method() === "DELETE");
    await page.getByRole("button", { name: "Delete all" }).click();
    expect((await bulk).ok()).toBe(true);
    await expect(page.getByText("No archived tasks.")).toBeVisible();
    const left = await listHistory(page.request);
    expect(left.find((e) => e.id === second)).toBeUndefined();
    expect(left.find((e) => e.id === first)).toBeDefined();
    await page.request.delete(`/api/history/${first}`);
    expect(await stubApi.openJobs()).toEqual([]);
  });

  test("a finished job whose framing moved as the prompt asked makes one Inbox event, not two (STORY_046)", async ({ page, request }, testInfo) => {
    const narrow = testInfo.project.name === "narrow";
    await clearHistory(request); // the count is asserted, so the list must be this test's own (CLAUDE.md §6b)
    await page.goto("/?script=done-with-framing-move");
    await page.getByRole("textbox", { name: "Message" }).fill("Handheld selfie");
    const terminal = waitForTerminalStatus(page);
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page).toHaveURL(/\/task\/[^/]+$/);
    await terminal;
    await page.goto("/");
    await settled(page);
    if (narrow) {
      await page.getByRole("button", { name: "Expand sidebar" }).click();
      await settled(page);
    }
    const bell = page.getByRole("button", { name: "Inbox, 1 unread" });
    await expect(bell).toBeVisible();
    await bell.click();
    const rows = page.getByRole("dialog", { name: "Inbox" }).getByTestId("inbox-row");
    await expect(rows).toHaveCount(1);
    await expect(rows.nth(0)).toContainText("Your video is ready");
  });

  test("the Inbox carries the job events: a finished job with a shot change makes two, the bell counts them, Read all clears the count, a row opens the task (STORY_033)", async ({ page, request }, testInfo) => {
    const narrow = testInfo.project.name === "narrow";
    await clearHistory(request); // the count is asserted, so the list must be this test's own (CLAUDE.md §6b)
    await page.goto("/?script=done-with-cut");
    await page.getByRole("textbox", { name: "Message" }).fill("Tell me when done");
    const terminal = waitForTerminalStatus(page);
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page).toHaveURL(/\/task\/[^/]+$/);
    const id = page.url().split("/task/")[1] ?? "";
    await terminal;
    await page.goto("/");
    await settled(page);
    if (narrow) {
      await page.getByRole("button", { name: "Expand sidebar" }).click();
      await settled(page);
    }
    const bell = page.getByRole("button", { name: "Inbox, 2 unread" });
    await expect(bell).toBeVisible();
    await expect(page.getByTestId("inbox-badge")).toHaveText("2");
    await bell.click();
    const inbox = page.getByRole("dialog", { name: "Inbox" });
    await expect(inbox).toBeVisible();
    const rows = inbox.getByTestId("inbox-row");
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toContainText("Your video is ready");
    await expect(rows.nth(0)).toContainText("Tell me when done");
    await expect(rows.nth(1)).toContainText("The shot changed at 00:11");
    await expect(rows.nth(0)).toHaveAttribute("data-read", "false");
    await inbox.getByRole("tab", { name: "Messages" }).click();
    await expect(inbox).toHaveText(/No messages yet/);
    await inbox.getByRole("tab", { name: "All" }).click();
    await inbox.getByRole("button", { name: "Read all" }).click();
    await expect(page.getByRole("button", { name: "Inbox, no unread messages" })).toBeVisible();
    await expect(page.getByTestId("inbox-badge")).toHaveCount(0);
    await expect(rows.nth(0)).toHaveAttribute("data-read", "true");
    await rows.nth(1).click();
    await expect(page).toHaveURL(new RegExp(`/task/${id}$`));
    await expect(inbox).toBeHidden();
    await page.reload();
    await settled(page);
    if (narrow) {
      await page.getByRole("button", { name: "Expand sidebar" }).click();
      await settled(page);
    }
    await expect(page.getByRole("button", { name: "Inbox, no unread messages" })).toBeVisible(); // the Read all stamp survives a reload
    await request.delete(`/api/history/${id}`);
  });

  test("the Inbox opens its popover and Escape closes it", async ({ page, request }, testInfo) => {
    await clearHistory(request);
    await page.goto("/");
    await settled(page);
    if (testInfo.project.name === "narrow") {
      await page.getByRole("button", { name: "Expand sidebar" }).click();
      await settled(page);
    }
    await page.getByRole("button", { name: /^Inbox/ }).click();
    const inbox = page.getByRole("dialog", { name: "Inbox" });
    await expect(inbox).toBeVisible();
    await expect(inbox).toHaveText(/No messages yet/);
    await page.keyboard.press("Escape");
    await expect(inbox).toBeHidden();
  });

  test("narrow: the page's toggle is the reference's Expand sidebar icon with a 44 px hit area", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "narrow", "drawer exists only below 900 px");
    await page.goto("/");
    await settled(page);
    const toggle = page.getByRole("button", { name: "Expand sidebar" });
    await expect(toggle).toHaveAttribute("title", "Expand sidebar");
    const box = await toggle.boundingBox();
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    await expect(page.getByTestId("promo-card")).toHaveCount(0);
  });

  test("desktop: no promo card in the corner (STORY_058 removed the reference's carousel)", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the card was never shown at 390");
    await page.goto("/");
    await settled(page);
    await expect(page.getByTestId("promo-card")).toHaveCount(0);
    await expect(page.getByText("H3 takes the stage")).toHaveCount(0);
  });
});

const DARK_BODY = "rgb(28, 28, 28)"; // --bg_default_primary_elevated, dark (docs/recon/2026-09-14/tokens.md)
const LIGHT_BODY = "rgb(255, 255, 255)";
const bodyBackground = (page: Parameters<typeof settled>[0]) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);

/** User chip → Settings, opening the drawer first at 390 (the chip lives in the sidebar). */
async function openSettings(page: Parameters<typeof settled>[0], narrow: boolean): Promise<void> {
  if (narrow) {
    await page.getByRole("button", { name: "Expand sidebar" }).click();
    await settled(page);
  }
  await page.getByRole("button", { name: "Owner" }).click();
  await page.getByRole("menuitem", { name: "Settings" }).click();
  await expect(page.getByRole("dialog", { name: "General" })).toBeVisible();
  await settled(page);
}

test.describe("theme (STORY_019)", () => {
  test.describe("with a dark system preference", () => {
    test.use({ colorScheme: "dark" });

    test("the page is dark by default, Settings shows System chosen, and Light mode flips it and survives a reload", async ({ page }, testInfo) => {
      await page.goto("/");
      await settled(page);
      expect(await bodyBackground(page)).toBe(DARK_BODY);
      await openSettings(page, testInfo.project.name === "narrow");
      await expect(page.getByRole("radio", { name: "System" })).toHaveAttribute("aria-checked", "true");
      await page.getByRole("radio", { name: "Light mode" }).click();
      await settled(page);
      expect(await bodyBackground(page)).toBe(LIGHT_BODY);
      await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
      await page.reload();
      await settled(page);
      expect(await bodyBackground(page)).toBe(LIGHT_BODY);
      await openSettings(page, testInfo.project.name === "narrow");
      await expect(page.getByRole("radio", { name: "Light mode" })).toHaveAttribute("aria-checked", "true");
      await page.getByRole("radio", { name: "System" }).click();
      await settled(page);
      expect(await bodyBackground(page)).toBe(DARK_BODY);
    });
  });

  test("with a light system preference, Dark mode makes every surface dark and Escape closes Settings", async ({ page }, testInfo) => {
    await page.goto("/");
    await settled(page);
    expect(await bodyBackground(page)).toBe(LIGHT_BODY);
    await openSettings(page, testInfo.project.name === "narrow");
    await page.getByRole("radio", { name: "Dark mode" }).click();
    await settled(page);
    expect(await bodyBackground(page)).toBe(DARK_BODY);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "General" })).toBeHidden();
    // The sidebar follows the switch too (tokens.md: sidebar #1c1c1c in dark). A CSS locator: at 390 the closed drawer is aria-hidden.
    expect(await page.locator('nav[aria-label="Sidebar"]').evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(DARK_BODY);
    await page.goto("/assets");
    await settled(page);
    expect(await bodyBackground(page)).toBe(DARK_BODY);
  });
});
