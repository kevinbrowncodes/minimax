"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { cx } from "@/lib/cx";
import type { JobStatusResponse } from "@/lib/job-api";
import { SCHEDULE_FILTERS, filterSections, formatNotBefore, isEmpty, runningLabel, scheduleSections, toLocalInput, type QueueRow, type ScheduleFilter } from "@/lib/queue-view";
import { recentLabel } from "@/lib/recents";
import type { RecentEntry } from "@/lib/route-title";
import { formatDoneAt } from "@/lib/task-view";
import { useShell } from "@/components/shell/ShellContext";
import { IconChevronDown, IconPlus, IconSearch } from "@/components/shell/icons";
import styles from "./pages.module.css";

export interface ScheduledPageProps {
  readonly fetchImpl?: typeof fetch;
  /** Injected for tests. */
  readonly now?: () => Date;
  /** How often the page refetches while mounted (ms); 0 = never (tests). */
  readonly pollMs?: number;
}

export const SCHEDULED_POLL_MS = 2000;

/**
 * Scheduled (STORY_041; the chrome from page-scheduled@1440 / narrow-page-scheduled@390: the "Schedules" heading —
 * in the bar at 390 —, the "Search scheduled tasks" field with its status filter, Create top-right, "No scheduled
 * tasks yet."): our meaning is the queue of generations. Running (the model server's open jobs, with Stop), Waiting
 * (the line, in order: move up / down, Run at…, Edit, Remove), Done today and Failed (the last day, each a link to
 * its task). Refetched every two seconds while open — the queue's runner lives in the polled routes, so this page
 * also advances the line.
 */
export function ScheduledPage({ fetchImpl, now, pollMs = SCHEDULED_POLL_MS }: ScheduledPageProps) {
  const doFetch = fetchImpl ?? fetch;
  const clock = now ?? (() => new Date());
  const router = useRouter();
  const { setPageActions } = useShell();
  const [queue, setQueue] = useState<readonly QueueRow[] | undefined>(undefined);
  const [history, setHistory] = useState<readonly RecentEntry[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ScheduleFilter>("All");
  const [timing, setTiming] = useState<string | undefined>(undefined);

  const load = useCallback(async (): Promise<void> => {
    const [q, h] = await Promise.all([
      doFetch("/api/queue").then(async (res) => (res.ok ? ((await res.json()) as { entries: QueueRow[] }).entries : [])).catch(() => [] as QueueRow[]),
      doFetch("/api/history").then(async (res) => (res.ok ? ((await res.json()) as { entries: RecentEntry[] }).entries : [])).catch(() => [] as RecentEntry[]),
    ]);
    // the running jobs' progress: history learns it only when a status is polled, so this page polls them (the task page does the same)
    const waitingIds = new Set(q.map((e) => e.id));
    const open = h.filter((e) => (e.status === "queued" || e.status === "running") && !waitingIds.has(e.id));
    const statuses = await Promise.all(open.map((e) => doFetch(`/api/jobs/${encodeURIComponent(e.id)}`).then(async (res) => (res.ok ? ((await res.json()) as JobStatusResponse) : undefined)).catch(() => undefined)));
    const byId = new Map(statuses.filter((s): s is JobStatusResponse => s !== undefined).map((s) => [s.id, s]));
    setQueue(q);
    setHistory(h.map((e) => {
      const s = byId.get(e.id);
      return s ? { ...e, status: s.status, progress: s.progress, ...(s.error ? { error: s.error } : {}), ...(s.result ? { result: s.result } : {}) } : e;
    }));
  }, [doFetch]);

  // The poll: scheduled on every effect setup, cleared on every cleanup (CLAUDE.md §6b — StrictMode-safe).
  useEffect(() => {
    let cancelled = false;
    const tick = (): void => {
      void load().then(() => undefined, () => undefined);
    };
    tick();
    const timer = pollMs > 0 ? setInterval(() => { if (!cancelled) tick(); }, pollMs) : undefined;
    return () => {
      cancelled = true;
      if (timer !== undefined) clearInterval(timer);
    };
  }, [load, pollMs]);

  // The bar: the heading at 390 (the capture has it there), + Create at the right (the capture's black button).
  useEffect(() => {
    const actions: ReactNode = (
      <>
        <span className={cx(styles.barCentre, styles.narrowOnly)}>Schedules</span>
        <span className={styles.barRight}>
          <Link href="/" className={styles.barPrimary}><IconPlus /> Create</Link>
        </span>
      </>
    );
    setPageActions(actions);
    return () => {
      setPageActions(undefined);
    };
  }, [setPageActions]);

  const act = async (input: string, init: RequestInit): Promise<void> => {
    await doFetch(input, init).catch(() => undefined);
    await load();
  };
  const patchQueue = (id: string, body: unknown): Promise<void> => act(`/api/queue/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

  const all = scheduleSections(queue ?? [], history, clock());
  const shown = filterSections(all, query, filter);
  const nothingAtAll = queue !== undefined && isEmpty(all);
  const nothingShown = queue !== undefined && !nothingAtAll && isEmpty(shown);

  return (
    <main className={cx(styles.page, styles.scheduledPage)} data-testid="scheduled-page">
      <h1 className={cx(styles.pageTitle, styles.wideOnly)}>Schedules</h1>
      <div className={styles.scheduledToolbar}>
        <label className={cx(styles.search, styles.searchWide)}>
          <IconSearch />
          <input type="search" className={styles.searchInput} placeholder="Search scheduled tasks" aria-label="Search scheduled tasks" value={query} onChange={(event) => { setQuery(event.target.value); }} />
        </label>
        <span className={styles.selectWrap}>
          <select className={cx(styles.statusFilter, styles.select)} aria-label="Scheduled task status" value={filter} onChange={(event) => { setFilter(event.target.value as ScheduleFilter); }}>
            {SCHEDULE_FILTERS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          <IconChevronDown />
        </span>
      </div>

      {nothingAtAll ? (
        <div className={styles.scheduledEmpty} data-testid="scheduled-empty">
          <p>No scheduled tasks yet.</p>
          <Link href="/" className={cx(styles.barPrimary, styles.emptyCreate)}><IconPlus /> Create</Link>
        </div>
      ) : null}
      {nothingShown ? <p className={styles.scheduledEmpty}>No matching tasks.</p> : null}

      {shown.running.length > 0 ? (
        <section className={styles.scheduleSection} aria-label="Running">
          <h2 className={styles.scheduleHeading}>Running</h2>
          <ul className={styles.scheduleList}>
            {shown.running.map((entry) => (
              <li key={entry.id} className={styles.scheduleRow} data-testid="running-row">
                <span className={cx(styles.scheduleDot, styles.scheduleDotOn)} aria-hidden="true" />
                <Link href={`/task/${encodeURIComponent(entry.id)}`} className={styles.scheduleText}>
                  <span className={styles.scheduleStamp}>{recentLabel(entry)}</span>
                  <span className={styles.scheduleTitle}>{entry.title}</span>
                </Link>
                <span className={styles.scheduleStatus}>{runningLabel(entry)}</span>
                <span className={styles.scheduleActions}>
                  <button type="button" className={styles.smallButton} aria-label={`Stop ${entry.title}`} onClick={() => void act(`/api/jobs/${encodeURIComponent(entry.id)}`, { method: "DELETE" })}>Stop</button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {shown.waiting.length > 0 ? (
        <section className={styles.scheduleSection} aria-label="Waiting">
          <h2 className={styles.scheduleHeading}>Waiting ({shown.waiting.length})</h2>
          <ul className={styles.scheduleList}>
            {shown.waiting.map((row) => {
              const status = row.notBefore === undefined ? (row.position === 1 ? "Waiting · next" : "Waiting") : formatNotBefore(row.notBefore, clock());
              const isTiming = timing === row.id;
              return (
                <li key={row.id} className={styles.scheduleRow} data-testid="waiting-row" data-position={row.position}>
                  <span className={styles.schedulePosition}>{row.position}</span>
                  <Link href={`/task/${encodeURIComponent(row.id)}`} className={styles.scheduleText}>
                    <span className={styles.scheduleStamp}>{recentLabel({ title: row.title, createdAt: row.createdAt })}</span>
                    <span className={styles.scheduleTitle}>{row.title}</span>
                  </Link>
                  <span className={styles.scheduleStatus}>{status}</span>
                  <span className={styles.scheduleActions}>
                    <button type="button" className={styles.smallButtonPlain} aria-label={`Move ${row.title} up`} disabled={row.position === 1} onClick={() => void patchQueue(row.id, { move: "up" })}>↑</button>
                    <button type="button" className={styles.smallButtonPlain} aria-label={`Move ${row.title} down`} disabled={row.position === all.waiting.length} onClick={() => void patchQueue(row.id, { move: "down" })}>↓</button>
                    <button type="button" className={styles.smallButtonPlain} aria-label={`Run ${row.title} at`} aria-expanded={isTiming} onClick={() => { setTiming(isTiming ? undefined : row.id); }}>Run at…</button>
                    <button type="button" className={styles.smallButtonPlain} aria-label={`Edit ${row.title}`} onClick={() => { router.push(`/?queue=${encodeURIComponent(row.id)}`); }}>Edit</button>
                    <button type="button" className={cx(styles.smallButtonPlain, styles.smallButtonDangerPlain)} aria-label={`Remove ${row.title}`} onClick={() => void act(`/api/queue/${encodeURIComponent(row.id)}`, { method: "DELETE" })}>Remove</button>
                  </span>
                  {isTiming ? (
                    <div className={styles.runAt} data-testid="run-at">
                      <label className={styles.runAtField}>
                        <span>Run at</span>
                        <input
                          type="datetime-local"
                          aria-label={`Run at time for ${row.title}`}
                          defaultValue={toLocalInput(row.notBefore)}
                          onChange={(event) => {
                            const value = event.target.value;
                            if (value === "" || Number.isNaN(Date.parse(value))) return;
                            void patchQueue(row.id, { notBefore: new Date(value).toISOString() });
                          }}
                        />
                      </label>
                      {row.notBefore !== undefined ? <button type="button" className={styles.smallButtonPlain} aria-label={`Clear the time for ${row.title}`} onClick={() => { setTiming(undefined); void patchQueue(row.id, { notBefore: null }); }}>Clear</button> : null}
                      <span className={styles.runAtNote}>Goes on the first check after this time while MiniMax Local is open — the queue runs inside the app.</span>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {shown.done.length > 0 ? (
        <section className={styles.scheduleSection} aria-label="Done today">
          <h2 className={styles.scheduleHeading}>Done today</h2>
          <ul className={styles.scheduleList}>
            {shown.done.map((entry) => (
              <li key={entry.id} className={styles.scheduleRow} data-testid="done-row">
                <span className={cx(styles.scheduleDot, styles.scheduleDotDone)} aria-hidden="true" />
                <Link href={`/task/${encodeURIComponent(entry.id)}`} className={styles.scheduleText}>
                  <span className={styles.scheduleStamp}>{recentLabel(entry)}</span>
                  <span className={styles.scheduleTitle}>{entry.title}</span>
                </Link>
                <span className={styles.scheduleStatus}>Done {entry.finishedAt === undefined ? "" : formatDoneAt(entry.finishedAt).replace(/^.*, /, "")}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {shown.failed.length > 0 ? (
        <section className={styles.scheduleSection} aria-label="Failed">
          <h2 className={styles.scheduleHeading}>Failed</h2>
          <ul className={styles.scheduleList}>
            {shown.failed.map((entry) => (
              <li key={entry.id} className={styles.scheduleRow} data-testid="failed-row">
                <span className={cx(styles.scheduleDot, styles.scheduleDotFailed)} aria-hidden="true" />
                <Link href={`/task/${encodeURIComponent(entry.id)}`} className={styles.scheduleText}>
                  <span className={styles.scheduleStamp}>{recentLabel(entry)}</span>
                  <span className={styles.scheduleTitle}>{entry.title}</span>
                </Link>
                <span className={styles.scheduleStatus}>{entry.status === "cancelled" ? `Cancelled at ${String(entry.progress ?? 0)} %` : entry.error?.code === "moderated" ? "Refused" : "Failed"}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
