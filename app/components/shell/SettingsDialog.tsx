"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cx } from "@/lib/cx";
import type { Project } from "@/lib/project-store";
import { formatArchivedAt, groupByProject, recentLabel, searchRecents } from "@/lib/recents";
import type { RecentEntry } from "@/lib/route-title";
import { THEME_CHOICES, type ThemeChoice } from "@/lib/theme";
import { useNarrow } from "@/lib/use-narrow";
import { Inert } from "./Inert";
import { IconArchive, IconChevronDown, IconClose, IconFolder, IconGeneral, IconMonitor, IconMoon, IconSearch, IconSun, IconTrash } from "./icons";
import styles from "./settings.module.css";

/** General and Archived tasks; STORY_026 removed the reference's Account and Usage (no accounts, plans or credits locally). */
export type SettingsSection = "General" | "Archived tasks";
const SECTIONS: readonly { readonly id: SettingsSection; readonly icon: ReactNode }[] = [
  { id: "General", icon: <IconGeneral /> },
  { id: "Archived tasks", icon: <IconArchive /> },
];

export interface SettingsDialogProps {
  readonly open: boolean;
  readonly choice: ThemeChoice;
  readonly onChoose: (choice: ThemeChoice) => void;
  readonly onClose: () => void;
  /** STORY_030: the section to open on (the archive toast's Settings link lands on Archived tasks). */
  readonly initialSection?: SettingsSection;
  /** STORY_030: Archived tasks — the archived entries (newest archive first) and their Unarchive / trash / Delete all. */
  readonly archived?: readonly RecentEntry[];
  readonly onUnarchive?: (entry: RecentEntry) => void;
  readonly onDeleteArchived?: (entry: RecentEntry) => void;
  readonly onDeleteAllArchived?: () => void;
  /** STORY_031: the projects — the archived list groups by them and the All projects filter narrows to one. */
  readonly projects?: readonly Project[];
  /** STORY_034: General › the watermark switch — the server-wide setting and its change; without a handler the switch keeps the notice. */
  readonly removeWatermark?: boolean;
  readonly onRemoveWatermark?: (value: boolean) => void;
}

/**
 * User menu › Settings (STORY_019; settings-general@1440 / -dark, narrow-settings-general@390): a modal with a left
 * nav (General, Archived tasks) and the General section — Appearance (Light mode / Dark mode / System
 * cards; the chosen one outlined in the accent) and the watermark Preferences row (STORY_028 removed the consent one). At 390 it is a bottom
 * sheet with the nav as horizontal tabs and no ×: the backdrop closes it, as on the reference. The other sections are
 * nav entries that show the notice until the shell rebuild story fills them.
 */
export function SettingsDialog(props: SettingsDialogProps) {
  // Mounted only while open, so every opening starts on General without an effect.
  if (!props.open) return null;
  return <SettingsBody {...props} />;
}

function SettingsBody({ choice, onChoose, onClose, initialSection = "General", archived = [], onUnarchive, onDeleteArchived, onDeleteAllArchived, projects = [], removeWatermark = true, onRemoveWatermark }: SettingsDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [section, setSection] = useState<SettingsSection>(initialSection);
  const narrow = useNarrow();
  // behaviour-recents-archive-03: Delete all sits beside the title; at 390 the head is hidden, so it joins the toolbar
  const deleteAll = section === "Archived tasks" && archived.length > 0 ? (
    <button type="button" className={styles.deleteAll} onClick={onDeleteAllArchived}><IconTrash /> Delete all</button>
  ) : null;
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    panelRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);
  return (
    <div className={styles.backdrop} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }} data-testid="settings-backdrop">
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="settings-title" ref={panelRef} tabIndex={-1}>
        <nav className={styles.nav} aria-label="Settings">
          <span className={styles.navTitle}>Settings</span>
          <div className={styles.navItems}>
            {SECTIONS.map((s) => (
              <button key={s.id} type="button" className={cx(styles.navItem, section === s.id && styles.navItemActive)} aria-current={section === s.id ? "true" : undefined} onClick={() => { setSection(s.id); }}>
                {s.icon} {s.id}
              </button>
            ))}
          </div>
        </nav>
        <div className={styles.panel}>
          <div className={styles.panelHead}>
            <div className={styles.panelHeadLeft}>
              <h2 id="settings-title" className={styles.panelTitle}>{section}</h2>
              {narrow ? null : deleteAll}
            </div>
            <button type="button" className={styles.close} aria-label="Close settings" onClick={onClose}><IconClose /></button>
          </div>
          <div className={styles.panelBody}>
            {section === "General" ? <GeneralSection choice={choice} onChoose={onChoose} removeWatermark={removeWatermark} onRemoveWatermark={onRemoveWatermark} /> : null}
            {section === "Archived tasks" ? <ArchivedSection entries={archived} projects={projects} onUnarchive={onUnarchive} onDelete={onDeleteArchived} toolbarExtra={narrow ? deleteAll : null} /> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function GeneralSection({ choice, onChoose, removeWatermark, onRemoveWatermark }: { readonly choice: ThemeChoice; readonly onChoose: (choice: ThemeChoice) => void; readonly removeWatermark: boolean; readonly onRemoveWatermark?: (value: boolean) => void }) {
  return (
    <>
      <h3 className={styles.sectionTitle}>Appearance</h3>
      <div className={styles.options} role="radiogroup" aria-label="Appearance">
        {THEME_CHOICES.map((option) => (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={choice === option.id}
            className={styles.option}
            onClick={() => {
              onChoose(option.id);
            }}
          >
            <span className={cx(styles.preview, styles[`preview_${option.id}`], choice === option.id && styles.previewSelected)} aria-hidden="true">
              <span className={styles.previewCard}>
                <span className={styles.previewLine} />
                <span className={styles.previewLineShort} />
                <span className={styles.previewDot} />
              </span>
            </span>
            <span className={styles.optionLabel}>
              {option.id === "light" ? <IconSun /> : option.id === "dark" ? <IconMoon /> : <IconMonitor />}
              {option.label}
            </span>
          </button>
        ))}
      </div>
      <h3 className={styles.sectionTitle}>Preferences</h3>
      <div className={styles.preferences}>
        <PreferenceRow
          title={'Remove an "AI-generated" watermark'}
          description="When off, downloads will include a visible AI-generated watermark. To remove this watermark, please confirm that your generated content does not involve deepfakes—that is, media that convincingly mimics reality and creates a false impression of authenticity."
          label="Remove watermark setting"
          checked={removeWatermark}
          onToggle={onRemoveWatermark}
        />
      </div>
    </>
  );
}

interface ArchivedSectionProps {
  readonly entries: readonly RecentEntry[];
  readonly projects: readonly Project[];
  readonly onUnarchive?: (entry: RecentEntry) => void;
  readonly onDelete?: (entry: RecentEntry) => void;
  readonly toolbarExtra?: ReactNode;
}

/**
 * settings-archived-tasks@1440 (the chrome) and behaviour-recents-archive-03…05 (STORY_030): a search field that filters
 * live, the All projects filter (inert until STORY_031), the rows under a **No project** folder heading — the stamp and
 * title, the archive time, a trash and **Unarchive** — "No archived tasks." when nothing is archived, "No archived tasks
 * match." when the search finds nothing.
 */
function ArchivedSection({ entries, projects, onUnarchive, onDelete, toolbarExtra }: ArchivedSectionProps) {
  const [query, setQuery] = useState("");
  // STORY_031: "all", "none" (No project) or a project's id
  const [projectFilter, setProjectFilter] = useState("all");
  const searched = searchRecents(entries, query);
  const shown = projectFilter === "all" ? searched : projectFilter === "none" ? searched.filter((e) => e.projectId === undefined || !projects.some((p) => p.id === e.projectId)) : searched.filter((e) => e.projectId === projectFilter);
  const groups = groupByProject(shown, projects);
  return (
    <>
      <div className={styles.archivedToolbar}>
        <label className={styles.searchField}>
          <IconSearch />
          <input className={styles.searchInput} placeholder="Search archived tasks" aria-label="Search archived tasks" value={query} onChange={(event) => { setQuery(event.target.value); }} />
        </label>
        <span className={styles.selectWrap}>
          <select className={cx(styles.secondaryButton, styles.select)} aria-label="Project filter" value={projectFilter} onChange={(event) => { setProjectFilter(event.target.value); }}>
            <option value="all">All projects</option>
            <option value="none">No project</option>
            {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
          <IconChevronDown />
        </span>
        {toolbarExtra}
      </div>
      {entries.length === 0 ? (
        <p className={styles.archivedEmpty}>No archived tasks.</p>
      ) : shown.length === 0 ? (
        <p className={styles.archivedEmpty}>No archived tasks match.</p>
      ) : (
        groups.map((group) => (
        <section key={group.id ?? "none"} className={styles.archivedGroup} aria-label={group.name}>
          <h3 className={styles.archivedGroupTitle}><IconFolder /> {group.name}</h3>
          <ul className={styles.archivedList}>
            {group.entries.map((entry) => (
              <li key={entry.id} className={styles.archivedRow} data-testid="archived-row">
                <div className={styles.archivedText}>
                  <span className={styles.archivedTitle} title={entry.title}><span className={styles.archivedStamp}>{recentLabel(entry)}</span> — {entry.title}</span>
                  <span className={styles.archivedDate}>{formatArchivedAt(entry.archivedAt)}</span>
                </div>
                <div className={styles.archivedActions}>
                  <button type="button" className={styles.iconButton} aria-label={`Delete ${entry.title}`} onClick={() => onDelete?.(entry)}><IconTrash /></button>
                  <button type="button" className={styles.secondaryButton} aria-label={`Unarchive ${entry.title}`} onClick={() => onUnarchive?.(entry)}>Unarchive</button>
                </div>
              </li>
            ))}
          </ul>
        </section>
        ))
      )}
    </>
  );
}

/** A Preferences row (settings-general@1440). STORY_034: with a handler the switch is real — on = the accent track, knob right; off = the grey track, knob left. */
function PreferenceRow({ title, description, label, checked, onToggle }: { readonly title: string; readonly description: string; readonly label: string; readonly checked: boolean; readonly onToggle?: (value: boolean) => void }) {
  return (
    <div className={styles.preference}>
      <div className={styles.preferenceText}>
        <span className={styles.preferenceTitle}>{title}</span>
        <span className={styles.preferenceDescription}>{description}</span>
      </div>
      {onToggle ? (
        <button type="button" role="switch" aria-checked={checked} aria-label={label} className={cx(styles.switch, !checked && styles.switchOff)} onClick={() => { onToggle(!checked); }}>
          <span className={styles.switchKnob} />
        </button>
      ) : (
        <Inert role="switch" ariaChecked={checked} label={label} className={styles.switch} align="end">
          <span className={styles.switchKnob} />
        </Inert>
      )}
    </div>
  );
}
