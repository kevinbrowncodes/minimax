/** Assets filtering (STORY_015): only finished jobs, the reference's chips, and a case-insensitive title search. */
import type { HistoryEntry, ReferenceFile } from "./history-store";

/** STORY_026 trimmed the reference's eight chips to the four a video workstation can fill: All · Images · Videos · Audio. */
export const ASSET_CHIPS = ["All", "Images", "Videos", "Audio"] as const;
export type AssetChip = (typeof ASSET_CHIPS)[number];
/** assets-all@1440: "From agent", "From you", "Star" (STORY_024 takes the capture's casing). */
export const ASSET_TABS = ["From agent", "From you", "Star"] as const;
export type AssetTab = (typeof ASSET_TABS)[number];

export interface AssetFilter {
  readonly chip: AssetChip;
  readonly query: string;
  /** From agent (the videos, default), From you (the reference images — STORY_032), Star (the starred videos — STORY_032). */
  readonly tab?: AssetTab;
}

/** STORY_032: a tile is a finished video or a reference image kept with its job. */
export type AssetItem = { readonly kind: "video"; readonly entry: HistoryEntry } | { readonly kind: "image"; readonly entry: HistoryEntry; readonly ref: ReferenceFile };

/**
 * What the tabs and chips list (STORY_032): From agent — the finished videos (All · Videos), the reference images under
 * Images; From you — the reference images (All · Images); Star — the starred videos (All · Videos). Audio is always empty.
 * The search matches the task's title, its file name and an image's name.
 */
export function assetItems(entries: readonly HistoryEntry[], filter: AssetFilter): readonly AssetItem[] {
  const tab = filter.tab ?? "From agent";
  const q = filter.query.trim().toLowerCase();
  const matches = (text: string): boolean => q === "" || text.toLowerCase().includes(q);
  const videos = (): readonly AssetItem[] =>
    entries.filter((e) => e.status === "done" && e.result !== undefined && (tab !== "Star" || e.starred === true) && (matches(e.title) || matches(`${e.title}.mp4`))).map((entry) => ({ kind: "video", entry }));
  const images = (): readonly AssetItem[] =>
    entries.flatMap((entry) => (entry.referenceFiles ?? []).filter((ref) => matches(ref.name) || matches(entry.title)).map((ref) => ({ kind: "image", entry, ref })));
  switch (filter.chip) {
    case "All":
      return tab === "From you" ? images() : videos();
    case "Videos":
      return tab === "From you" ? [] : videos();
    case "Images":
      return tab === "Star" ? [] : images();
    case "Audio":
      return [];
  }
}

/** The finished videos the filter lists (the STORY_015 shape, kept for its callers). */
export function filterAssets(entries: readonly HistoryEntry[], filter: AssetFilter): readonly HistoryEntry[] {
  return assetItems(entries, filter).flatMap((item) => (item.kind === "video" ? [item.entry] : []));
}

/** The file name shown on a tile and used for download: the title with characters a file name cannot carry removed. */
export function fileNameFor(entry: Pick<HistoryEntry, "title">): string {
  const base = entry.title.replace(/[/\\?%*:|"<>…]/g, "").trim();
  return `${base || "video"}.mp4`;
}

/** A tile's name: the video's file name or the image's original name. */
export function assetName(item: AssetItem): string {
  return item.kind === "video" ? fileNameFor(item.entry) : item.ref.name;
}

/** A tile's key and the URL of what it shows. */
export function assetKey(item: AssetItem): string {
  return item.kind === "video" ? `video:${item.entry.id}` : `image:${item.entry.id}:${String(item.ref.n)}`;
}
export function referenceUrl(entry: Pick<HistoryEntry, "id">, ref: ReferenceFile): string {
  return `/api/history/${encodeURIComponent(entry.id)}/reference/${String(ref.n)}`;
}
