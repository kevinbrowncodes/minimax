import type { APIRequestContext } from "@playwright/test";

/** The UI's history routes, for specs that need a known starting point. */
export interface HistoryEntryLike {
  readonly id: string;
  readonly title: string;
  readonly status: string;
}
export async function listHistory(request: APIRequestContext): Promise<readonly HistoryEntryLike[]> {
  const res = await request.get("/api/history");
  return ((await res.json()) as { entries: HistoryEntryLike[] }).entries;
}
/** Forget every entry, through the real DELETE route. */
export async function clearHistory(request: APIRequestContext): Promise<void> {
  for (const entry of await listHistory(request)) await request.delete(`/api/history/${entry.id}`);
}
