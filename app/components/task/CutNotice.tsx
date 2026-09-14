"use client";
/**
 * STORY_020: the strip above a finished video when the server measured a shot change — the set or the framing is no
 * longer what it was. Retry is the task page's retry (the same request, no seed). Mounted in the result bubble by the
 * task page (CHORE_009 — the page is being rewritten for STORY_023 in another session, so the mount lands with it).
 */
import type { Cut } from "@/lib/job-api";
import { shotChangeNotice } from "@/lib/shot-change";
import styles from "./cut-notice.module.css";

export interface CutNoticeProps {
  readonly cuts: readonly Cut[] | undefined;
  readonly onRetry: () => void;
  readonly busy?: boolean;
}

export function CutNotice({ cuts, onRetry, busy = false }: CutNoticeProps) {
  const text = shotChangeNotice(cuts);
  if (text === undefined) return null;
  return (
    <div className={styles.notice} role="status" data-testid="cut-notice">
      <span className={styles.text}>{text}</span>
      <button type="button" className={styles.retry} onClick={onRetry} disabled={busy}>
        Retry
      </button>
    </div>
  );
}
