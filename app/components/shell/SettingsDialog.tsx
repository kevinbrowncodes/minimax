"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cx } from "@/lib/cx";
import { THEME_CHOICES, type ThemeChoice } from "@/lib/theme";
import { Inert } from "./Inert";
import { IconArchive, IconChevronDown, IconClose, IconGeneral, IconMonitor, IconMoon, IconSearch, IconSun } from "./icons";
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

function SettingsBody({ choice, onChoose, onClose }: SettingsDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [section, setSection] = useState<SettingsSection>("General");
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
            <h2 id="settings-title" className={styles.panelTitle}>{section}</h2>
            <button type="button" className={styles.close} aria-label="Close settings" onClick={onClose}><IconClose /></button>
          </div>
          <div className={styles.panelBody}>
            {section === "General" ? <GeneralSection choice={choice} onChoose={onChoose} /> : null}
            {section === "Archived tasks" ? <ArchivedSection /> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function GeneralSection({ choice, onChoose }: { readonly choice: ThemeChoice; readonly onChoose: (choice: ThemeChoice) => void }) {
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
        />
      </div>
    </>
  );
}

/** settings-archived-tasks@1440: a search field and an All projects filter over an empty list. */
function ArchivedSection() {
  return (
    <>
      <div className={styles.archivedToolbar}>
        <label className={styles.searchField}>
          <IconSearch />
          <input className={styles.searchInput} placeholder="Search archived tasks" aria-label="Search archived tasks" />
        </label>
        <Inert label="All projects" className={styles.secondaryButton} align="end">All projects <IconChevronDown /></Inert>
      </div>
      <p className={styles.archivedEmpty}>No archived tasks.</p>
    </>
  );
}

function PreferenceRow({ title, description, label }: { readonly title: string; readonly description: string; readonly label: string }) {
  return (
    <div className={styles.preference}>
      <div className={styles.preferenceText}>
        <span className={styles.preferenceTitle}>{title}</span>
        <span className={styles.preferenceDescription}>{description}</span>
      </div>
      <Inert role="switch" ariaChecked label={label} className={styles.switch} align="end">
        <span className={styles.switchKnob} />
      </Inert>
    </div>
  );
}
