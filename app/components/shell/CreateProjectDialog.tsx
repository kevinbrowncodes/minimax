"use client";
import { useEffect, useRef, useState } from "react";
import { Inert } from "./Inert";
import { IconClose } from "./icons";
import styles from "./create-project.module.css";

export interface CreateProjectDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
}

/**
 * Sidebar › Projects › Add new project (STORY_021; page-add-new-project@1440 / -dark): the reference's Create project
 * dialog — a name field with the placeholder "Final Essay" and a Create button. Projects are not part of MiniMax Local,
 * so Create shows the notice; the dialog is otherwise as captured.
 */
export function CreateProjectDialog(props: CreateProjectDialogProps) {
  if (!props.open) return null;
  return <CreateProjectBody onClose={props.onClose} />;
}

function CreateProjectBody({ onClose }: { readonly onClose: () => void }) {
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
  return (
    <div className={styles.backdrop} data-testid="create-project-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className={styles.dialog} role="dialog" aria-labelledby="create-project-title">
        <div className={styles.head}>
          <h2 id="create-project-title" className={styles.title}>Create project</h2>
          <button type="button" className={styles.close} aria-label="Close" onClick={onClose}><IconClose /></button>
        </div>
        <label className={styles.label} htmlFor="create-project-name">Project name</label>
        <input id="create-project-name" ref={inputRef} className={styles.input} placeholder="Final Essay" value={name} onChange={(event) => { setName(event.target.value); }} />
        <div className={styles.actions}>
          <Inert label="Create" className={styles.create} align="end">Create</Inert>
        </div>
      </div>
    </div>
  );
}
