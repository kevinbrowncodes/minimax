/** Assets filtering (STORY_015): only finished jobs, the reference's chips, and a case-insensitive title search. */
import type { HistoryEntry } from "./history-store";

/** STORY_026 trimmed the reference's eight chips to the four a video workstation can fill: All · Images · Videos · Audio. */
export const ASSET_CHIPS = ["All", "Images", "Videos", "Audio"] as const;
export type AssetChip = (typeof ASSET_CHIPS)[number];
/** assets-all@1440: "From agent", "From you", "Star" (STORY_024 takes the capture's casing). */
export const ASSET_TABS = ["From agent", "From you", "Star"] as const;
export type AssetTab = (typeof ASSET_TABS)[number];

export interface AssetFilter {
  readonly chip: AssetChip;
  readonly query: string;
  /** From you (uploads) and Star (starred) hold nothing in MiniMax Local; both show the empty state. Default: From agent. */
  readonly tab?: AssetTab;
}

export function filterAssets(entries: readonly HistoryEntry[], filter: AssetFilter): readonly HistoryEntry[] {
  if ((filter.tab ?? "From agent") !== "From agent") return [];
  if (filter.chip !== "All" && filter.chip !== "Videos") return [];
  const q = filter.query.trim().toLowerCase();
  return entries.filter((e) => e.status === "done" && e.result !== undefined && (q === "" || e.title.toLowerCase().includes(q) || `${e.title}.mp4`.toLowerCase().includes(q)));
}

/** The file name shown on a tile and used for download: the title with characters a file name cannot carry removed. */
export function fileNameFor(entry: Pick<HistoryEntry, "title">): string {
  const base = entry.title.replace(/[/\\?%*:|"<>…]/g, "").trim();
  return `${base || "video"}.mp4`;
}
