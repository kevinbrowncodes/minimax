"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { IconAvatar, IconSettings } from "./icons";
import styles from "./user-menu.module.css";

export interface UserMenuProps {
  readonly onOpenSettings: () => void;
}

/**
 * The footer chip and its menu (STORY_019; user-menu-open@1440 / -dark, narrow-user-menu-open@390). STORY_026 removed
 * the reference's plan row, Switch to classic, Daily check-in, Usage, Contact us, Learn more and Logout — none of them
 * can mean anything on a one-owner Spark — so the menu holds Settings alone, with room for what the wiring epic adds.
 * Escape and a click outside close it.
 */
export function UserMenu({ onOpenSettings }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => {
    setOpen(false);
  }, []);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") close();
    };
    const onPointer = (event: MouseEvent): void => {
      if (rootRef.current && event.target instanceof Node && !rootRef.current.contains(event.target)) close();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onPointer);
    };
  }, [open, close]);

  return (
    <div className={styles.root} ref={rootRef}>
      <button type="button" className={styles.chip} aria-haspopup="menu" aria-expanded={open} aria-label="Owner" onClick={() => {
          setOpen((o) => !o);
        }}
      >
        <IconAvatar /> Owner
      </button>
      {open ? (
        <div className={styles.menu} role="menu" aria-label="User menu">
          <div className={styles.uid}>UID : local</div>
          <div className={styles.separator} />
          <button
            type="button"
            role="menuitem"
            className={styles.entry}
            onClick={() => {
              close();
              onOpenSettings();
            }}
          >
            <span className={styles.entryIcon}><IconSettings /></span>
            <span className={styles.entryLabel}>Settings</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
