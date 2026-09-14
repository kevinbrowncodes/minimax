"use client";
import { useEffect, useState, type KeyboardEvent, type ReactNode } from "react";
import { cx } from "@/lib/cx";
import styles from "./inert.module.css";

export const INERT_TITLE = "Not part of MiniMax Local";
export const INERT_NOTICE = "Not part of MiniMax Local — video generation only";
export const INERT_NOTICE_MS = 2000;

export interface InertProps {
  /** The role the reference's control has, so assistive tech reads the same thing. */
  readonly role?: "button" | "link" | "tab" | "switch" | "menuitem";
  readonly label?: string;
  readonly className?: string;
  /** Where the notice hangs: under the control's left edge (default) or its right edge (controls at the right of the screen). */
  readonly align?: "start" | "end";
  readonly ariaChecked?: boolean;
  readonly ariaSelected?: boolean;
  readonly children?: ReactNode;
}

/**
 * A control the reference has and MiniMax Local deliberately does not implement (STORY_012 rendered these inert;
 * STORY_019 makes them honest): it looks like the reference's control, keeps the tooltip, stays keyboard-reachable,
 * and on click or Enter/Space shows the notice under itself for two seconds. The notice is `role="status"` so a
 * screen reader hears it too. The timer is (re)scheduled on every effect setup and cleared on every cleanup, so a
 * StrictMode remount cannot strand it (CLAUDE.md §6b).
 */
export function Inert({ role = "button", label, className, align = "start", ariaChecked, ariaSelected, children }: InertProps) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (shown === 0) return undefined;
    const timer = setTimeout(() => {
      setShown(0);
    }, INERT_NOTICE_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [shown]);
  const show = () => {
    setShown((n) => n + 1);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      show();
    }
  };
  return (
    <span
      role={role}
      aria-disabled="true"
      aria-checked={ariaChecked}
      aria-selected={ariaSelected}
      tabIndex={0}
      title={INERT_TITLE}
      aria-label={label}
      className={cx(styles.host, className)}
      onClick={show}
      onKeyDown={onKeyDown}
    >
      {children}
      {shown > 0 ? (
        <span role="status" className={cx(styles.notice, align === "end" && styles.noticeEnd)}>
          {INERT_NOTICE}
        </span>
      ) : null}
    </span>
  );
}
