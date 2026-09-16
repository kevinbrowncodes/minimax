"use client";
import { formatTimestamp, type ChainPlan } from "@/lib/chain";
import { cx } from "@/lib/cx";
import { overlapSeconds } from "@/lib/extend";
import styles from "./composer.module.css";

/** How the chain's first segment starts: from the attached image, from the text alone, or continuing an existing clip. */
export type ChainStart = { readonly kind: "image" } | { readonly kind: "text" } | { readonly kind: "source"; readonly title: string };

export interface ChainStripProps {
  readonly plan: ChainPlan;
  readonly start: ChainStart;
  readonly maxSourceSeconds: number;
  readonly overlapFrames: number;
  readonly overlapOptions: readonly { readonly frames: number; readonly label: string }[];
  readonly onOverlap: (frames: number) => void;
}

/** "segment 4" / "segments 4–6". */
function unfitRange(plan: ChainPlan): string {
  const first = plan.firstUnfit ?? 0;
  const last = plan.segments.length;
  return first === last ? `segment ${String(first)}` : `segments ${String(first)}–${String(last)}`;
}

/**
 * STORY_044: the chain strip under the composer's box — one row per script, the length each adds and the length in
 * all, the overlap, and which segments the server would refuse (its source cap, read from the capabilities).
 */
export function ChainStrip({ plan, start, maxSourceSeconds, overlapFrames, overlapOptions, onOverlap }: ChainStripProps) {
  const first = plan.segments[0];
  const extension = plan.segments.find((s) => s.sourceSeconds !== undefined);
  const each = first === undefined ? "" : extension === undefined || (first.sourceSeconds === undefined && extension.seconds === first.seconds && !extension.capped)
    ? `${String(first.seconds)} s each`
    : first.sourceSeconds === undefined
      ? `${String(first.seconds)} s, then +${String(extension.seconds)} s each${extension.capped ? " (the most one step can add)" : ""}`
      : `+${String(extension.seconds)} s each${extension.capped ? " (the most one step can add)" : ""}`;
  return (
    <div className={styles.chain} data-testid="chain-strip">
      <p className={styles.chainSummary} data-testid="chain-summary">
        {String(plan.segments.length)} segments · {each} · ≈ {plan.totalSeconds.toFixed(1)} s in all · overlap {overlapSeconds(overlapFrames)} s
        {plan.fits ? null : <span className={styles.chainWarn}> — the Spark extends videos up to {String(maxSourceSeconds)} s: {unfitRange(plan)} would not run</span>}
      </p>
      <ol className={styles.chainRows}>
        {plan.segments.map((segment) => {
          const from = segment.sourceSeconds === undefined ? (start.kind === "image" ? "from the image" : "from the text") : segment.index === 1 && start.kind === "source" ? `continues ${start.title}` : `continues ${String(segment.index - 1)}`;
          const tooLong = segment.endsAt !== undefined && segment.endsAt > segment.seconds;
          return (
            <li key={segment.index} className={cx(styles.chainRow, !segment.fits && styles.chainRowUnfit)} data-testid="chain-row" data-fits={segment.fits}>
              <span className={styles.chainNum}>{String(segment.index)}</span>{" "}
              <span className={styles.chainLen}>{segment.sourceSeconds === undefined ? "" : "+"}{String(segment.seconds)} s</span>{" "}
              <span className={styles.chainFrom}>{from}</span>{" "}
              <span className={styles.chainWords}>{segment.words}</span>
              {!segment.fits && segment.sourceSeconds !== undefined ? <> <span className={styles.chainWarn}>would extend a {segment.sourceSeconds.toFixed(1)} s video</span></> : null}
              {tooLong ? <> <span className={styles.chainWarn}>ends at {formatTimestamp(segment.endsAt ?? 0)} — longer than {String(segment.seconds)} s</span></> : null}
            </li>
          );
        })}
      </ol>
      {start.kind === "source" ? null : (
        <div className={styles.chainOverlap}>
          <span className={styles.sectionLabel}>Overlap (what each extension starts from)</span>
          <div className={styles.track} role="radiogroup" aria-label="Overlap">
            {overlapOptions.map((option) => (
              <button key={option.frames} type="button" role="radio" aria-checked={overlapFrames === option.frames} className={cx(styles.segment, overlapFrames === option.frames && styles.segmentSelected)} onClick={() => { onOverlap(option.frames); }}>
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
