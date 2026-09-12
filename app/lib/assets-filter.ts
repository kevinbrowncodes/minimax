/** Assets filtering (STORY_015): only finished jobs, the reference's chips, and a case-insensitive title search. */
import type { HistoryEntry } from "./history-store";

export const ASSET_CHIPS = ["All", "Websites", "Documents", "Excel", "PPT", "Images", "Videos", "Audio"] as const;
export type AssetChip = (typeof ASSET_CHIPS)[number];
export const ASSET_TABS = ["From Agent", "From You", "Star"] as const;

export interface AssetFilter {
  readonly chip: AssetChip;
  readonly query: string;
}

export function filterAssets(entries: readonly HistoryEntry[], filter: AssetFilter): readonly HistoryEntry[] {
  if (filter.chip !== "All" && filter.chip !== "Videos") return [];
  const q = filter.query.trim().toLowerCase();
  return entries.filter((e) => e.status === "done" && e.result !== undefined && (q === "" || e.title.toLowerCase().includes(q) || `${e.title}.mp4`.toLowerCase().includes(q)));
}

/** The file name shown on a tile and used for download: the title with characters a file name cannot carry removed. */
export function fileNameFor(entry: Pick<HistoryEntry, "title">): string {
  const base = entry.title.replace(/[/\\?%*:|"<>…]/g, "").trim();
  return `${base || "video"}.mp4`;
}
