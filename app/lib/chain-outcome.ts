/**
 * STORY_057: the whole chain a history entry belongs to, and what became of each segment. Pure over the history list;
 * the route adds what only the line knows (a queued segment waiting on its source).
 */
import type { HistoryEntry } from "./history-store";

/**
 * STORY_056: the entries that continue from `id`, transitively, in chain order — each link's continuations oldest first,
 * each followed by its own — leaving out cancelled ones (a chain re-queued by Retry chain leaves its old links cancelled;
 * they are not links any more). Pure over a list; client-safe (this module never touches the disk).
 */
export function chainAfter(entries: readonly HistoryEntry[], id: string): readonly HistoryEntry[] {
  const next = entries.filter((e) => e.continuesFrom?.id === id && e.status !== "cancelled").sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  return next.flatMap((e) => [e, ...chainAfter(entries, e.id)]);
}

export type ChainOutcome = "waiting" | "queued" | "running" | "done" | "cut-at-join" | "cut-inside" | "failed" | "cancelled";

/** The first segment of the chain `id` is in: back along continuesFrom, a loop or a missing link ending the walk. */
export function chainRoot(entries: readonly HistoryEntry[], id: string): HistoryEntry | undefined {
  const byId = new Map(entries.map((e) => [e.id, e]));
  let current = byId.get(id);
  const seen = new Set<string>();
  while (current !== undefined && current.continuesFrom !== undefined && !seen.has(current.id)) {
    seen.add(current.id);
    const source = byId.get(current.continuesFrom.id);
    if (source === undefined) break;
    current = source;
  }
  return current;
}

/** The chain from its first segment forward along the links that are not cancelled (STORY_056's walk) — one entry for a clip with no links. */
export function chainOf(entries: readonly HistoryEntry[], id: string): readonly HistoryEntry[] {
  const root = chainRoot(entries, id);
  if (root === undefined) return [];
  return [root, ...chainAfter(entries, root.id)];
}

/**
 * What became of a segment: a done one with a cut at its join — a cut whose frame is the source's last frame + 1, give
 * or take one (the first new frame of the extension) — reads cut-at-join; any other cut, cut-inside; a queued one whose
 * source is not done, waiting (the line's own view, passed in).
 */
export function outcomeOf(entry: HistoryEntry, source: HistoryEntry | undefined, waitingInLine = false): ChainOutcome {
  switch (entry.status) {
    case "queued":
      return waitingInLine || (source !== undefined && source.status !== "done") ? "waiting" : "queued";
    case "running":
      return "running";
    case "failed":
      return "failed";
    case "cancelled":
      return "cancelled";
    case "done": {
      const cuts = (entry.result?.cuts ?? []).filter((c) => c.kind === "cut");
      if (cuts.length === 0) return "done";
      const join = source?.result?.frames;
      if (join !== undefined && cuts.some((c) => Math.abs(c.frame - join) <= 1)) return "cut-at-join";
      return "cut-inside";
    }
  }
}

export interface ChainSegmentView {
  readonly id: string;
  /** 1-based, along the chain. */
  readonly index: number;
  readonly title: string;
  readonly status: HistoryEntry["status"];
  readonly progress: number;
  readonly outcome: ChainOutcome;
  /** The index of the segment this one continues from, when it is in the chain (BUG_012: a fork's branch continues an earlier row, not the one before it). */
  readonly sourceIndex?: number;
}

/** The rows for a chain, in order, each judged against the segment it continues from (BUG_012: not the row before it — a fork's branch continues an earlier row). */
export function chainView(entries: readonly HistoryEntry[], id: string, waiting: (id: string) => boolean = () => false): readonly ChainSegmentView[] {
  const chain = chainOf(entries, id);
  const byId = new Map(chain.map((e, i) => [e.id, { entry: e, index: i + 1 }]));
  return chain.map((entry, i) => {
    const source = entry.continuesFrom === undefined ? undefined : byId.get(entry.continuesFrom.id);
    return { id: entry.id, index: i + 1, title: entry.title, status: entry.status, progress: entry.progress, outcome: outcomeOf(entry, source?.entry, waiting(entry.id)), ...(source === undefined ? {} : { sourceIndex: source.index }) };
  });
}

/** The words a row shows. */
export function outcomeLabel(segment: ChainSegmentView, chain: readonly ChainSegmentView[]): string {
  switch (segment.outcome) {
    case "waiting": {
      const source = segment.sourceIndex === undefined ? undefined : chain.find((s) => s.index === segment.sourceIndex);
      return source === undefined ? "waiting" : `waiting · after ${String(source.index)}`;
    }
    case "running":
      return `running · ${String(Math.round(segment.progress))} %`;
    case "cut-at-join":
      return "cut at the join";
    case "cut-inside":
      return "cut inside";
    default:
      return segment.outcome;
  }
}
