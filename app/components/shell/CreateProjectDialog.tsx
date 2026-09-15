"use client";
import { useEffect, useRef, useState } from "react";
import { cx } from "@/lib/cx";
import { Inert } from "./Inert";
import { IconClose } from "./icons";
import styles from "./create-project.module.css";

export interface CreateProjectDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  /** STORY_031: Create posts the name; without a handler the button keeps the notice (STORY_021). */
  readonly onCreate?: (name: string) => void;
  readonly busy?: boolean;
  readonly error?: string;
}

/**
 * Sidebar › Projects › Add new project (STORY_021; page-add-new-project@1440 / -dark, behaviour-project-create-01..02):
 * the reference's Create project dialog — a name field with the placeholder "Final Essay" and a Create button that is
 * inactive until a name is typed (STORY_031). Enter creates; Escape and the backdrop close.
 */
export function CreateProjectDialog(props: CreateProjectDialogProps) {
  if (!props.open) return null;
  return <CreateProjectBody {...props} />;
}

function CreateProjectBody({ onClose, onCreate, busy = false, error }: CreateProjectDialogProps) {
  const [name, setName] = useState("");
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
  const ready = name.trim() !== "" && !busy;
  return (
    <div className={styles.backdrop} data-testid="create-project-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <form
        className={styles.dialog}
        role="dialog"
        aria-labelledby="create-project-title"
        onSubmit={(event) => {
          event.preventDefault();
          if (ready) onCreate?.(name.trim());
        }}
      >
        <div className={styles.head}>
          <h2 id="create-project-title" className={styles.title}>Create project</h2>
          <button type="button" className={styles.close} aria-label="Close" onClick={onClose}><IconClose /></button>
        </div>
        <label className={styles.label} htmlFor="create-project-name">Project name</label>
        <input id="create-project-name" ref={inputRef} className={styles.input} placeholder="Final Essay" value={name} onChange={(event) => { setName(event.target.value); }} />
        {error !== undefined ? <p className={styles.error} role="alert">{error}</p> : null}
        <div className={styles.actions}>
          {onCreate ? (
            <button type="submit" className={cx(styles.create, !ready && styles.createInactive)} disabled={!ready}>Create</button>
          ) : (
            <Inert label="Create" className={styles.create} align="end">Create</Inert>
          )}
        </div>
      </form>
    </div>
  );
}
