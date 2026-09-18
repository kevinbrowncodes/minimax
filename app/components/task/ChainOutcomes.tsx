"use client";
import Link from "next/link";
import { outcomeLabel, type ChainSegmentView } from "@/lib/chain-outcome";
import { cx } from "@/lib/cx";
import styles from "./chain-outcomes.module.css";

export interface ChainOutcomesProps {
  readonly segments: readonly ChainSegmentView[];
  /** The page's own segment: marked "this", not a link. */
  readonly currentId: string;
}

/**
 * STORY_057: the whole chain a segment belongs to, under the user bubble — one row per segment with its index, what
 * became of it (waiting on the one before, queued, running with its percentage, done, cut at the join, cut inside,
 * failed, cancelled) and its title; the others link to their pages. Nothing for a clip with no links.
 */
export function ChainOutcomes({ segments, currentId }: ChainOutcomesProps) {
  if (segments.length < 2) return null;
  return (
    <div className={styles.chain} data-testid="chain-outcomes">
      <p className={styles.summary}>Chain · {String(segments.length)} segments</p>
      <ol className={styles.rows}>
        {segments.map((segment) => {
          const current = segment.id === currentId;
          return (
            <li key={segment.id} className={cx(styles.row, current && styles.rowCurrent)} data-testid="chain-outcome-row" data-outcome={segment.outcome}>
              <span className={styles.index}>{String(segment.index)}</span>{" "}
              <span className={cx(styles.outcome, (segment.outcome === "cut-at-join" || segment.outcome === "cut-inside" || segment.outcome === "failed") && styles.outcomeWarn)}>{outcomeLabel(segment, segments)}</span>{" "}
              {current ? <span className={styles.words}>{segment.title}</span> : <Link className={styles.words} href={`/task/${encodeURIComponent(segment.id)}`}>{segment.title}</Link>}
              {current ? <> <span className={styles.this}>this</span></> : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
