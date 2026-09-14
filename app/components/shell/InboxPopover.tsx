"use client";
import { useEffect, useRef } from "react";
import { Inert } from "./Inert";
import styles from "./inbox.module.css";

export interface InboxPopoverProps {
  readonly open: boolean;
  readonly onClose: () => void;
}

/**
 * The footer bell's popover (STORY_021; inbox-open@1440 / -dark, narrow-inbox-open@390): tabs All / Updates / Messages,
 * Read all, and "No messages yet". Nothing local produces messages, so the tabs and Read all are inert with the notice.
 */
export function InboxPopover({ open, onClose }: InboxPopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
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
  return (
    <div ref={ref} className={styles.popover} role="dialog" aria-label="Inbox">
      <div className={styles.head}>
        <div className={styles.tabs} role="tablist" aria-label="Inbox">
          <button type="button" role="tab" aria-selected className={styles.tabActive}>All</button>
          <Inert role="tab" ariaSelected={false} label="Updates" className={styles.tab}>Updates</Inert>
          <Inert role="tab" ariaSelected={false} label="Messages" className={styles.tab}>Messages</Inert>
        </div>
        <Inert label="Read all" className={styles.readAll} align="end">Read all</Inert>
      </div>
      <p className={styles.empty}>No messages yet</p>
    </div>
  );
}
