import type { Page, Response } from "@playwright/test";

const TERMINAL = new Set(["done", "failed", "cancelled"]);

/**
 * Register the wait for a terminal status response BEFORE the action that submits (CLAUDE.md §6b): the job may land
 * inside the click otherwise. Resolves with the terminal status body.
 */
export function waitForTerminalStatus(page: Page, options: { readonly id?: string; readonly timeout?: number } = {}): Promise<{ id: string; status: string; progress: number }> {
  const timeout = options.timeout ?? 60_000;
  return page
    .waitForResponse(
      async (response: Response) => {
        const url = response.url();
        if (!/\/api\/jobs\/[^/?]+$/.test(url) || response.request().method() !== "GET" || !response.ok()) return false;
        if (options.id !== undefined && !url.endsWith(`/api/jobs/${options.id}`)) return false;
        const body = (await response.json()) as { status?: string };
        return typeof body.status === "string" && TERMINAL.has(body.status);
      },
      { timeout },
    )
    .then((response) => response.json() as Promise<{ id: string; status: string; progress: number }>);
}
