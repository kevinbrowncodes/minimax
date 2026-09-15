"use client";
import { useEffect, useRef } from "react";
import { cx } from "@/lib/cx";
import type { Project } from "@/lib/project-store";
import styles from "./create-project.module.css";

export interface DeleteProjectDialogProps {
  readonly project: Project | undefined;
  /** How many tasks point at it — they stay in Recents (STORY_031 › Departures), and the dialog says so. */
  readonly taskCount: number;
  readonly onCancel: () => void;
  readonly onConfirm: (project: Project) => void;
}

/**
 * The reference's Delete project dialog (STORY_031; behaviour-project-delete-04-after-delete-click): "Are you sure you
 * want to delete project "…"? This action cannot be undone." with Cancel and a red Delete. Ours adds one sentence when
 * the project holds tasks, because here they stay.
 */
export function DeleteProjectDialog({ project, taskCount, onCancel, onConfirm }: DeleteProjectDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!project) return undefined;
    cancelRef.current?.focus();
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [project, onCancel]);
  if (!project) return null;
  const tasks = taskCount === 0 ? "" : ` Its ${String(taskCount)} ${taskCount === 1 ? "task stays" : "tasks stay"} in Recents.`;
  return (
    <div className={styles.backdrop} data-testid="delete-project-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
      <div className={cx(styles.dialog, styles.confirm)} role="dialog" aria-labelledby="delete-project-title" aria-describedby="delete-project-text">
        <h2 id="delete-project-title" className={styles.title}>Delete project</h2>
        <p id="delete-project-text" className={styles.text}>Are you sure you want to delete project &quot;{project.name}&quot;? This action cannot be undone.{tasks}</p>
        <div className={styles.actions}>
          <button ref={cancelRef} type="button" className={styles.cancel} onClick={onCancel}>Cancel</button>
          <button type="button" className={styles.danger} onClick={() => { onConfirm(project); }}>Delete</button>
        </div>
      </div>
    </div>
  );
}
