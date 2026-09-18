"use client";
import { useState, type ReactNode } from "react";
import { cx } from "@/lib/cx";
import { Inert } from "@/components/shell/Inert";
import { IconChevronRight, IconMove, IconPlusCircle, IconProject, IconSettings } from "@/components/shell/icons";
import type { Project } from "@/lib/project-store";
import type { Skill } from "@/lib/skills";
import { agentSkillLabel, type AgentSkill } from "@/lib/composer-state";
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
/** STORY_054: the one second-level submenu — Templates, inside Skills. */
type Nested = "templates";

export interface AttachMenuProps {
  /** In video mode, Add files or photos opens the reference-image chooser; elsewhere it shows the notice. */
  readonly onAddFiles?: () => void;
  readonly onClose: () => void;
  /** STORY_031 (behaviour-project-move-02-attach-add-to-project-submenu): No project ✓ · Add new project · the projects. */
  readonly projects: readonly Project[];
  readonly projectId: string | undefined;
  readonly onProject: (projectId: string | undefined) => void;
  readonly onNewProject: () => void;
  /** STORY_035: Environment variables opens the dialog; without a handler it keeps the notice. */
  readonly onEnv?: () => void;
  /** STORY_040: the templates (under Skills › Templates since STORY_054) — each drops its text into the composer; Manage skills and Add template open Management › Skills. */
  readonly skills?: readonly Skill[];
  readonly onUseSkill?: (skill: Skill) => void;
  readonly onManageSkills?: (create: boolean) => void;
  /** STORY_054: the director skills as radio rows — picking one sets the agent's skill and turns the chip on. */
  readonly directors?: readonly AgentSkill[];
  readonly agentSkillId?: string;
  readonly onPickDirector?: (id: string) => void;
  /** Text mode or extend mode: the director rows are disabled with the chip's own reason. */
  readonly directorsDisabledReason?: string;
}

/** attach-menu-open@1440 and its submenus: 190 px, 32 px entries; submenus 8 px to the right. */
export function AttachMenu({ onAddFiles, onClose, projects, projectId, onProject, onNewProject, onEnv, skills = [], onUseSkill, onManageSkills, directors = [], agentSkillId, onPickDirector, directorsDisabledReason }: AttachMenuProps) {
  const [open, setOpen] = useState<Submenu | undefined>(undefined);
  const [nested, setNested] = useState<Nested | undefined>(undefined);
  const entry = (id: Submenu, icon: ReactNode, label: string, children: ReactNode) => (
    <div className={styles.entryWrap} onMouseEnter={() => { setOpen(id); setNested(undefined); }}>
      {/* a click opens (never toggles): the pointer's hover has often opened it already, and a tap at 390 would close it again (STORY_040) */}
      <button type="button" role="menuitem" aria-haspopup="menu" aria-expanded={open === id} className={cx(styles.item, open === id && styles.itemOpen)} onClick={() => { setOpen(id); }}>
        <span className={styles.icon}>{icon}</span>
        <span className={styles.label}>{label}</span>
        <span className={styles.chevron}><IconChevronRight /></span>
      </button>
      {open === id ? <div className={cx(styles.menu, styles.submenu, id === "project" && styles.submenuWide)} role="menu" aria-label={label}>{children}</div> : null}
    </div>
  );
  // STORY_054: the same shape one level down (Templates inside Skills); at 390 it opens under its row as the first level does
  const nestedEntry = (id: Nested, icon: ReactNode, label: string, children: ReactNode) => (
    <div className={styles.entryWrap} onMouseEnter={() => { setNested(id); }}>
      <button type="button" role="menuitem" aria-haspopup="menu" aria-expanded={nested === id} className={cx(styles.item, nested === id && styles.itemOpen)} onClick={() => { setNested(id); }}>
        <span className={styles.icon}>{icon}</span>
        <span className={styles.label}>{label}</span>
        <span className={styles.chevron}><IconChevronRight /></span>
      </button>
      {nested === id ? <div className={cx(styles.menu, styles.submenu)} role="menu" aria-label={label}>{children}</div> : null}
    </div>
  );
  const chosenDirector = directors.find((d) => d.id === agentSkillId)?.id ?? directors[0]?.id;
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
          {/* STORY_054: the director skills the agent can follow — radio rows; the chosen one checked */}
          {directors.length === 0 ? (
            <span className={styles.note}>No director skills</span>
          ) : (
            directors.map((director) => {
              const disabled = directorsDisabledReason !== undefined || onPickDirector === undefined;
              return (
                <button key={director.id} type="button" role="menuitemradio" aria-checked={director.id === chosenDirector} aria-disabled={disabled ? true : undefined} className={cx(styles.item, disabled && styles.itemDisabled)} title={directorsDisabledReason ?? director.description} onClick={() => { if (disabled) return; onClose(); onPickDirector(director.id); }}>
                  <span className={styles.icon}><IconSkill /></span>
                  <span className={styles.label}>{agentSkillLabel(director)}</span>
                  {director.id === chosenDirector ? <span className={styles.check} aria-hidden="true">✓</span> : null}
                </button>
              );
            })
          )}
          <div className={styles.separator} />
          {nestedEntry("templates", <IconSkill />, "Templates", (
            onUseSkill && skills.length > 0 ? (
              skills.map((skill) => (
                <button key={skill.id} type="button" role="menuitem" className={styles.item} title={skill.description} onClick={() => { onClose(); onUseSkill(skill); }}>
                  <span className={styles.icon}><IconSkill /></span>
                  <span className={styles.label}>{skill.name}</span>
                </button>
              ))
            ) : (
              <span className={styles.note}>No templates</span>
            )
          ))}
          <div className={styles.separator} />
          {onManageSkills ? (
            <>
              <button type="button" role="menuitem" className={styles.item} onClick={() => { onClose(); onManageSkills(false); }}><span className={styles.icon}><IconSettings /></span><span className={styles.label}>Manage skills</span></button>
              <button type="button" role="menuitem" className={styles.item} onClick={() => { onClose(); onManageSkills(true); }}><span className={styles.icon}><IconPlusCircle /></span><span className={styles.label}>Add template</span></button>
            </>
          ) : (
            <>
              <Inert role="menuitem" label="Manage skills" className={styles.item}><span className={styles.icon}><IconSettings /></span><span className={styles.label}>Manage skills</span></Inert>
              <Inert role="menuitem" label="Add template" className={styles.item}><span className={styles.icon}><IconPlusCircle /></span><span className={styles.label}>Add template</span></Inert>
            </>
          )}
        </>
      ))}
      {onEnv ? (
        <button type="button" role="menuitem" className={styles.item} onClick={() => { onClose(); onEnv(); }}>
          <span className={styles.icon}><IconKey /></span>
          <span className={styles.label}>Environment variables</span>
        </button>
      ) : (
        <Inert role="menuitem" label="Environment variables" className={styles.item}>
          <span className={styles.icon}><IconKey /></span>
          <span className={styles.label}>Environment variables</span>
        </Inert>
      )}
    </div>
  );
}

const AGENT_MODELS = ["MiniMax-M3", "MiniMax-M2.7", "MiniMax-M2.7 HighSpeed"] as const;

/**
 * agent-model-menu-open@1440: 218 px, right-aligned; three models (M3 checked) and a Thinking switch. At 390
 * (narrow-agent-model-menu-open@390) the same entries are a "Select model" bottom sheet over a dimmed page with a ×.
 */
export function AgentModelMenu({ onClose, model }: { readonly onClose: () => void; readonly model?: { readonly id: string; readonly label: string } }) {
  return (
    <>
      <div className={styles.sheetBackdrop} onMouseDown={(event) => { event.stopPropagation(); onClose(); }} aria-hidden="true" />
      <div className={cx(styles.menu, styles.agentMenu)} role="menu" aria-label="Agent model">
        <div className={styles.sheetHead}>
          <span className={styles.sheetTitle}>Select model</span>
          <button type="button" className={styles.sheetClose} aria-label="Close" onClick={onClose}>×</button>
        </div>
        {model ? (
          // STORY_050: while the Agent chip is on the pill names the model we run — one row, checked, no Thinking switch (STORY_026's rule)
          <button type="button" role="menuitemradio" aria-checked className={styles.item} title={model.id} onClick={onClose}>
            <span className={styles.check} aria-hidden="true">✓</span>
            <span className={styles.label}>{model.label}</span>
          </button>
        ) : null}
        {model ? null : AGENT_MODELS.map((label, i) => (
          <Inert key={label} role="menuitem" label={label} className={styles.item}>
            <span className={styles.check} aria-hidden="true">{i === 0 ? "✓" : ""}</span>
            <span className={styles.label}>{label}</span>
          </Inert>
        ))}
        {model ? null : (
          <>
            <div className={styles.separator} />
            <div className={cx(styles.item, styles.itemStatic)}>
              <span className={styles.label}>Thinking</span>
              <Inert role="switch" ariaChecked label="Thinking" className={styles.switch} align="end"><span className={styles.switchKnob} /></Inert>
            </div>
          </>
        )}
      </div>
    </>
  );
}
