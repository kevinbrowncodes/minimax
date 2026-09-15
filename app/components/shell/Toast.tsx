"use client";
import { useEffect, type ReactNode } from "react";
import { cx } from "@/lib/cx";
import { IconCheckCircle, IconClose, IconInfo } from "./icons";
import type { ToastState } from "./ShellContext";
import styles from "./toast.module.css";

export interface ToastProps {
  readonly toast: ToastState | undefined;
  readonly onClose: () => void;
}

/**
 * The reference's toast, top-centre with a Close toast × (STORY_029). Two tones from the captures (STORY_030):
 * behaviour-recents-pin-01-pinned — a green pill with a check ("Task pinned"); behaviour-recents-archive-01 — the neutral
 * pill with an ℹ and links ("Undo or view archived tasks in Settings"). `role="status"` so a reader hears it; gone after
 * its duration or on the ×. The timer is (re)scheduled on every effect setup and cleared on every cleanup, so a
 * StrictMode remount cannot strand it (CLAUDE.md §6b).
 */
export function Toast({ toast, onClose }: ToastProps) {
  useEffect(() => {
    if (toast === undefined) return undefined;
    const timer = setTimeout(onClose, toast.durationMs);
    return () => {
      clearTimeout(timer);
    };
  }, [toast, onClose]);
  if (toast === undefined) return null;
  return (
    <div className={cx(styles.toast, toast.tone === "success" ? styles.success : styles.info)} role="status" data-testid="toast" data-tone={toast.tone}>
      <span className={styles.icon} aria-hidden="true">{toast.tone === "success" ? <IconCheckCircle /> : <IconInfo />}</span>
      <span className={styles.body}>{toast.content}</span>
      <button type="button" className={styles.close} aria-label="Close toast" onClick={onClose}><IconClose /></button>
    </div>
  );
}

/** A link inside a toast's sentence — the reference's Undo and Settings (behaviour-recents-archive-01). */
export function ToastLink({ children, onClick }: { readonly children: ReactNode; readonly onClick: () => void }) {
  return <button type="button" className={styles.link} onClick={onClick}>{children}</button>;
}
