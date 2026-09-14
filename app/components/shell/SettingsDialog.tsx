"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { cx } from "@/lib/cx";
import { THEME_CHOICES, type ThemeChoice } from "@/lib/theme";
import { Inert } from "./Inert";
import { IconAccount, IconArchive, IconClose, IconGeneral, IconMonitor, IconMoon, IconSun, IconUsage } from "./icons";
import styles from "./settings.module.css";

export interface SettingsDialogProps {
  readonly open: boolean;
  readonly choice: ThemeChoice;
  readonly onChoose: (choice: ThemeChoice) => void;
  readonly onClose: () => void;
}

/**
 * User menu › Settings (STORY_019; settings-general@1440 / -dark, narrow-settings-general@390): a modal with a left
 * nav (General, Account, Usage, Archived tasks) and the General section — Appearance (Light mode / Dark mode / System
 * cards; the chosen one outlined in the accent) and the two Preferences rows, rendered inert. At 390 it is a bottom
 * sheet with the nav as horizontal tabs and no ×: the backdrop closes it, as on the reference. The other sections are
 * nav entries that show the notice until the shell rebuild story fills them.
 */
export function SettingsDialog({ open, choice, onChoose, onClose }: SettingsDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    panelRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className={styles.backdrop} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }} data-testid="settings-backdrop">
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="settings-title" ref={panelRef} tabIndex={-1}>
        <nav className={styles.nav} aria-label="Settings">
          <span className={styles.navTitle}>Settings</span>
          <button type="button" className={cx(styles.navItem, styles.navItemActive)} aria-current="true">
            <IconGeneral /> General
          </button>
          <NavEntry icon={<IconAccount />} label="Account" />
          <NavEntry icon={<IconUsage />} label="Usage" />
          <NavEntry icon={<IconArchive />} label="Archived tasks" />
        </nav>
        <div className={styles.panel}>
          <div className={styles.panelHead}>
            <h2 id="settings-title" className={styles.panelTitle}>General</h2>
            <button type="button" className={styles.close} aria-label="Close settings" onClick={onClose}><IconClose /></button>
          </div>
          <div className={styles.panelBody}>
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
              <PreferenceRow
                title="Help improve our services"
                description="Allow your content to help improve our products and services. You can turn this off at any time."
                label="Help improve our services setting"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NavEntry({ icon, label }: { readonly icon: ReactNode; readonly label: string }) {
  return (
    <Inert role="button" label={label} className={styles.navItem}>
      {icon} {label}
    </Inert>
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
