"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import type { Project } from "@/lib/project-store";
import { eventsFor, unreadCount, type InboxEvent } from "@/lib/inbox";
import { activeRecents, hasMoreRecents, pinnedRecents, recentLabel, recentName, tasksOf, visibleRecents } from "@/lib/recents";
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
  IconClose,
  IconClock,
  IconCollapse,
  IconCopy,
  IconFolder,
  IconLogo,
  IconMore,
  IconMove,
  IconPin,
  IconPlugins,
  IconPlus, IconPlusCircle,
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
  /** STORY_031: opens the Create project dialog; the callback receives the project it makes (Move / Add to project › Add new project). */
  readonly onOpenCreateProject?: (onCreated?: (project: Project) => void) => void;
  /** STORY_031: the projects and their rows' actions; Move to project on a Recents row. */
  readonly projects?: readonly Project[];
  readonly onRenameProject?: (project: Project, name: string) => void;
  readonly onPinProject?: (project: Project, pinned: boolean) => void;
  readonly onDeleteProject?: (project: Project) => void;
  readonly onNewTask?: (project: Project) => void;
  readonly onMoveRecent?: (entry: RecentEntry, projectId: string | undefined) => void;
  /** STORY_033: the Inbox — the browser's Read all stamp, Read all, a row's task, and a refetch when the bell opens. */
  readonly inboxReadAt?: string;
  readonly onInboxReadAll?: () => void;
  readonly onOpenInboxEvent?: (event: InboxEvent) => void;
  readonly onInboxOpen?: () => void;
  readonly onDeleteRecent?: (entry: RecentEntry) => void;
  /** STORY_029: the row's Rename (a new title), Pin / Unpin and Copy conversation ID. */
  readonly onRenameRecent?: (entry: RecentEntry, title: string) => void;
  readonly onPinRecent?: (entry: RecentEntry, pinned: boolean) => void;
  readonly onCopyRecentId?: (entry: RecentEntry) => void;
  /** STORY_030: the row's Archive — no confirmation; the row leaves Recents. */
  readonly onArchiveRecent?: (entry: RecentEntry) => void;
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

/** Projects / Recents: a header button that folds its section (STORY_021; sidebar-more-expanded@1440; the More section left with STORY_028). */
function SectionHeader({ label, section, folded, onToggle }: { readonly label: string; readonly section: Section; readonly folded: boolean; readonly onToggle?: (section: Section) => void }) {
  return (
    <button type="button" className={styles.sectionHeader} aria-expanded={!folded} onClick={() => onToggle?.(section)}>
      <span>{label}</span>
      <span className={cx(styles.sectionChevron, !folded && styles.sectionChevronOpen)} aria-hidden="true"><IconChevronDown /></span>
    </button>
  );
}

/** A row's ⋯ menu: open / closed, closed by Escape or a press outside the row (STORY_021). */
function useRowMenu(rootRef: RefObject<HTMLLIElement | null>, onClosed?: () => void) {
  const [menuOpen, setMenuOpen] = useState(false);
  const close = useCallback(() => {
    setMenuOpen(false);
    onClosed?.();
  }, [onClosed]);
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
  }, [menuOpen, close, rootRef]);
  return { menuOpen, setMenuOpen, close };
}

/**
 * The inline rename (STORY_029; behaviour-recents-rename-02): an input holding the current name, selected; Enter or
 * blur commits, Escape cancels, an empty name is refused (the input stays). Commits once — the blur a commit's unmount
 * may fire is ignored.
 */
function RenameInput({ initial, label, onCommit, onCancel }: { readonly initial: string; readonly label: string; readonly onCommit: (name: string) => void; readonly onCancel: () => void }) {
  const [draft, setDraft] = useState(initial);
  const ref = useRef<HTMLInputElement>(null);
  const done = useRef(false);
  useEffect(() => {
    ref.current?.select();
  }, []);
  const commit = (): void => {
    if (done.current) return;
    const name = draft.trim();
    if (name === "") {
      ref.current?.focus();
      return;
    }
    done.current = true;
    onCommit(name);
  };
  return (
    <input
      ref={ref}
      className={styles.recentInput}
      aria-label={label}
      value={draft}
      onChange={(event) => { setDraft(event.target.value); }}
      onKeyDown={(event) => {
        if (event.key === "Enter") { event.preventDefault(); commit(); }
        if (event.key === "Escape") { event.preventDefault(); done.current = true; onCancel(); }
      }}
      onBlur={commit}
    />
  );
}

function MenuButton({ label, icon, onClick, danger = false, extra }: { readonly label: string; readonly icon: ReactNode; readonly onClick: () => void; readonly danger?: boolean; readonly extra?: ReactNode }) {
  return (
    <button type="button" role="menuitem" className={cx(styles.menuItem, danger && styles.menuDanger)} onClick={onClick}>
      <span className={styles.menuIcon}>{icon}</span>
      <span className={styles.menuLabel}>{label}</span>
      {extra}
    </button>
  );
}

type RecentRowProps = {
  readonly entry: RecentEntry;
  readonly active: boolean;
  readonly projects: readonly Project[];
  readonly onNavigate?: () => void;
  readonly onDelete?: (entry: RecentEntry) => void;
  readonly onRename?: (entry: RecentEntry, title: string) => void;
  readonly onPin?: (entry: RecentEntry, pinned: boolean) => void;
  readonly onCopyId?: (entry: RecentEntry) => void;
  readonly onArchive?: (entry: RecentEntry) => void;
  readonly onMove?: (entry: RecentEntry, projectId: string | undefined) => void;
  readonly onCreateProject?: (onCreated?: (project: Project) => void) => void;
};

/**
 * A Recents (or Pinned, or a project's) row (STORY_021; recents-row-menu-open@1440): dot, label, hover Pin + ⋯, the ⋯
 * menu — Rename, Pin / Unpin, Copy conversation ID (STORY_029, behaviour-recents-*), Move to project › (STORY_031,
 * behaviour-project-move-01: Add new project · the projects · No project), Archive (STORY_030), Delete. Rename turns
 * the label into an inline input holding the title. The visible label stays the creation stamp (CHORE_008).
 */
function RecentRow({ entry, active, projects, onNavigate, onDelete, onRename, onPin, onCopyId, onArchive, onMove, onCreateProject }: RecentRowProps) {
  const rootRef = useRef<HTMLLIElement>(null);
  const [moveOpen, setMoveOpen] = useState(false);
  const closeMove = useCallback(() => {
    setMoveOpen(false);
  }, []);
  const { menuOpen, setMenuOpen, close } = useRowMenu(rootRef, closeMove);
  const [renaming, setRenaming] = useState(false);
  const unread = isUnread(entry);
  const pinned = entry.pinned === true;
  const item = (label: string, icon: ReactNode, onClick: () => void) => <MenuButton label={label} icon={icon} onClick={() => { close(); onClick(); }} />;
  const inert = (label: string, icon: ReactNode) => <Inert role="menuitem" label={label} className={styles.menuItem}><span className={styles.menuIcon}>{icon}</span><span className={styles.menuLabel}>{label}</span></Inert>;
  return (
    <li ref={rootRef} className={cx(styles.recent, menuOpen && styles.recentMenuOpen)}>
      {renaming ? (
        <span className={cx(styles.row, styles.recentLink, styles.recentEditing)}>
          <span className={cx(styles.dot, unread ? styles.dotUnread : styles.dotRead)} />
          <RenameInput initial={entry.title} label={`Rename ${entry.title}`} onCancel={() => { setRenaming(false); }} onCommit={(title) => { setRenaming(false); if (title !== entry.title) onRename?.(entry, title); }} />
        </span>
      ) : (
        <Link href={`/task/${encodeURIComponent(entry.id)}`} className={cx(styles.row, styles.recentLink, active && styles.rowActive)} aria-current={active ? "page" : undefined} aria-label={recentName(entry)} onClick={onNavigate}>
          <span className={cx(styles.dot, unread ? styles.dotUnread : styles.dotRead)} aria-label={unread ? "New result" : undefined} />
          {/* CHORE_008: the row is named by its creation minute; the prompt's first words are the tooltip and the accessible name */}
          <span className={styles.rowLabel} title={entry.title}>{recentLabel(entry)}</span>
        </Link>
      )}
      <span className={styles.recentActions}>
        {onPin ? (
          <button type="button" className={cx(styles.recentAction, pinned && styles.recentActionOn)} aria-label={pinned ? `Unpin ${entry.title}` : `Pin ${entry.title}`} aria-pressed={pinned} onClick={() => { onPin(entry, !pinned); }}><IconPin /></button>
        ) : (
          <Inert label="Pin" className={styles.recentAction}><IconPin /></Inert>
        )}
        <button type="button" className={styles.recentAction} aria-label={`More actions for ${entry.title}`} aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => { setMoveOpen(false); setMenuOpen((o) => !o); }}>
          <IconMore />
        </button>
      </span>
      {menuOpen ? (
        <div className={styles.menu} role="menu" aria-label={`Actions for ${entry.title}`}>
          {onRename ? item("Rename", <IconRename />, () => { setRenaming(true); }) : inert("Rename", <IconRename />)}
          {onPin ? item(pinned ? "Unpin" : "Pin", <IconPin />, () => { onPin(entry, !pinned); }) : inert("Pin", <IconPin />)}
          {onCopyId ? item("Copy conversation ID", <IconCopy />, () => { onCopyId(entry); }) : inert("Copy conversation ID", <IconCopy />)}
          {onMove ? (
            <div className={styles.submenuWrap}>
              <button type="button" role="menuitem" aria-haspopup="menu" aria-expanded={moveOpen} className={styles.menuItem} onClick={() => { setMoveOpen((o) => !o); }}>
                <span className={styles.menuIcon}><IconMove /></span>
                <span className={styles.menuLabel}>Move to project</span>
                <span className={styles.menuChevron} aria-hidden="true">›</span>
              </button>
              {moveOpen ? (
                <div className={cx(styles.menu, styles.submenu)} role="menu" aria-label="Move to project">
                  <MenuButton label="Add new project" icon={<IconPlusCircle />} onClick={() => { close(); onCreateProject?.((project) => { onMove(entry, project.id); }); }} />
                  {projects.length > 0 ? <div className={styles.menuSeparator} /> : null}
                  {projects.map((project) => (
                    <MenuButton key={project.id} label={project.name} icon={<IconProject />} onClick={() => { close(); onMove(entry, project.id); }} extra={entry.projectId === project.id ? <span className={styles.menuCheck} aria-hidden="true">✓</span> : null} />
                  ))}
                  <div className={styles.menuSeparator} />
                  <MenuButton label="No project" icon={<IconProject />} onClick={() => { close(); onMove(entry, undefined); }} extra={entry.projectId === undefined ? <span className={styles.menuCheck} aria-hidden="true">✓</span> : null} />
                </div>
              ) : null}
            </div>
          ) : (
            <Inert role="menuitem" label="Move to project" className={styles.menuItem}>
              <span className={styles.menuIcon}><IconMove /></span>
              <span className={styles.menuLabel}>Move to project</span>
              <span className={styles.menuChevron} aria-hidden="true">›</span>
            </Inert>
          )}
          <div className={styles.menuSeparator} />
          {onArchive ? item("Archive", <IconArchive />, () => { onArchive(entry); }) : inert("Archive", <IconArchive />)}
          <MenuButton label="Delete" icon={<IconTrash />} danger onClick={() => { close(); onDelete?.(entry); }} />
        </div>
      ) : null}
    </li>
  );
}

type ProjectRowProps = {
  readonly project: Project;
  readonly tasks: readonly RecentEntry[];
  readonly active: boolean;
  readonly expanded: boolean;
  readonly onToggle: () => void;
  readonly onNavigate?: () => void;
  readonly onRename?: (project: Project, name: string) => void;
  readonly onPin?: (project: Project, pinned: boolean) => void;
  readonly onDelete?: (project: Project) => void;
  readonly onNewTask?: (project: Project) => void;
  readonly renderTask: (entry: RecentEntry) => ReactNode;
};

/**
 * A project row (STORY_031; behaviour-project-create-04, -move-04-project-row-hover, -delete-03): the folder and the
 * name; on hover **Project actions** (⋯) and **New task** (+); a click opens the project's page and expands the row to
 * its tasks, or "No tasks". The ⋯ menu: New task · Rename · Pin / Unpin · ─ · Delete (ours opens on a click; the
 * reference's needed a right-click — Departures).
 */
function ProjectRow({ project, tasks, active, expanded, onToggle, onNavigate, onRename, onPin, onDelete, onNewTask, renderTask }: ProjectRowProps) {
  const rootRef = useRef<HTMLLIElement>(null);
  const { menuOpen, setMenuOpen, close } = useRowMenu(rootRef);
  const [renaming, setRenaming] = useState(false);
  const pinned = project.pinned === true;
  const item = (label: string, icon: ReactNode, onClick: () => void, danger = false) => <MenuButton label={label} icon={icon} danger={danger} onClick={() => { close(); onClick(); }} />;
  return (
    <li ref={rootRef} className={cx(styles.recent, styles.project, menuOpen && styles.recentMenuOpen)} data-testid="project-row">
      {renaming ? (
        <span className={cx(styles.row, styles.recentLink, styles.recentEditing)}>
          <span className={styles.rowIcon}><IconProject /></span>
          <RenameInput initial={project.name} label={`Rename ${project.name}`} onCancel={() => { setRenaming(false); }} onCommit={(name) => { setRenaming(false); if (name !== project.name) onRename?.(project, name); }} />
        </span>
      ) : (
        <Link href={`/project/${encodeURIComponent(project.id)}`} className={cx(styles.row, styles.recentLink, active && styles.rowActive)} aria-current={active ? "page" : undefined} aria-expanded={expanded} onClick={() => { onToggle(); onNavigate?.(); }}>
          <span className={styles.rowIcon}><IconProject /></span>
          <span className={styles.rowLabel} title={project.name}>{project.name}</span>
        </Link>
      )}
      <span className={styles.recentActions}>
        <button type="button" className={styles.recentAction} aria-label={`Project actions for ${project.name}`} aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => { setMenuOpen((o) => !o); }}><IconMore /></button>
        <button type="button" className={styles.recentAction} aria-label={`New task in ${project.name}`} onClick={() => { onNewTask?.(project); }}><IconPlus /></button>
      </span>
      {menuOpen ? (
        <div className={styles.menu} role="menu" aria-label={`Actions for ${project.name}`}>
          {item("New task", <IconPlus />, () => { onNewTask?.(project); })}
          {item("Rename", <IconRename />, () => { setRenaming(true); })}
          {item(pinned ? "Unpin" : "Pin", <IconPin />, () => { onPin?.(project, !pinned); })}
          <div className={styles.menuSeparator} />
          {item("Delete", <IconTrash />, () => { onDelete?.(project); }, true)}
        </div>
      ) : null}
      {expanded ? (
        tasks.length === 0 ? (
          <p className={styles.projectEmpty}>No tasks</p>
        ) : (
          <ul className={cx(styles.recents, styles.projectTasks)} aria-label={`Tasks in ${project.name}`}>{tasks.map(renderTask)}</ul>
        )
      ) : null}
    </li>
  );
}

export function Sidebar({ pathname, recents, prefs = DEFAULT_SHELL_PREFS, rail = false, onNavigate, onCollapse, onExpand, onToggleSection, onDismissGuide, onOpenSettings, onOpenSearch, onOpenCreateProject, onDeleteRecent, onRenameRecent, onPinRecent, onCopyRecentId, onArchiveRecent, projects = [], onRenameProject, onPinProject, onDeleteProject, onNewTask, onMoveRecent, inboxReadAt, onInboxReadAll, onOpenInboxEvent, onInboxOpen }: SidebarProps) {
  const active = activeRow(pathname);
  const [showAll, setShowAll] = useState(false);
  // STORY_031: which project rows are expanded to their tasks (a click on the row toggles; not remembered)
  const [expandedProjects, setExpandedProjects] = useState<ReadonlySet<string>>(() => new Set());
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
        {pill("/plugins", "plugins", <IconPlugins />, "Plugins")}
        {pill("/scheduled", "scheduled", <IconClock />, "Scheduled")}
        {pill("/assets", "assets", <IconFolder />, "Assets")}
        <div className={styles.spacer} />
        <div className={styles.railFooter}><span className={styles.railAvatar} aria-label="Owner"><IconAvatar /></span></div>
      </nav>
    );
  }

  const link = (href: string, key: string, icon: ReactNode, label: string, muted = false) => (
    <Link href={href} className={cx(styles.row, muted && styles.rowMuted, active === key && styles.rowActive)} aria-current={active === key ? "page" : undefined} onClick={onNavigate}>
      <span className={styles.rowIcon}>{icon}</span>
      <span className={styles.rowLabel}>{label}</span>
    </Link>
  );
  // STORY_033: the Inbox's events come from every entry, archived ones included — the job happened either way
  const inboxEvents = eventsFor(recents);
  const unread = unreadCount(inboxEvents, inboxReadAt);
  const listed = activeRecents(recents); // STORY_030: archived rows live under Settings › Archived tasks
  const shown = visibleRecents(listed, showAll);
  const row = (entry: RecentEntry) => <RecentRow key={entry.id} entry={entry} active={active === `task:${entry.id}`} projects={projects} onNavigate={onNavigate} onDelete={onDeleteRecent} onRename={onRenameRecent} onPin={onPinRecent} onCopyId={onCopyRecentId} onArchive={onArchiveRecent} onMove={onMoveRecent} onCreateProject={onOpenCreateProject} />;
  const projectRow = (project: Project) => (
    <ProjectRow
      key={project.id}
      project={project}
      tasks={tasksOf(recents, project.id)}
      active={active === `project:${project.id}`}
      expanded={expandedProjects.has(project.id)}
      onToggle={() => {
        setExpandedProjects((open) => {
          const next = new Set(open);
          if (next.has(project.id)) next.delete(project.id);
          else next.add(project.id);
          return next;
        });
      }}
      onNavigate={onNavigate}
      onRename={onRenameProject}
      onPin={onPinProject}
      onDelete={onDeleteProject}
      onNewTask={onNewTask}
      renderTask={row}
    />
  );
  // STORY_029 / STORY_031: the Pinned section holds tasks and projects alike, newest pin first
  const pinned = [
    ...pinnedRecents(listed).map((entry) => ({ at: entry.pinnedAt, node: row(entry) })),
    ...projects.filter((p) => p.pinned === true).map((project) => ({ at: project.pinnedAt, node: projectRow(project) })),
  ].sort((a, b) => Date.parse(b.at ?? "") - Date.parse(a.at ?? ""));
  return (
    <nav className={styles.sidebar} aria-label="Sidebar">
      <div className={styles.head}>
        <span aria-label="MiniMax Local" className={styles.rowIcon}><IconLogo /></span>
        <button type="button" className={styles.iconButton} aria-label="Collapse sidebar" title="Collapse sidebar" onClick={onCollapse}><IconCollapse /></button>
      </div>
      {link("/", "new-task", <IconPlusCircle />, "New task")}
      {onOpenSearch ? <ActionRow icon={<IconSearch />} label="Search" onClick={onOpenSearch} /> : <InertRow icon={<IconSearch />} label="Search" />}
      {/* STORY_025: the rows lead to our renderings of the reference's pages; STORY_026 removed Scheduled and the marketplace (Plugins is Management) */}
      {link("/plugins", "plugins", <IconPlugins />, "Plugins")}
      {link("/scheduled", "scheduled", <IconClock />, "Scheduled")}
      {link("/assets", "assets", <IconFolder />, "Assets")}

      {/* STORY_029 (behaviour-recents-pin-01-pinned@1440): the Pinned section sits above Projects while anything is pinned */}
      {pinned.length > 0 ? (
        <div className={styles.section} data-testid="pinned-section">
          <SectionHeader label="Pinned" section="pinned" folded={prefs.folded.pinned} onToggle={onToggleSection} />
          {prefs.folded.pinned ? null : <ul className={styles.recents}>{pinned.map((p) => p.node)}</ul>}
        </div>
      ) : null}
      <div className={styles.section}>
        <SectionHeader label="Projects" section="projects" folded={prefs.folded.projects} onToggle={onToggleSection} />
        {prefs.folded.projects ? null : (
          <>
            {projects.length > 0 ? <ul className={styles.recents} aria-label="Projects">{projects.map(projectRow)}</ul> : null}
            {onOpenCreateProject ? <ActionRow icon={<IconProject />} label="Add new project" muted onClick={() => { onOpenCreateProject(); }} /> : <InertRow icon={<IconProject />} label="Add new project" muted />}
          </>
        )}
      </div>
      <div className={styles.section}>
        <SectionHeader label="Recents" section="recents" folded={prefs.folded.recents} onToggle={onToggleSection} />
        {prefs.folded.recents ? null : listed.length === 0 ? (
          <p className={styles.empty}>No task history.</p>
        ) : (
          <>
            <ul className={styles.recents}>{shown.map(row)}</ul>
            {hasMoreRecents(listed) && !showAll ? (
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
          <Link href="/plugins?tab=Agents" className={styles.guideLink} onClick={onNavigate}>View now</Link>
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
            <button type="button" className={styles.iconButton} aria-label={unread === 0 ? "Inbox, no unread messages" : `Inbox, ${String(unread)} unread`} title="Inbox" aria-haspopup="dialog" aria-expanded={inboxOpen} onClick={() => { if (!inboxOpen) onInboxOpen?.(); setInboxOpen((o) => !o); }}>
              <IconBell />
              {unread > 0 ? <span className={styles.badge} aria-hidden="true" data-testid="inbox-badge">{unread > 99 ? "99+" : String(unread)}</span> : null}
            </button>
            <InboxPopover
              open={inboxOpen}
              onClose={() => { setInboxOpen(false); }}
              events={inboxEvents}
              readAt={inboxReadAt}
              onReadAll={onInboxReadAll}
              onOpen={(event) => { setInboxOpen(false); onOpenInboxEvent?.(event); }}
            />
          </span>
        </span>
      </div>
    </nav>
  );
}
