"use client";
import { useState, type ReactNode } from "react";
import { cx } from "@/lib/cx";
import { Inert } from "@/components/shell/Inert";
import { IconChevronRight, IconMove, IconPlugins, IconPlusCircle, IconSettings } from "@/components/shell/icons";
import styles from "./menus.module.css";

/** Menus the reference's composer opens (STORY_022): the + menu with its submenus, the More chip's menu, the MiniMax-M3 menu. */

const IconClip = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" aria-hidden="true"><path d="m10.5 5.5-4.6 4.6a1.6 1.6 0 0 0 2.3 2.3l5-5a3 3 0 0 0-4.3-4.3l-5.4 5.4a4.3 4.3 0 0 0 6.1 6.1l3.7-3.7" /></svg>
);
const IconSkill = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" aria-hidden="true"><rect x="2.5" y="2.5" width="11" height="11" rx="2" /><path d="M5.5 8h5M8 5.5v5" /></svg>
);
const IconKey = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" aria-hidden="true"><circle cx="5.5" cy="10.5" r="3" /><path d="m7.8 8.2 5.7-5.7M11 5l2 2M9.5 6.5l1.5 1.5" /></svg>
);

type Submenu = "project" | "skills" | "plugins";

export interface AttachMenuProps {
  /** In video mode, Add files or photos opens the reference-image chooser; elsewhere it shows the notice. */
  readonly onAddFiles?: () => void;
  readonly onClose: () => void;
}

/** attach-menu-open@1440 and its three submenus: 190 px, 32 px entries; submenus 8 px to the right. */
export function AttachMenu({ onAddFiles, onClose }: AttachMenuProps) {
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
          <Inert role="menuitem" label="No project" className={styles.item}><span className={styles.label}>No project</span><span className={styles.check} aria-hidden="true">✓</span></Inert>
          <Inert role="menuitem" label="Add new project" className={styles.item}><span className={styles.icon}><IconPlusCircle /></span><span className={styles.label}>Add new project</span></Inert>
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
      {entry("plugins", <IconPlugins />, "Plugins", (
        <>
          <Inert role="menuitem" label="video-creator" className={styles.item}><span className={styles.icon}><IconPlugins /></span><span className={styles.label}>video-creator</span></Inert>
          <Inert role="menuitem" label="Add plugins" className={styles.item}><span className={styles.icon}><IconPlusCircle /></span><span className={styles.label}>Add plugins</span></Inert>
        </>
      ))}
      <Inert role="menuitem" label="Environment variables" className={styles.item}>
        <span className={styles.icon}><IconKey /></span>
        <span className={styles.label}>Environment variables</span>
      </Inert>
    </div>
  );
}

const MORE_MODES = ["Spreadsheet", "AI PPT", "Research Report", "Education", "Scheduled Tasks"] as const;

/** mode-more-open@1440: 181 px, five 36 px entries. */
export function ModeMenu() {
  return (
    <div className={cx(styles.menu, styles.moreMenu)} role="menu" aria-label="More modes">
      {MORE_MODES.map((label) => (
        <Inert key={label} role="menuitem" label={label} className={cx(styles.item, styles.itemTall)}>
          <span className={styles.label}>{label}</span>
        </Inert>
      ))}
    </div>
  );
}

const AGENT_MODELS = ["MiniMax-M3", "MiniMax-M2.7", "MiniMax-M2.7 HighSpeed"] as const;

/** agent-model-menu-open@1440: 218 px, right-aligned; three models (M3 checked) and a Thinking switch. */
export function AgentModelMenu() {
  return (
    <div className={cx(styles.menu, styles.agentMenu)} role="menu" aria-label="Agent model">
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
  );
}
