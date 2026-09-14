"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cx } from "@/lib/cx";
import { THEME_CHOICES, type ThemeChoice } from "@/lib/theme";
import { Inert } from "./Inert";
import { IconAccount, IconArchive, IconAvatar, IconChevronDown, IconClose, IconExternal, IconGeneral, IconInfo, IconMonitor, IconMoon, IconPencil, IconSearch, IconSun, IconUsage } from "./icons";
import styles from "./settings.module.css";

export type SettingsSection = "General" | "Account" | "Usage" | "Archived tasks";
const SECTIONS: readonly { readonly id: SettingsSection; readonly icon: ReactNode }[] = [
  { id: "General", icon: <IconGeneral /> },
  { id: "Account", icon: <IconAccount /> },
  { id: "Usage", icon: <IconUsage /> },
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
 * nav (General, Account, Usage, Archived tasks) and the General section — Appearance (Light mode / Dark mode / System
 * cards; the chosen one outlined in the accent) and the two Preferences rows, rendered inert. At 390 it is a bottom
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
            <h2 id="settings-title" className={styles.panelTitle}>
              {section}
              {section === "Usage" ? <Inert label="About usage resources" className={styles.infoIcon}><IconInfo /></Inert> : null}
            </h2>
            <button type="button" className={styles.close} aria-label="Close settings" onClick={onClose}><IconClose /></button>
          </div>
          <div className={styles.panelBody}>
            {section === "General" ? <GeneralSection choice={choice} onChoose={onChoose} /> : null}
            {section === "Account" ? <AccountSection /> : null}
            {section === "Usage" ? <UsageSection /> : null}
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
        <PreferenceRow
          title="Help improve our services"
          description="Allow your content to help improve our products and services. You can turn this off at any time."
          label="Help improve our services setting"
        />
      </div>
    </>
  );
}

/** settings-account@1440: avatar, nickname, the Password row, Delete account / Cancel / Save — all inert (no account locally). */
function AccountSection() {
  return (
    <div className={styles.account}>
      <div className={styles.accountIdentity}>
        <Inert label="Edit avatar" className={styles.avatar}><IconAvatar /></Inert>
        <span className={styles.nickname}>
          Owner <Inert label="Edit nickname" className={styles.nicknameEdit}><IconPencil /></Inert>
        </span>
      </div>
      <div className={styles.preferences}>
        <div className={styles.preference}>
          <div className={styles.preferenceText}>
            <span className={styles.preferenceTitle}>Password</span>
            <span className={styles.preferenceDescription}>You can update your password to better secure your account.</span>
          </div>
          <Inert label="Manage" className={styles.secondaryButton} align="end">Manage</Inert>
        </div>
      </div>
      <div className={styles.accountFooter}>
        <Inert label="Delete account" className={styles.dangerButton}>Delete account</Inert>
        <span className={styles.accountFooterRight}>
          <Inert label="Cancel" className={styles.secondaryButton} align="end">Cancel</Inert>
          <Inert label="Save" className={cx(styles.primaryButton, styles.primaryButtonInactive)} align="end">Save</Inert>
        </span>
      </div>
    </div>
  );
}

/** settings-usage@1440: Your plan, Credits, Invoice — the reference's copy as static text; every control inert. */
function UsageSection() {
  return (
    <>
      <h3 className={styles.sectionTitle}>Your plan</h3>
      <div className={styles.preferences}>
        <div className={styles.preference}>
          <div className={styles.preferenceText}>
            <span className={styles.preferenceTitle}>Token Plan</span>
            <span className={styles.preferenceDescription}>No Token Plan subscribed</span>
          </div>
          <Inert label="Subscribe" className={styles.secondaryButton} align="end">Subscribe</Inert>
        </div>
        <div className={styles.preference}>
          <div className={styles.preferenceText}>
            <span className={styles.preferenceTitle}>Credits</span>
            <span className={styles.preferenceDescription}>0 + 400</span>
          </div>
          <span className={styles.buttonRow}>
            <Inert label="Recharge" className={styles.secondaryButton} align="end">Recharge</Inert>
            <Inert label="Manage" className={styles.secondaryButton} align="end">Manage <IconChevronDown /></Inert>
          </span>
        </div>
      </div>
      <h3 className={cx(styles.sectionTitle, styles.sectionTitleWithIcon)}>Credits <Inert label="About credit usage" className={styles.infoIcon}><IconInfo /></Inert></h3>
      <div className={styles.preferences}>
        <div className={styles.preference}>
          <div className={styles.preferenceText}>
            <span className={styles.preferenceTitle}>When enabled, credits (including gifted credits) will be applied to chat usage.</span>
          </div>
          <Inert role="switch" ariaChecked label="Use Credits after Token Plan limit" className={cx(styles.switch, styles.switchSmall)} align="end"><span className={styles.switchKnob} /></Inert>
        </div>
      </div>
      <h3 className={styles.sectionTitle}>Invoice</h3>
      <div className={styles.preferences}>
        <div className={styles.preference}>
          <div className={styles.preferenceText}>
            <span className={styles.preferenceTitle}>Please request invoices through the MiniMax Open Platform.</span>
          </div>
          <Inert label="Request" className={styles.secondaryButton} align="end">Request <IconExternal /></Inert>
        </div>
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
