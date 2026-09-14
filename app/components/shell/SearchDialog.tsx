"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { groupByAge, recentLabel, recentName, searchRecents } from "@/lib/recents";
import type { RecentEntry } from "@/lib/route-title";
import { IconClose } from "./icons";
import styles from "./search-dialog.module.css";

export interface SearchDialogProps {
  readonly open: boolean;
  readonly recents: readonly RecentEntry[];
  readonly onClose: () => void;
  /** Injectable clock for the age groups (tests). */
  readonly now?: () => Date;
}

/**
 * The sidebar's Search (STORY_021; page-search@1440 / -dark, narrow-page-search@390): a dialog with a borderless
 * "Search tasks" field, the history grouped Previous 7 days / Older, rows that open the task. The filter is live.
 */
export function SearchDialog(props: SearchDialogProps) {
  // Mounted only while open, so the query starts empty and the field focuses on every opening without an effect.
  if (!props.open) return null;
  return <SearchDialogBody {...props} />;
}

function SearchDialogBody({ recents, onClose, now = () => new Date() }: SearchDialogProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);
  const groups = groupByAge(searchRecents(recents, query), now());
  return (
    <div className={styles.backdrop} data-testid="search-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className={styles.dialog} role="dialog" aria-label="Search tasks">
        <div className={styles.head}>
          <input ref={inputRef} className={styles.input} type="search" placeholder="Search tasks" aria-label="Search task titles" value={query} onChange={(event) => { setQuery(event.target.value); }} />
          <button type="button" className={styles.close} aria-label="Close" onClick={onClose}><IconClose /></button>
        </div>
        <div className={styles.body}>
          {groups.length === 0 ? <p className={styles.empty}>{recents.length === 0 ? "No task history." : "No matching tasks."}</p> : null}
          {groups.map((group) => (
            <div key={group.label} className={styles.group}>
              <span className={styles.groupLabel}>{group.label}</span>
              {group.entries.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  className={styles.row}
                  aria-label={recentName(entry)}
                  title={entry.title}
                  onClick={() => {
                    onClose();
                    router.push(`/task/${encodeURIComponent(entry.id)}`);
                  }}
                >
                  {recentLabel(entry)}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
