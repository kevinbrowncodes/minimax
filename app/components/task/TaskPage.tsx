"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useReducer, useRef, useState, type ReactNode } from "react";
import { Composer } from "@/components/composer/Composer";
import { Inert } from "@/components/shell/Inert";
import { useShell } from "@/components/shell/ShellContext";
import { IconChevronDown, IconClose, IconCopy, IconDocument, IconDownload, IconMore, IconStar } from "@/components/shell/icons";
import { fileNameFor } from "@/lib/assets-filter";
import type { ExtendSource } from "@/lib/composer-state";
import { cx } from "@/lib/cx";
import type { HistoryEntry } from "@/lib/history-store";
import type { JobStatusResponse, Overlap } from "@/lib/job-api";
import { initialJob, isTerminal, reduceJob, type JobSnapshot } from "@/lib/job-status";
import { PollAbortedError, pollUntilTerminal } from "@/lib/polling";
import { useNarrow } from "@/lib/use-narrow";
import { formatDoneAt, processedSeconds, resultLine } from "@/lib/task-view";
import { indicatorFor, stepsFor, type Step } from "@/lib/todo-steps";
import { CutNotice } from "./CutNotice";
import { ChainOutcomes } from "./ChainOutcomes";
import type { ChainSegmentView } from "@/lib/chain-outcome";
import styles from "./task.module.css";

export interface TaskPageProps {
  readonly entry: HistoryEntry;
  /** Open with the docked composer already extending this video (`/task/:id?extend`, STORY_016). */
  readonly extendOnOpen?: boolean;
  /** STORY_043: the length a queued or running clip will have (from its request), so it can be extended before it finishes. */
  readonly pendingSeconds?: number;
  /** STORY_056: the segments that continue from this one (a chain's later links), in chain order — Retry becomes Retry chain when there are any. */
  readonly chainAfter?: readonly { readonly id: string; readonly title: string }[];
  /** Injected for tests. */
  readonly fetchImpl?: typeof fetch;
}

function fromEntry(entry: HistoryEntry): JobSnapshot {
  const base = initialJob(entry.id);
  return reduceJob(base, { type: "status", response: { id: entry.id, status: entry.status, progress: entry.progress, ...(entry.error ? { error: entry.error } : {}), ...(entry.result ? { result: entry.result } : {}) } });
}

const IconEye = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><path d="M1.5 8s2.5-4.5 6.5-4.5S14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z" /><circle cx="8" cy="8" r="2" /></svg>
);
const IconPlay = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><circle cx="10" cy="10" r="8" /><path d="m8 7 5 3-5 3z" fill="currentColor" stroke="none" /></svg>
);
/** The Progress list (Work Area › Progress, and the unfolded Processed row): the reference's numbered steps with ticks. */
function StepList({ steps, job }: { readonly steps: readonly Step[]; readonly job: JobSnapshot }) {
  return (
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
  );
}

/** A folding section of the Work Area panel (task-page@1440: "Progress ⌄", "Deliverables ⌄"). */
function PanelSection({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className={styles.panelSection}>
      <button type="button" className={styles.panelHead} aria-expanded={open} onClick={() => { setOpen((o) => !o); }}>
        <span>{title}</span>
        <span className={cx(styles.panelChevron, !open && styles.panelChevronClosed)} aria-hidden="true"><IconChevronDown /></span>
      </button>
      {open ? children : null}
    </div>
  );
}

/**
 * The task page (STORY_014): the thread and the docked composer; polling drives it to a terminal state. STORY_023 gives
 * it the reference's shape: the result as a file card with a preview pane, the Work Area panel (Progress +
 * Deliverables) the top bar toggles, the Processed row and the message actions. STORY_026 removed the reference's
 * credits notice, Like / Dislike and the "MiniMax Agent is AI…" line.
 */
export function TaskPage({ entry, extendOnOpen = false, pendingSeconds, chainAfter = [], fetchImpl }: TaskPageProps) {
  const router = useRouter();
  const doFetch = fetchImpl ?? fetch;
  const { workAreaOpen, previewOpen, openPreview, closePreview, notify } = useShell();
  const narrow = useNarrow();
  const [job, dispatch] = useReducer(reduceJob, entry, fromEntry);
  const [busy, setBusy] = useState<"stop" | "retry" | undefined>(undefined);
  const [copied, setCopied] = useState(false);
  const [extending, setExtending] = useState(extendOnOpen && (entry.status === "done" || entry.status === "queued" || entry.status === "running"));
  const [overlap, setOverlap] = useState<Overlap | undefined>(entry.overlap);
  // The card's menu is fixed to the viewport (anchored under the More button) so the thread's scroller does not clip it.
  const [cardMenu, setCardMenu] = useState<{ readonly top: number; readonly right: number } | undefined>(undefined);
  const cardMenuOpen = cardMenu !== undefined;
  const closeCardMenu = useCallback(() => {
    setCardMenu(undefined);
  }, []);
  // STORY_032 (behaviour-preview-more-03): the preview pane's Download ▾ — Download · Copy link · Star / Unstar
  const [previewMenuOpen, setPreviewMenuOpen] = useState(false);
  const [starred, setStarred] = useState(entry.starred === true);
  const [processedOpen, setProcessedOpen] = useState(false);
  const [atBottom, setAtBottom] = useState(true);
  const [overflows, setOverflows] = useState(false);
  const opened = useRef(false);
  const threadRef = useRef<HTMLElement>(null);
  // STORY_057: the whole chain this segment belongs to — read on mount and again after each poll while any segment is still going
  const [chain, setChain] = useState<readonly ChainSegmentView[]>([]);
  const chainSettled = useRef(false);
  /** The chain's rows from the route; undefined once every segment is terminal (nothing left to watch) or when the route did not answer. */
  const readChain = useCallback(async (): Promise<readonly ChainSegmentView[] | undefined> => {
    if (chainSettled.current) return undefined;
    try {
      const res = await doFetch(`/api/history/${encodeURIComponent(entry.id)}/chain`);
      if (!res.ok) return undefined;
      const body = (await res.json()) as { segments?: ChainSegmentView[] };
      const segments = Array.isArray(body.segments) ? body.segments : [];
      if (segments.every((s) => isTerminal(s.status))) chainSettled.current = true;
      return segments;
    } catch {
      return undefined; // the strip keeps what it had
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- doFetch is stable for the page's life
  }, [entry.id]);
  const loadChain = useCallback((): void => {
    void readChain().then((segments) => {
      if (segments !== undefined) setChain(segments);
    });
  }, [readChain]);
  useEffect(() => {
    let cancelled = false;
    void readChain().then((segments) => {
      if (!cancelled && segments !== undefined) setChain(segments);
    });
    return () => {
      cancelled = true;
    };
  }, [readChain]);

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
        loadChain(); // STORY_057: the other segments move while this one is polled
        if (response.request?.overlap) setOverlap(response.request.overlap);
        // The preview pane opens by itself when a job finishes while the page is open (STORY_023's one departure):
        // a watched job still ends in a playing video. A finished job reopened from history waits for Open preview.
        if (response.status === "done" && response.result) openPreview();
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
    if (chainAfter.length > 0) return retryChain(); // STORY_056: segments continue from this one — they go again too
    setBusy("retry");
    try {
      // An extension retries as an extension (STORY_016): the source id and the requested context come from history.
      const body = { prompt: entry.prompt, ...entry.params, ...(entry.continuesFrom ? { continueFrom: entry.continuesFrom.id } : {}) };
      const res = await doFetch("/api/jobs", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      if (res.status === 202) {
        const body = (await res.json()) as { id: string };
        router.push(`/task/${encodeURIComponent(body.id)}`);
      }
    } finally {
      setBusy(undefined);
    }
  };
  /** STORY_056: redraw this segment and re-queue every segment behind it as extensions of the redraw — one route, one click. */
  const retryChain = async (): Promise<void> => {
    setBusy("retry");
    try {
      // the e2e lane's `?script=` on the page URL is forwarded, as the composer forwards it
      const script = typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("script");
      const res = await doFetch(`/api/jobs/${encodeURIComponent(entry.id)}/retry-chain${script === null ? "" : `?script=${encodeURIComponent(script)}`}`, { method: "POST" });
      if (res.status === 202) {
        const body = (await res.json()) as { id: string; rechained: string[]; refused?: { segment: number; message: string } };
        notify(body.refused === undefined ? `Redrawing this segment and ${String(body.rechained.length)} after it` : `Redrawing this segment; segment ${String(body.refused.segment)} after it was not sent: ${body.refused.message}`);
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

  useEffect(() => {
    if (!cardMenuOpen && !previewOpen && !previewMenuOpen) return undefined;
    const onKey = (event: globalThis.KeyboardEvent): void => {
      if (event.key === "Escape") {
        closeCardMenu();
        setPreviewMenuOpen(false);
        closePreview();
      }
    };
    const onClick = (event: MouseEvent): void => {
      if (cardMenuOpen && !(event.target instanceof Element && event.target.closest("[data-card-menu]"))) closeCardMenu();
      if (previewMenuOpen && !(event.target instanceof Element && event.target.closest("[data-preview-menu]"))) setPreviewMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, [cardMenuOpen, previewOpen, previewMenuOpen, closePreview, closeCardMenu]);

  // The jump button shows once the thread overflows its scroller; its arrow follows the scroll position.
  const measureScroll = useCallback(() => {
    const el = threadRef.current;
    if (!el) return;
    setOverflows(el.scrollHeight > el.clientHeight + 8);
    setAtBottom(el.scrollTop + el.clientHeight >= el.scrollHeight - 8);
  }, []);
  useEffect(() => {
    const el = threadRef.current;
    if (!el) return undefined;
    // the ResizeObserver fires once on observe and again as the thread grows; scroll and resize keep the arrow right
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(measureScroll) : undefined;
    observer?.observe(el);
    for (const child of Array.from(el.children)) observer?.observe(child);
    const frame = observer ? undefined : requestAnimationFrame(measureScroll);
    el.addEventListener("scroll", measureScroll);
    window.addEventListener("resize", measureScroll);
    return () => {
      observer?.disconnect();
      if (frame !== undefined) cancelAnimationFrame(frame);
      el.removeEventListener("scroll", measureScroll);
      window.removeEventListener("resize", measureScroll);
    };
  }, [measureScroll]);
  const jump = (): void => {
    const el = threadRef.current;
    if (!el) return;
    el.scrollTo({ top: atBottom ? 0 : el.scrollHeight, behavior: "smooth" });
  };
  // The thread opens at its end and follows the job there (task-page@1440 shows the result, not the top of a long prompt).
  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [job.status]);
  const steps = stepsFor(job);
  const resultPath = `/api/jobs/${encodeURIComponent(entry.id)}/result`;
  const posterPath = `/api/jobs/${encodeURIComponent(entry.id)}/poster`;
  const extendSource: ExtendSource | undefined =
    extending && job.status === "done" && job.result
      ? { id: entry.id, title: entry.title, durationSeconds: job.result.durationSeconds, ratio: entry.params.ratio, resolution: entry.params.resolution, model: entry.params.model, posterUrl: posterPath }
      : extending && running
        // STORY_043: a clip still queued or running — its requested length; the extension waits for it in the queue
        ? { id: entry.id, title: entry.title, durationSeconds: pendingSeconds ?? entry.params.durationSeconds, ratio: entry.params.ratio, resolution: entry.params.resolution, model: entry.params.model, posterUrl: posterPath, pending: true }
        : undefined;

  const done = job.status === "done" && job.result;
  const fileName = fileNameFor(entry);
  /** STORY_032: Star / Unstar from the preview pane — the same PATCH and toast as Assets. */
  const toggleStar = async (): Promise<void> => {
    const next = !starred;
    const res = await doFetch(`/api/history/${encodeURIComponent(entry.id)}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ starred: next }) }).catch(() => undefined);
    if (res?.ok === true) {
      setStarred(next);
      notify(next ? "Starred" : "Unstarred");
    } else notify("That did not save — the app's server did not answer", { tone: "info" });
  };
  /** STORY_032: Copy link — the result's URL on the clipboard. */
  const copyLink = async (): Promise<void> => {
    const link = `${window.location.origin}${resultPath}`;
    try {
      await navigator.clipboard.writeText(link);
      notify("Link copied");
    } catch {
      notify(`Clipboard unavailable — the link is ${link}`, { tone: "info" });
    }
  };
  const doneAt = entry.finishedAt ?? entry.createdAt;
  const showPanel = workAreaOpen && !previewOpen && !narrow; // narrow-task-page@390: no panel

  return (
    <div className={cx(styles.page, previewOpen && styles.pagePreview)}>
      <div className={styles.main}>
        <section className={styles.thread} aria-label="Task" ref={threadRef} onScroll={closeCardMenu}>
          <div className={styles.column}>
            <div className={styles.bubble} data-testid="user-message">
              {entry.prompt}
              {entry.referenceImages > 0 ? <div className={styles.refs}>{String(entry.referenceImages)} reference image{entry.referenceImages > 1 ? "s" : ""} attached</div> : null}
              {entry.continuesFrom ? (
                <span className={styles.continues} data-testid="continues">
                  Continues <Link href={`/task/${encodeURIComponent(entry.continuesFrom.id)}`}>{entry.continuesFrom.title}</Link>
                  {entry.continuesFrom.durationSeconds === undefined ? "" : ` · ${entry.continuesFrom.durationSeconds.toFixed(1)} s`}
                  {overlap ? ` · carried its last ${overlap.seconds.toFixed(1)} s` : ""}
                  {entry.params.endAnchor === "source-last-frame" ? " · ends where it began" : ""}
                </span>
              ) : null}
              <ChainOutcomes segments={chain} currentId={entry.id} />
            </div>

            {running ? (
              <div className={styles.indicator} role="status" aria-live="polite" data-testid="indicator">
                <span className={styles.avatar} aria-hidden="true">M</span>
                <span className={styles.pulse} aria-hidden="true" />
                <span>{indicatorFor(job)}</span>
                {/* STORY_043: an extension can be queued before the clip is done; it waits in the line for it */}
                {extending ? null : <button type="button" className={styles.queueExtension} onClick={() => { closePreview(); setExtending(true); }}>⤴ Queue an extension</button>}
              </div>
            ) : (
              <div className={styles.processedWrap}>
                <button type="button" className={styles.processed} aria-expanded={processedOpen} onClick={() => { setProcessedOpen((o) => !o); }}>
                  Processed {String(processedSeconds(entry, new Date()))}s <span className={cx(styles.processedChevron, processedOpen && styles.processedChevronOpen)} aria-hidden="true">›</span>
                </button>
                {processedOpen ? <div className={styles.processedSteps}><StepList steps={steps} job={job} /></div> : null}
                <div className={styles.divider} />
              </div>
            )}

            {done ? (
              <div className={styles.result} data-testid="result">
                {/* STORY_020 / CHORE_009: the server measured a shot change; Retry re-posts the request with a new seed. STORY_046: a moving camera's framing is a note */}
                <CutNotice cuts={job.result.cuts} camera={job.result.camera} onRetry={() => void retry()} busy={busy === "retry"} rechains={chainAfter.length} />
                <p className={styles.agentLine} role="status" data-testid="indicator">{resultLine(job)}</p>
                <div className={styles.card} data-testid="result-card">
                  <span className={styles.cardIcon} aria-hidden="true"><IconPlay /></span>
                  <button type="button" className={styles.cardName} onClick={openPreview}>
                    <span className={styles.cardFile}>{fileName}</span>
                    <span className={styles.cardType}>MP4</span>
                  </button>
                  <span className={styles.cardActions} data-card-menu>
                    <button type="button" className={styles.openPreview} onClick={openPreview}><IconEye /> Open preview</button>
                    <button
                      type="button"
                      className={styles.cardMore}
                      aria-label="More"
                      aria-haspopup="menu"
                      aria-expanded={cardMenuOpen}
                      onClick={(event) => {
                        const rect = event.currentTarget.getBoundingClientRect();
                        setCardMenu(cardMenu ? undefined : { top: rect.bottom + 4, right: window.innerWidth - rect.right });
                      }}
                    >
                      <IconChevronDown />
                    </button>
                    {cardMenu ? (
                      <div className={styles.cardMenu} role="menu" aria-label="Result actions" style={{ top: cardMenu.top, right: cardMenu.right }}>
                        <button type="button" role="menuitem" className={styles.cardMenuItem} onClick={() => { closeCardMenu(); openPreview(); }}><IconEye /> Open preview</button>
                        <a role="menuitem" className={styles.cardMenuItem} href={`${resultPath}?download`} download={fileName} onClick={() => { closeCardMenu(); }}><IconDownload /> Download</a>
                        <button type="button" role="menuitem" className={styles.cardMenuItem} onClick={() => { closeCardMenu(); closePreview(); setExtending(true); }}>⤴ Extend</button>
                      </div>
                    ) : null}
                  </span>
                </div>
                <div className={styles.actions}>
                  <button type="button" className={styles.action} aria-label={copied ? "Copied" : "Copy prompt"} title={copied ? "Copied" : "Copy prompt"} onClick={() => void copyPrompt()}><IconCopy /></button>
                  <span className={styles.time}>{formatDoneAt(doneAt)}</span>
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
                    {chainAfter.length > 0 ? `Retry chain (${String(chainAfter.length)} after it)` : `Retry${entry.referenceImages > 0 ? " (without the reference images)" : ""}`}
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
          </div>
        </section>

        <div className={styles.docked}>
          {overflows ? (
            <button type="button" className={styles.jump} aria-label={atBottom ? "Click to jump to start of answer, double-click to jump to top" : "Click to jump to bottom"} onClick={jump} onDoubleClick={() => { threadRef.current?.scrollTo({ top: 0 }); }}>
              <span className={cx(styles.jumpArrow, !atBottom && styles.jumpArrowDown)} aria-hidden="true">↑</span>
            </button>
          ) : null}
          <Composer variant="docked" fetchImpl={fetchImpl} initialProjectId={entry.projectId} stop={running && !extending ? { pending: busy === "stop", onStop: () => void stop() } : undefined} extend={extendSource} onStopExtending={() => { setExtending(false); }} />
        </div>
      </div>

      {previewOpen && done ? (
        <aside className={styles.preview} aria-label="Preview" data-testid="preview-pane">
          <div className={styles.previewHead}>
            <span className={styles.previewTitle}><IconEye /> Preview</span>
            <span className={styles.previewDivider} aria-hidden="true" />
            <span className={styles.previewFile}>{fileName}</span>
            <span className={styles.previewActions}>
              <span className={styles.previewDownloadGroup} data-preview-menu>
                <a className={styles.previewDownload} href={`${resultPath}?download`} download={fileName}><IconDownload /> Download</a>
                <button type="button" className={styles.previewDownloadMore} aria-label="More download options" aria-haspopup="menu" aria-expanded={previewMenuOpen} onClick={() => { setPreviewMenuOpen((o) => !o); }}><IconChevronDown /></button>
                {previewMenuOpen ? (
                  <div className={styles.previewMenu} role="menu" aria-label="Preview actions">
                    <a role="menuitem" className={styles.cardMenuItem} href={`${resultPath}?download`} download={fileName} onClick={() => { setPreviewMenuOpen(false); }}><IconDownload /> Download</a>
                    <button type="button" role="menuitem" className={styles.cardMenuItem} onClick={() => { setPreviewMenuOpen(false); void copyLink(); }}><IconCopy /> Copy link</button>
                    <button type="button" role="menuitem" className={styles.cardMenuItem} onClick={() => { setPreviewMenuOpen(false); void toggleStar(); }}><IconStar /> {starred ? "Unstar" : "Star"}</button>
                  </div>
                ) : null}
              </span>
              <Inert label="More" className={styles.previewIcon} align="end"><IconMore /></Inert>
              <button type="button" className={styles.previewIcon} aria-label="Close" onClick={closePreview}><IconClose /></button>
            </span>
          </div>
          <div className={styles.previewBody}>
            <video className={styles.video} controls playsInline preload="metadata" poster={posterPath} src={resultPath} data-testid="result-video">
              <track kind="captions" />
            </video>
          </div>
        </aside>
      ) : null}

      {showPanel ? (
        <div className={styles.panelCol}>
          <aside className={styles.panel} aria-label="Work Area" data-testid="work-area">
            <PanelSection title="Progress">
              {steps.length === 0 ? <p className={styles.panelHint}>Track progress on longer tasks.</p> : <StepList steps={steps} job={job} />}
            </PanelSection>
            <PanelSection title="Deliverables">
              {done ? (
                <button type="button" className={styles.deliverable} onClick={openPreview}>
                  <IconDocument /> <span className={styles.deliverableName}>{fileName}</span>
                </button>
              ) : (
                <p className={styles.panelHint}>Files the task produces will appear here.</p>
              )}
            </PanelSection>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
