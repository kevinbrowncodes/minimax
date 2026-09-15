"use client";
import { useEffect, useRef, useState } from "react";
import { cx } from "@/lib/cx";
import { INBOX_TABS, formatEventTime, isEventRead, tabFilter, type InboxEvent, type InboxTab } from "@/lib/inbox";
import styles from "./inbox.module.css";

export interface InboxPopoverProps {
  readonly open: boolean;
  readonly onClose: () => void;
  /** STORY_033: the job events, newest first; the browser's Read all stamp; Read all; a row opens its task. */
  readonly events?: readonly InboxEvent[];
  readonly readAt?: string;
  readonly onReadAll?: () => void;
  readonly onOpen?: (event: InboxEvent) => void;
  /** Injected for tests. */
  readonly now?: () => Date;
}

/**
 * The footer bell's popover (STORY_021; inbox-open@1440 / -dark, narrow-inbox-open@390): tabs All / Updates / Messages,
 * Read all, and "No messages yet". STORY_033 fills it with the job log — a 40 px row per event, drawn like the
 * reference's list rows: a dot while unread, the event, the task's stamp and title, the time at the right. Updates
 * are the job events; Messages are chats (STORY_037), none yet.
 */
export function InboxPopover({ open, onClose, events = [], readAt, onReadAll, onOpen, now }: InboxPopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<InboxTab>("All");
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") onClose();
    };
    const onPointer = (event: MouseEvent): void => {
      const root = ref.current?.parentElement;
      if (root && event.target instanceof Node && !root.contains(event.target)) onClose();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onPointer);
    };
  }, [open, onClose]);
  if (!open) return null;
  const shown = tabFilter(events, tab);
  const unread = events.some((e) => !isEventRead(e, readAt));
  return (
    <div ref={ref} className={styles.popover} role="dialog" aria-label="Inbox">
      <div className={styles.head}>
        <div className={styles.tabs} role="tablist" aria-label="Inbox">
          {INBOX_TABS.map((t) => (
            <button key={t} type="button" role="tab" aria-selected={tab === t} className={tab === t ? styles.tabActive : styles.tab} onClick={() => { setTab(t); }}>{t}</button>
          ))}
        </div>
        <button type="button" className={cx(styles.readAll, !unread && styles.readAllQuiet)} onClick={onReadAll} disabled={!unread}>Read all</button>
      </div>
      {shown.length === 0 ? (
        <p className={styles.empty}>No messages yet</p>
      ) : (
        <ul className={styles.list} aria-label={`${tab} messages`}>
          {shown.map((event) => {
            const read = isEventRead(event, readAt);
            return (
              <li key={event.id}>
                <button type="button" className={styles.row} onClick={() => { onOpen?.(event); }} data-testid="inbox-row" data-read={read}>
                  <span className={cx(styles.dot, read && styles.dotRead)} aria-label={read ? undefined : "Unread"} />
                  <span className={styles.rowText}>
                    <span className={styles.rowTitle}>{event.text}</span>
                    <span className={styles.rowTask} title={event.title}>{event.stamp} {event.title}</span>
                  </span>
                  <span className={styles.rowTime}>{formatEventTime(event.at, now?.())}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
