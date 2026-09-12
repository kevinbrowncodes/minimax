"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { activeRow, isUnread, type RecentEntry } from "@/lib/route-title";
import { cx } from "@/lib/cx";
import styles from "./sidebar.module.css";
import { IconAvatar, IconClock, IconCollapse, IconDownload, IconFolder, IconLogo, IconPhone, IconPlugins, IconPlusCircle, IconProject, IconSearch } from "./icons";

const INERT_TITLE = "Not part of MiniMax Local";

export interface SidebarProps {
  readonly pathname: string;
  readonly recents: readonly RecentEntry[];
  readonly onNavigate?: () => void;
  readonly onCollapse?: () => void;
}

function InertRow({ icon, label, muted = false }: { readonly icon?: ReactNode; readonly label: string; readonly muted?: boolean }) {
  return (
    <div className={cx(styles.row, styles.rowInert, muted && styles.rowMuted)} role="link" aria-disabled="true" title={INERT_TITLE}>
      {icon ? <span className={styles.rowIcon}>{icon}</span> : null}
      <span className={styles.rowLabel}>{label}</span>
    </div>
  );
}

export function Sidebar({ pathname, recents, onNavigate, onCollapse }: SidebarProps) {
  const active = activeRow(pathname);
  const link = (href: string, key: string, icon: ReactNode, label: string) => (
    <Link href={href} className={cx(styles.row, active === key && styles.rowActive)} aria-current={active === key ? "page" : undefined} onClick={onNavigate}>
      <span className={styles.rowIcon}>{icon}</span>
      <span className={styles.rowLabel}>{label}</span>
    </Link>
  );
  return (
    <nav className={styles.sidebar} aria-label="Sidebar">
      <div className={styles.head}>
        <span aria-label="MiniMax Local" className={styles.rowIcon}><IconLogo /></span>
        <button type="button" className={styles.iconButton} aria-label="Collapse sidebar" onClick={onCollapse}><IconCollapse /></button>
      </div>
      {link("/", "new-task", <IconPlusCircle />, "New task")}
      <InertRow icon={<IconSearch />} label="Search" />
      <InertRow icon={<IconPlugins />} label="Plugins" />
      <InertRow icon={<IconClock />} label="Scheduled" />
      {link("/assets", "assets", <IconFolder />, "Assets")}
      <InertRow icon={<IconPhone />} label="Connect Mobile" />

      <div className={styles.section}>
        <span className={styles.sectionLabel}>More</span>
        <InertRow label="MaxHermes" muted />
        <InertRow label="MaxClaw" muted />
      </div>
      <div className={styles.section}>
        <span className={styles.sectionLabel}>Projects</span>
        <InertRow icon={<IconProject />} label="Add new project" muted />
      </div>
      <div className={styles.section}>
        <span className={styles.sectionLabel}>Recents</span>
        {recents.length === 0 ? (
          <p className={styles.empty}>No task history.</p>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {recents.slice(0, 20).map((entry) => (
              <li key={entry.id}>
                <Link href={`/task/${encodeURIComponent(entry.id)}`} className={cx(styles.row, active === `task:${entry.id}` && styles.rowActive)} aria-current={active === `task:${entry.id}` ? "page" : undefined} onClick={onNavigate}>
                  <span className={styles.rowLabel}>{entry.title}</span>
                  {isUnread(entry) ? <span className={styles.dot} aria-label="New result" /> : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className={styles.section}>
        <span className={styles.sectionLabel}>Agent Team</span>
        <InertRow label="General" muted />
        <InertRow label="Coder" muted />
        <InertRow label="Verifier" muted />
      </div>
      <div className={styles.spacer} />
      <div className={styles.footer}>
        <span className={styles.user}><IconAvatar /> Owner</span>
        <span className={styles.iconButton} role="button" aria-disabled="true" title={INERT_TITLE} aria-label="Download desktop"><IconDownload /></span>
      </div>
    </nav>
  );
}
