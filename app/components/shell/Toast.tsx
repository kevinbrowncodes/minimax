"use client";
import { useEffect } from "react";
import { IconClose } from "./icons";
import styles from "./toast.module.css";

export const TOAST_MS = 2000;

export interface ToastProps {
  readonly message: string | undefined;
  readonly onClose: () => void;
}

/**
 * The reference's toast (STORY_029; behaviour-recents-pin-01-pinned@1440: "Task pinned" top-centre with a Close toast ×):
 * `role="status"` so a reader hears it; gone after two seconds or on the ×. The timer is (re)scheduled on every effect
 * setup and cleared on every cleanup, so a StrictMode remount cannot strand it (CLAUDE.md §6b).
 */
export function Toast({ message, onClose }: ToastProps) {
  useEffect(() => {
    if (message === undefined) return undefined;
    const timer = setTimeout(onClose, TOAST_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [message, onClose]);
  if (message === undefined) return null;
  return (
    <div className={styles.toast} role="status" data-testid="toast">
      <span>{message}</span>
      <button type="button" className={styles.close} aria-label="Close toast" onClick={onClose}><IconClose /></button>
    </div>
  );
}
