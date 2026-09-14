"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { hasMoreRecents, visibleRecents } from "@/lib/recents";
import { activeRow, isUnread, type RecentEntry } from "@/lib/route-title";
import { DEFAULT_SHELL_PREFS, type Section, type ShellPrefs } from "@/lib/shell-prefs";
import { cx } from "@/lib/cx";
import styles from "./sidebar.module.css";
import { Inert } from "./Inert";
import { InboxPopover } from "./InboxPopover";
import { UserMenu } from "./UserMenu";
import {
  IconArchive,
  IconAvatar,
  IconBell,
  IconChevronDown,
  IconClock,
  IconClose,
  IconCollapse,
  IconCopy,
  IconDownload,
  IconFolder,
  IconLogo,
  IconMore,
  IconMove,
  IconPhone,
  IconPin,
  IconPlugins,
  IconPlusCircle,
  IconProject,
  IconRename,
  IconSearch,
  IconTrash,
} from "./icons";

export interface SidebarProps {
  readonly pathname: string;
  readonly recents: readonly RecentEntry[];
  readonly prefs?: ShellPrefs;
  /** The 52 px icon rail (STORY_021, sidebar-collapsed@1440): icons only, no sections, the logo expands. */
  readonly rail?: boolean;
  readonly onNavigate?: () => void;
  readonly onCollapse?: () => void;
  readonly onExpand?: () => void;
  readonly onToggleSection?: (section: Section) => void;
  readonly onDismissGuide?: () => void;
  readonly onOpenSettings?: () => void;
  readonly onOpenSearch?: () => void;
  readonly onOpenCreateProject?: () => void;
  readonly onDeleteRecent?: (entry: RecentEntry) => void;
}

/** A sidebar row the reference has and we do not implement: looks like the others, answers a click with the notice (STORY_019). */
function InertRow({ icon, label, muted = false }: { readonly icon?: ReactNode; readonly label: string; readonly muted?: boolean }) {
  return (
    <Inert role="link" label={label} className={cx(styles.row, styles.rowInert, muted && styles.rowMuted)}>
      {icon ? <span className={styles.rowIcon}>{icon}</span> : null}
      <span className={styles.rowLabel}>{label}</span>
    </Inert>
  );
}

/** A row that opens something of ours (the Search and Create project dialogs, STORY_021). */
function ActionRow({ icon, label, muted = false, onClick }: { readonly icon?: ReactNode; readonly label: string; readonly muted?: boolean; readonly onClick: () => void }) {
  return (
    <button type="button" className={cx(styles.row, muted && styles.rowMuted)} onClick={onClick}>
      {icon ? <span className={styles.rowIcon}>{icon}</span> : null}
      <span className={styles.rowLabel}>{label}</span>
    </button>
  );
}

/** More / Projects / Recents: a header button that folds its section (STORY_021; sidebar-more-expanded@1440). */
function SectionHeader({ label, section, folded, onToggle }: { readonly label: string; readonly section: Section; readonly folded: boolean; readonly onToggle?: (section: Section) => void }) {
  return (
    <button type="button" className={styles.sectionHeader} aria-expanded={!folded} onClick={() => onToggle?.(section)}>
      <span>{label}</span>
      <span className={cx(styles.sectionChevron, !folded && styles.sectionChevronOpen)} aria-hidden="true"><IconChevronDown /></span>
    </button>
  );
}

const MENU_ENTRIES: readonly { readonly label: string; readonly icon: ReactNode; readonly submenu?: boolean }[] = [
  { label: "Rename", icon: <IconRename /> },
  { label: "Pin", icon: <IconPin /> },
  { label: "Copy conversation ID", icon: <IconCopy /> },
  { label: "Move to project", icon: <IconMove />, submenu: true },
];

/** A Recents row (STORY_021; recents-row-menu-open@1440): dot, title, hover Pin + ⋯, the ⋯ menu; Delete is ours. */
function RecentRow({ entry, active, onNavigate, onDelete }: { readonly entry: RecentEntry; readonly active: boolean; readonly onNavigate?: () => void; readonly onDelete?: (entry: RecentEntry) => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef<HTMLLIElement>(null);
  const close = useCallback(() => {
    setMenuOpen(false);
  }, []);
  useEffect(() => {
    if (!menuOpen) return undefined;
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
  }, [menuOpen, close]);
  const unread = isUnread(entry);
  return (
    <li ref={rootRef} className={cx(styles.recent, menuOpen && styles.recentMenuOpen)}>
      <Link href={`/task/${encodeURIComponent(entry.id)}`} className={cx(styles.row, styles.recentLink, active && styles.rowActive)} aria-current={active ? "page" : undefined} onClick={onNavigate}>
        <span className={cx(styles.dot, unread ? styles.dotUnread : styles.dotRead)} aria-label={unread ? "New result" : undefined} />
        <span className={styles.rowLabel}>{entry.title}</span>
      </Link>
      <span className={styles.recentActions}>
        <Inert label="Pin" className={styles.recentAction}><IconPin /></Inert>
        <button type="button" className={styles.recentAction} aria-label={`More actions for ${entry.title}`} aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => { setMenuOpen((o) => !o); }}>
          <IconMore />
        </button>
      </span>
      {menuOpen ? (
        <div className={styles.menu} role="menu" aria-label={`Actions for ${entry.title}`}>
          {MENU_ENTRIES.map((m) => (
            <Inert key={m.label} role="menuitem" label={m.label} className={styles.menuItem}>
              <span className={styles.menuIcon}>{m.icon}</span>
              <span className={styles.menuLabel}>{m.label}</span>
              {m.submenu ? <span className={styles.menuChevron} aria-hidden="true">›</span> : null}
            </Inert>
          ))}
          <div className={styles.menuSeparator} />
          <Inert role="menuitem" label="Archive" className={styles.menuItem}>
            <span className={styles.menuIcon}><IconArchive /></span>
            <span className={styles.menuLabel}>Archive</span>
          </Inert>
          <button
            type="button"
            role="menuitem"
            className={cx(styles.menuItem, styles.menuDanger)}
            onClick={() => {
              close();
              onDelete?.(entry);
            }}
          >
            <span className={styles.menuIcon}><IconTrash /></span>
            <span className={styles.menuLabel}>Delete</span>
          </button>
        </div>
      ) : null}
    </li>
  );
}

export function Sidebar({ pathname, recents, prefs = DEFAULT_SHELL_PREFS, rail = false, onNavigate, onCollapse, onExpand, onToggleSection, onDismissGuide, onOpenSettings, onOpenSearch, onOpenCreateProject, onDeleteRecent }: SidebarProps) {
  const active = activeRow(pathname);
  const [showAll, setShowAll] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);

  if (rail) {
    const pill = (href: string, key: string, icon: ReactNode, label: string) => (
      <Link href={href} className={cx(styles.railPill, active === key && styles.railPillActive)} aria-current={active === key ? "page" : undefined} aria-label={label} title={label}>
        {icon}
      </Link>
    );
    return (
      <nav className={cx(styles.sidebar, styles.rail)} aria-label="Sidebar">
        <button type="button" className={styles.railLogo} aria-label="Expand sidebar" title="Expand sidebar" onClick={onExpand}><IconLogo /></button>
        {pill("/", "new-task", <IconPlusCircle />, "New task")}
        <Inert label="Search" className={styles.railPill} align="start"><IconSearch /></Inert>
        <Inert label="Plugins" className={styles.railPill}><IconPlugins /></Inert>
        <Inert label="Scheduled" className={styles.railPill}><IconClock /></Inert>
        {pill("/assets", "assets", <IconFolder />, "Assets")}
        <Inert label="Connect Mobile" className={styles.railPill}><IconPhone /></Inert>
        <div className={styles.spacer} />
        <div className={styles.railFooter}><span className={styles.railAvatar} aria-label="Owner"><IconAvatar /></span></div>
      </nav>
    );
  }

  const link = (href: string, key: string, icon: ReactNode, label: string) => (
    <Link href={href} className={cx(styles.row, active === key && styles.rowActive)} aria-current={active === key ? "page" : undefined} onClick={onNavigate}>
      <span className={styles.rowIcon}>{icon}</span>
      <span className={styles.rowLabel}>{label}</span>
    </Link>
  );
  const shown = visibleRecents(recents, showAll);
  return (
    <nav className={styles.sidebar} aria-label="Sidebar">
      <div className={styles.head}>
        <span aria-label="MiniMax Local" className={styles.rowIcon}><IconLogo /></span>
        <button type="button" className={styles.iconButton} aria-label="Collapse sidebar" title="Collapse sidebar" onClick={onCollapse}><IconCollapse /></button>
      </div>
      {link("/", "new-task", <IconPlusCircle />, "New task")}
      {onOpenSearch ? <ActionRow icon={<IconSearch />} label="Search" onClick={onOpenSearch} /> : <InertRow icon={<IconSearch />} label="Search" />}
      <InertRow icon={<IconPlugins />} label="Plugins" />
      <InertRow icon={<IconClock />} label="Scheduled" />
      {link("/assets", "assets", <IconFolder />, "Assets")}
      <InertRow icon={<IconPhone />} label="Connect Mobile" />

      <div className={styles.section}>
        <SectionHeader label="More" section="more" folded={prefs.folded.more} onToggle={onToggleSection} />
        {prefs.folded.more ? null : (
          <>
            <InertRow label="MaxHermes" muted />
            <InertRow label="MaxClaw" muted />
          </>
        )}
      </div>
      <div className={styles.section}>
        <SectionHeader label="Projects" section="projects" folded={prefs.folded.projects} onToggle={onToggleSection} />
        {prefs.folded.projects ? null : onOpenCreateProject ? <ActionRow icon={<IconProject />} label="Add new project" muted onClick={onOpenCreateProject} /> : <InertRow icon={<IconProject />} label="Add new project" muted />}
      </div>
      <div className={styles.section}>
        <SectionHeader label="Recents" section="recents" folded={prefs.folded.recents} onToggle={onToggleSection} />
        {prefs.folded.recents ? null : recents.length === 0 ? (
          <p className={styles.empty}>No task history.</p>
        ) : (
          <>
            <ul className={styles.recents}>
              {shown.map((entry) => (
                <RecentRow key={entry.id} entry={entry} active={active === `task:${entry.id}`} onNavigate={onNavigate} onDelete={onDeleteRecent} />
              ))}
            </ul>
            {hasMoreRecents(recents) && !showAll ? (
              <button type="button" className={cx(styles.row, styles.rowMuted, styles.showMore)} onClick={() => { setShowAll(true); }}>
                <span className={styles.rowIcon}><IconMore /></span>
                <span className={styles.rowLabel}>Show more</span>
              </button>
            ) : null}
          </>
        )}
      </div>
      {prefs.guideDismissed ? null : (
        <div className={styles.guide} data-testid="agents-guide">
          <button type="button" className={styles.guideClose} aria-label="Dismiss Agents guide" onClick={onDismissGuide}><IconClose /></button>
          <p className={styles.guideText}>You can now find Agents in Plugins</p>
          <Inert role="link" label="View now" className={styles.guideLink}>View now</Inert>
          <div className={styles.guideArt} aria-hidden="true">
            <span className={styles.guideArtCard}>
              <span className={styles.guideArtTitle}>Manage</span>
              <span className={styles.guideArtRow}><i /><i /><i /><i /><b>Agents</b></span>
            </span>
          </div>
        </div>
      )}
      <div className={styles.spacer} />
      <div className={styles.footer}>
        <UserMenu onOpenSettings={onOpenSettings ?? (() => undefined)} />
        <span className={styles.footerActions}>
          <span className={styles.inboxWrap}>
            <button type="button" className={styles.iconButton} aria-label="Inbox, no unread messages" title="Inbox" aria-haspopup="dialog" aria-expanded={inboxOpen} onClick={() => { setInboxOpen((o) => !o); }}>
              <IconBell />
            </button>
            <InboxPopover open={inboxOpen} onClose={() => { setInboxOpen(false); }} />
          </span>
          <Inert label="Download desktop" className={styles.iconButton} align="end"><IconDownload /></Inert>
        </span>
      </div>
    </nav>
  );
}
