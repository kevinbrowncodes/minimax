"use client";
import { useRouter } from "next/navigation";
import { useEffect, useReducer, useRef, useState } from "react";
import { Composer } from "@/components/composer/Composer";
import { cx } from "@/lib/cx";
import type { HistoryEntry } from "@/lib/history-store";
import type { JobStatusResponse } from "@/lib/job-api";
import { initialJob, isTerminal, reduceJob, type JobSnapshot } from "@/lib/job-status";
import { PollAbortedError, pollUntilTerminal } from "@/lib/polling";
import { indicatorFor, stepsFor } from "@/lib/todo-steps";
import styles from "./task.module.css";

export interface TaskPageProps {
  readonly entry: HistoryEntry;
  /** Injected for tests. */
  readonly fetchImpl?: typeof fetch;
}

function fromEntry(entry: HistoryEntry): JobSnapshot {
  const base = initialJob(entry.id);
  return reduceJob(base, { type: "status", response: { id: entry.id, status: entry.status, progress: entry.progress, ...(entry.error ? { error: entry.error } : {}), ...(entry.result ? { result: entry.result } : {}) } });
}

function formatBytes(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${String(Math.round(bytes / 1024))} KB`;
}

/** The task page (STORY_014): the thread, the Progress panel, the docked composer; polling drives it to a terminal state. */
export function TaskPage({ entry, fetchImpl }: TaskPageProps) {
  const router = useRouter();
  const doFetch = fetchImpl ?? fetch;
  const [job, dispatch] = useReducer(reduceJob, entry, fromEntry);
  const [busy, setBusy] = useState<"stop" | "retry" | undefined>(undefined);
  const [copied, setCopied] = useState(false);
  const opened = useRef(false);

  // Mark the entry opened once (the sidebar's unread dot). StrictMode runs effects twice; the ref makes it once.
  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    void doFetch(`/api/history/${encodeURIComponent(entry.id)}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ openedAt: new Date().toISOString() }) }).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per page
  }, [entry.id]);

  // Poll until terminal. The controller and the timers belong to this effect run; cleanup aborts them, so a
  // StrictMode remount simply starts a fresh poll (CLAUDE.md §6b).
  const terminal = isTerminal(job.status);
  useEffect(() => {
    if (terminal) return;
    const controller = new AbortController();
    const fetchStatus = async (): Promise<JobStatusResponse> => {
      const res = await doFetch(`/api/jobs/${encodeURIComponent(entry.id)}`, { signal: controller.signal });
      if (!res.ok) throw new Error(`status ${String(res.status)}`);
      return (await res.json()) as JobStatusResponse;
    };
    pollUntilTerminal(entry.id, fetchStatus, {
      signal: controller.signal,
      onUpdate: (response) => {
        dispatch({ type: "status", response });
      },
    }).catch((error: unknown) => {
      if (!(error instanceof PollAbortedError)) dispatch({ type: "status", response: { id: entry.id, status: "failed", progress: job.progress, error: { code: "unreachable", message: error instanceof Error ? error.message : String(error) } } });
    });
    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restart only when the job leaves/enters a terminal state
  }, [entry.id, terminal]);

  const stop = async (): Promise<void> => {
    setBusy("stop");
    dispatch({ type: "cancel-requested" });
    try {
      const res = await doFetch(`/api/jobs/${encodeURIComponent(entry.id)}`, { method: "DELETE" });
      if (res.status === 202) {
        const body = (await res.json()) as JobStatusResponse;
        dispatch({ type: "status", response: { id: entry.id, status: "cancelled", progress: body.progress } });
      }
    } finally {
      setBusy(undefined);
    }
  };

  const retry = async (): Promise<void> => {
    setBusy("retry");
    try {
      const res = await doFetch("/api/jobs", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt: entry.prompt, ...entry.params }) });
      if (res.status === 202) {
        const body = (await res.json()) as { id: string };
        router.push(`/task/${encodeURIComponent(body.id)}`);
      }
    } finally {
      setBusy(undefined);
    }
  };

  const copyPrompt = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(entry.prompt);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch {
      // clipboard not available: nothing to show
    }
  };

  const running = job.status === "queued" || job.status === "running";
  const steps = stepsFor(job);
  const resultPath = `/api/jobs/${encodeURIComponent(entry.id)}/result`;
  const posterPath = `/api/jobs/${encodeURIComponent(entry.id)}/poster`;

  return (
    <div className={styles.page}>
      <section className={styles.thread} aria-label="Task">
        <div className={styles.column}>
          <div className={styles.bubble} data-testid="user-message">
            <span className={styles.mention}>@video-creator</span> {entry.prompt}
            {entry.referenceImages > 0 ? <div className={styles.refs}>{String(entry.referenceImages)} reference image{entry.referenceImages > 1 ? "s" : ""} attached</div> : null}
          </div>

          <div className={styles.indicator} role="status" aria-live="polite" data-testid="indicator">
            <span className={styles.avatar} aria-hidden="true">M</span>
            {running ? <span className={styles.pulse} aria-hidden="true" /> : null}
            <span>{indicatorFor(job)}</span>
          </div>

          {job.status === "done" && job.result ? (
            <div className={styles.result} data-testid="result">
              <video className={styles.video} controls playsInline preload="metadata" poster={posterPath} src={resultPath} data-testid="result-video">
                <track kind="captions" />
              </video>
              <div className={styles.summary}>
                {job.result.durationSeconds.toFixed(1)} s · {String(job.result.width)}×{String(job.result.height)} · {formatBytes(job.result.sizeBytes)}
              </div>
              <div className={styles.actions}>
                <a className={styles.actionLink} href={resultPath} download={`${entry.title.replace(/[/\\?%*:|"<>…]/g, "").trim() || "video"}.mp4`}>⤓ Download</a>
                <button type="button" className={styles.actionLink} onClick={() => void copyPrompt()}>⧉ {copied ? "Copied" : "Copy prompt"}</button>
                <span>{new Date(entry.finishedAt ?? entry.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            </div>
          ) : null}

          {job.status === "failed" ? (
            <div className={styles.failure} role="alert">
              <span aria-hidden="true">ⓘ</span>
              <span>
                {job.error?.code === "moderated" ? "The prompt was refused on content grounds" : `${indicatorFor(job)}${job.error?.message ? ` — ${job.error.message}` : ""}`}
              </span>
              {job.error?.code === "moderated" ? null : (
                <button type="button" className={styles.retry} onClick={() => void retry()} disabled={busy === "retry"}>
                  Retry{entry.referenceImages > 0 ? " (without the reference images)" : ""}
                </button>
              )}
            </div>
          ) : null}

          {job.status === "cancelled" ? (
            <div className={styles.failure} role="alert">
              <span aria-hidden="true">ⓘ</span>
              <span>Cancelled at {String(job.progress)} %</span>
            </div>
          ) : null}

          <div className={styles.docked}>
            <Composer variant="docked" fetchImpl={fetchImpl} stop={running ? { pending: busy === "stop", onStop: () => void stop() } : undefined} />
            <p className={styles.footer}>MiniMax Local generates on your Spark</p>
          </div>
        </div>
      </section>

      <aside className={styles.panel} aria-label="Progress">
        <div className={styles.panelHead}>
          <span>Progress</span>
          <span aria-hidden="true">⌄</span>
        </div>
        <ol className={styles.steps}>
          {steps.map((step, index) => (
            <li key={step.label} className={cx(styles.step, step.state === "done" && styles.stepDone, step.state === "active" && styles.stepActive, step.state === "failed" && styles.stepFailed)} data-step-state={step.state}>
              <span className={styles.stepMark} aria-hidden="true">{step.state === "done" ? "✓" : step.state === "failed" ? "!" : String(index + 1)}</span>
              <span>
                <span className={styles.stepLabel}>{step.label}</span>
                {step.detail ? <span className={styles.stepDetail}>{step.detail}</span> : null}
                {step.state === "active" && job.status === "running" ? (
                  <span className={styles.bar} role="progressbar" aria-valuenow={job.progress} aria-valuemin={0} aria-valuemax={100} aria-label="Generation progress">
                    <span className={styles.barFill} style={{ width: `${String(job.progress)}%` }} />
                  </span>
                ) : null}
              </span>
            </li>
          ))}
        </ol>
      </aside>
    </div>
  );
}
