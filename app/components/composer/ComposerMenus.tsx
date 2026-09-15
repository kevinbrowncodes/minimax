"use client";
import { useState, type ReactNode } from "react";
import { cx } from "@/lib/cx";
import { Inert } from "@/components/shell/Inert";
import { IconChevronRight, IconMove, IconPlusCircle, IconProject, IconSettings } from "@/components/shell/icons";
import type { Project } from "@/lib/project-store";
import styles from "./menus.module.css";

/**
 * Menus the reference's composer opens (STORY_022): the + menu with its submenus and the MiniMax-M3 menu. STORY_026
 * removed the More chip's menu and the + menu's Plugins submenu; what is left is kept for the wiring epic (BACKLOG_007).
 */

const IconClip = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" aria-hidden="true"><path d="m10.5 5.5-4.6 4.6a1.6 1.6 0 0 0 2.3 2.3l5-5a3 3 0 0 0-4.3-4.3l-5.4 5.4a4.3 4.3 0 0 0 6.1 6.1l3.7-3.7" /></svg>
);
const IconSkill = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" aria-hidden="true"><rect x="2.5" y="2.5" width="11" height="11" rx="2" /><path d="M5.5 8h5M8 5.5v5" /></svg>
);
const IconKey = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" aria-hidden="true"><circle cx="5.5" cy="10.5" r="3" /><path d="m7.8 8.2 5.7-5.7M11 5l2 2M9.5 6.5l1.5 1.5" /></svg>
);

type Submenu = "project" | "skills";

export interface AttachMenuProps {
  /** In video mode, Add files or photos opens the reference-image chooser; elsewhere it shows the notice. */
  readonly onAddFiles?: () => void;
  readonly onClose: () => void;
  /** STORY_031 (behaviour-project-move-02-attach-add-to-project-submenu): No project ✓ · Add new project · the projects. */
  readonly projects: readonly Project[];
  readonly projectId: string | undefined;
  readonly onProject: (projectId: string | undefined) => void;
  readonly onNewProject: () => void;
}

/** attach-menu-open@1440 and its submenus: 190 px, 32 px entries; submenus 8 px to the right. */
export function AttachMenu({ onAddFiles, onClose, projects, projectId, onProject, onNewProject }: AttachMenuProps) {
  const [open, setOpen] = useState<Submenu | undefined>(undefined);
  const entry = (id: Submenu, icon: ReactNode, label: string, children: ReactNode) => (
    <div className={styles.entryWrap} onMouseEnter={() => { setOpen(id); }}>
      <button type="button" role="menuitem" aria-haspopup="menu" aria-expanded={open === id} className={cx(styles.item, open === id && styles.itemOpen)} onClick={() => { setOpen(open === id ? undefined : id); }}>
        <span className={styles.icon}>{icon}</span>
        <span className={styles.label}>{label}</span>
        <span className={styles.chevron}><IconChevronRight /></span>
      </button>
      {open === id ? <div className={cx(styles.menu, styles.submenu, id === "project" && styles.submenuWide)} role="menu" aria-label={label}>{children}</div> : null}
    </div>
  );
  return (
    <div className={styles.menu} role="menu" aria-label="Add attachment">
      {onAddFiles ? (
        <button type="button" role="menuitem" className={styles.item} onClick={() => { onClose(); onAddFiles(); }}>
          <span className={styles.icon}><IconClip /></span>
          <span className={styles.label}>Add files or photos</span>
        </button>
      ) : (
        <Inert role="menuitem" label="Add files or photos" className={styles.item}>
          <span className={styles.icon}><IconClip /></span>
          <span className={styles.label}>Add files or photos</span>
        </Inert>
      )}
      {entry("project", <IconMove />, "Add to project", (
        <>
          <button type="button" role="menuitemradio" aria-checked={projectId === undefined} className={styles.item} onClick={() => { onClose(); onProject(undefined); }}>
            <span className={styles.icon}><IconProject /></span>
            <span className={styles.label}>No project</span>
            {projectId === undefined ? <span className={styles.check} aria-hidden="true">✓</span> : null}
          </button>
          <button type="button" role="menuitem" className={styles.item} onClick={() => { onClose(); onNewProject(); }}>
            <span className={styles.icon}><IconPlusCircle /></span>
            <span className={styles.label}>Add new project</span>
          </button>
          {projects.length > 0 ? <div className={styles.separator} /> : null}
          {projects.map((project) => (
            <button key={project.id} type="button" role="menuitemradio" aria-checked={projectId === project.id} className={styles.item} onClick={() => { onClose(); onProject(project.id); }}>
              <span className={styles.icon}><IconProject /></span>
              <span className={styles.label}>{project.name}</span>
              {projectId === project.id ? <span className={styles.check} aria-hidden="true">✓</span> : null}
            </button>
          ))}
        </>
      ))}
      <div className={styles.separator} />
      {entry("skills", <IconSkill />, "Skills", (
        <>
          <span className={styles.note}>No skills installed</span>
          <div className={styles.separator} />
          <Inert role="menuitem" label="Manage skills" className={styles.item}><span className={styles.icon}><IconSettings /></span><span className={styles.label}>Manage skills</span></Inert>
          <Inert role="menuitem" label="Add skill" className={styles.item}><span className={styles.icon}><IconPlusCircle /></span><span className={styles.label}>Add skill</span></Inert>
        </>
      ))}
      <Inert role="menuitem" label="Environment variables" className={styles.item}>
        <span className={styles.icon}><IconKey /></span>
        <span className={styles.label}>Environment variables</span>
      </Inert>
    </div>
  );
}

const AGENT_MODELS = ["MiniMax-M3", "MiniMax-M2.7", "MiniMax-M2.7 HighSpeed"] as const;

/**
 * agent-model-menu-open@1440: 218 px, right-aligned; three models (M3 checked) and a Thinking switch. At 390
 * (narrow-agent-model-menu-open@390) the same entries are a "Select model" bottom sheet over a dimmed page with a ×.
 */
export function AgentModelMenu({ onClose }: { readonly onClose: () => void }) {
  return (
    <>
      <div className={styles.sheetBackdrop} onMouseDown={(event) => { event.stopPropagation(); onClose(); }} aria-hidden="true" />
      <div className={cx(styles.menu, styles.agentMenu)} role="menu" aria-label="Agent model">
        <div className={styles.sheetHead}>
          <span className={styles.sheetTitle}>Select model</span>
          <button type="button" className={styles.sheetClose} aria-label="Close" onClick={onClose}>×</button>
        </div>
        {AGENT_MODELS.map((label, i) => (
          <Inert key={label} role="menuitem" label={label} className={styles.item}>
            <span className={styles.check} aria-hidden="true">{i === 0 ? "✓" : ""}</span>
            <span className={styles.label}>{label}</span>
          </Inert>
        ))}
        <div className={styles.separator} />
        <div className={cx(styles.item, styles.itemStatic)}>
          <span className={styles.label}>Thinking</span>
          <Inert role="switch" ariaChecked label="Thinking" className={styles.switch} align="end"><span className={styles.switchKnob} /></Inert>
        </div>
      </div>
    </>
  );
}
