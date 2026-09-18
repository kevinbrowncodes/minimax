import { expect, test } from "./fixtures/test";
import { listHistory } from "./fixtures/history";
import { waitForTerminalStatus } from "./fixtures/job";
import { settled } from "./fixtures/settle";

/**
 * Projects (STORY_031): create one from the sidebar, start a task in it from the row's New task, see it under the row and
 * on the project's page, move a second task in from Recents, delete the project and find both tasks still in Recents.
 * At 390 everything goes through the drawer. Every project and task the spec makes is removed at the end.
 */
test.describe("projects (STORY_031)", () => {
  test("create → New task → the row and the page list it; Move to project; Delete keeps the tasks", async ({ page, stubApi }, testInfo) => {
    const narrow = testInfo.project.name === "narrow";
    const sidebar = page.getByRole("navigation", { name: "Sidebar" });
    const openSidebar = async (): Promise<void> => {
      if (narrow && !(await sidebar.isVisible())) {
        await page.getByRole("button", { name: "Expand sidebar" }).click();
        await settled(page);
      }
    };
    const send = async (prompt: string): Promise<string> => {
      await page.getByRole("textbox", { name: "Message" }).fill(prompt);
      const terminal = waitForTerminalStatus(page);
      await page.getByRole("button", { name: "Send message" }).click();
      await expect(page).toHaveURL(/\/task\/[^/]+/);
      const id = page.url().split("/task/")[1]?.split("?")[0] ?? "";
      await terminal;
      return id;
    };
    // prompts carry a per-run tag: a failed earlier attempt leaves entries with the same words behind (CLAUDE.md §6b)
    const tag = String(Date.now()).slice(-6);
    const name = `Film ${tag}`;
    const looseTitle = `Move me ${tag}`;
    const clipTitle = `First clip ${tag}`;
    // a task outside any project, to move later
    await page.goto("/?script=done-after-1-poll");
    const loose = await send(looseTitle);
    await page.goto("/");
    await settled(page);
    await openSidebar();
    // Create: the dialog's Create adds the row and unfolds Projects
    if (await sidebar.getByRole("button", { name: "Projects" }).getAttribute("aria-expanded") === "false") {
      await sidebar.getByRole("button", { name: "Projects" }).click();
    }
    await sidebar.getByRole("button", { name: "Add new project" }).click();
    const dialog = page.getByRole("dialog", { name: "Create project" });
    await expect(dialog.getByRole("button", { name: "Create" })).toBeDisabled();
    await dialog.getByPlaceholder("Final Essay").fill(name);
    const created = page.waitForResponse((r) => r.url().endsWith("/api/projects") && r.request().method() === "POST");
    await dialog.getByRole("button", { name: "Create" }).click();
    expect((await created).status()).toBe(201);
    await expect(dialog).toBeHidden();
    await openSidebar(); // at 390 opening the dialog closed the drawer
    const row = sidebar.getByRole("link", { name, exact: true });
    await expect(row).toBeVisible();
    const projectId = (await row.getAttribute("href"))?.split("/project/")[1] ?? "";
    expect(projectId).not.toBe("");
    // New task from the row: the home composer carries the project chip; the job lands in the project
    await row.hover();
    await sidebar.getByRole("button", { name: `New task in ${name}` }).click();
    await expect(page).toHaveURL(new RegExp(`/\\?project=${projectId}$`));
    await expect(page.getByTestId("project-chip")).toContainText(name);
    await page.goto(`/?project=${projectId}&script=done-after-1-poll`);
    await expect(page.getByTestId("project-chip")).toContainText(name);
    const inProject = await send(clipTitle);
    expect((await listHistory(page.request)).find((e) => e.id === inProject)).toBeDefined();
    expect(((await (await page.request.get(`/api/history/${inProject}`)).json()) as { projectId?: string }).projectId).toBe(projectId);
    // the row expands to its task; the project page lists it
    await page.goto("/");
    await settled(page);
    await openSidebar();
    await sidebar.getByRole("link", { name, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/project/${projectId}$`));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
    await expect(page.getByRole("main").getByRole("list", { name: `Tasks in ${name}` }).getByRole("link", { name: clipTitle })).toBeVisible();
    await openSidebar();
    await expect(sidebar.getByRole("list", { name: `Tasks in ${name}` }).getByRole("link", { name: clipTitle })).toBeVisible();
    // Move to project from Recents
    const looseRow = sidebar.getByRole("link", { name: looseTitle });
    await looseRow.hover();
    await sidebar.getByRole("button", { name: `More actions for ${looseTitle}` }).click();
    await page.getByRole("menuitem", { name: "Move to project" }).click();
    const moved = page.waitForResponse((r) => r.url().includes(`/api/history/${loose}`) && r.request().method() === "PATCH");
    await page.getByRole("menu", { name: "Move to project" }).getByRole("menuitem", { name }).click();
    expect((await moved).ok()).toBe(true);
    await expect(page.getByTestId("toast")).toHaveText(`Task moved to ${name}`);
    expect(((await (await page.request.get(`/api/history/${loose}`)).json()) as { projectId?: string }).projectId).toBe(projectId);
    // Delete: the reference's dialog, then the tasks are still in Recents, unassigned
    await openSidebar();
    await sidebar.getByRole("link", { name, exact: true }).hover();
    await sidebar.getByRole("button", { name: `Project actions for ${name}` }).click();
    await page.getByRole("menuitem", { name: "Delete" }).click();
    const confirm = page.getByRole("dialog", { name: "Delete project" });
    await expect(confirm).toContainText(`Are you sure you want to delete project "${name}"? This action cannot be undone. Its 2 tasks stay in Recents.`);
    const deleted = page.waitForResponse((r) => r.url().includes(`/api/projects/${projectId}`) && r.request().method() === "DELETE");
    await confirm.getByRole("button", { name: "Delete" }).click();
    expect((await deleted).status()).toBe(204);
    await expect(page).toHaveURL(/\/$/);
    await openSidebar();
    await expect(sidebar.getByRole("link", { name, exact: true })).toHaveCount(0);
    await expect(sidebar.getByRole("link", { name: clipTitle })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: looseTitle })).toBeVisible();
    for (const id of [loose, inProject]) expect(((await (await page.request.get(`/api/history/${id}`)).json()) as { projectId?: string }).projectId).toBeUndefined();
    for (const id of [loose, inProject]) await page.request.delete(`/api/history/${id}`);
    expect(await stubApi.openJobs()).toEqual([]);
  });
});
