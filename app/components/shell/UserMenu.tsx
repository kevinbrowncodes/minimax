"use client";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { cx } from "@/lib/cx";
import { Inert } from "./Inert";
import { IconAvatar, IconBook, IconChart, IconChevronRight, IconGift, IconHeadset, IconLogout, IconSettings, IconSwitchBack } from "./icons";
import styles from "./user-menu.module.css";

export interface UserMenuProps {
  readonly onOpenSettings: () => void;
}

/**
 * The footer chip and its menu (STORY_019; user-menu-open@1440 / -dark, narrow-user-menu-open@390): the account row,
 * the plan row, then Switch to classic, Settings, Daily check-in ›, Usage ›, Contact us ›, Learn more ›, Logout. Only
 * Settings does something here — it holds the Appearance choice; every other entry is the reference's control rendered
 * inert with the notice. Escape and a click outside close the menu.
 */
export function UserMenu({ onOpenSettings }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => {
    setOpen(false);
  }, []);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") close();
    };
    const onPointer = (event: MouseEvent): void => {
      if (rootRef.current && event.target instanceof Node && !rootRef.current.contains(event.target)) close();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onPointer);
    };
  }, [open, close]);

  return (
    <div className={styles.root} ref={rootRef}>
      <button type="button" className={styles.chip} aria-haspopup="menu" aria-expanded={open} aria-label="Owner" onClick={() => {
          setOpen((o) => !o);
        }}
      >
        <IconAvatar /> Owner
      </button>
      {open ? (
        <div className={styles.menu} role="menu" aria-label="User menu">
          <div className={styles.uid}>UID : local</div>
          <div className={styles.plan}>
            <span className={styles.planName}>Default</span>
            <Inert className={styles.subscribe} label="Subscribe">Subscribe</Inert>
          </div>
          <div className={styles.separator} />
          <Entry icon={<IconSwitchBack />} label="Switch to classic" />
          <div className={styles.separator} />
          <button
            type="button"
            role="menuitem"
            className={styles.entry}
            onClick={() => {
              close();
              onOpenSettings();
            }}
          >
            <span className={styles.entryIcon}><IconSettings /></span>
            <span className={styles.entryLabel}>Settings</span>
          </button>
          <Entry icon={<IconGift />} label="Daily check-in" submenu />
          <Entry icon={<IconChart />} label="Usage" submenu />
          <div className={styles.separator} />
          <Entry icon={<IconHeadset />} label="Contact us" submenu />
          <Entry icon={<IconBook />} label="Learn more" submenu />
          <Entry icon={<IconLogout />} label="Logout" />
        </div>
      ) : null}
    </div>
  );
}

function Entry({ icon, label, submenu = false }: { readonly icon: ReactNode; readonly label: string; readonly submenu?: boolean }) {
  return (
    <Inert role="menuitem" label={label} className={cx(styles.entry, styles.entryInert)}>
      <span className={styles.entryIcon}>{icon}</span>
      <span className={styles.entryLabel}>{label}</span>
      {submenu ? <span className={styles.entryChevron}><IconChevronRight /></span> : null}
    </Inert>
  );
}
