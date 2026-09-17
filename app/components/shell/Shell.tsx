"use client";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import type { AgentRunEvent, InboxEvent } from "@/lib/inbox";
import type { Project } from "@/lib/project-store";
import { DEFAULT_SETTINGS, type Settings } from "@/lib/settings";
import { archivedRecents, tasksOf } from "@/lib/recents";
import { topBarFor, type RecentEntry } from "@/lib/route-title";
import { type Section } from "@/lib/shell-prefs";
import { dispatchShellPrefs, getServerShellPrefs, getShellPrefs, subscribeShellPrefs } from "@/lib/shell-prefs-store";
import { useNarrow } from "@/lib/use-narrow";
import { cx } from "@/lib/cx";
import { useThemeChoice } from "@/lib/use-theme";
import { CreateProjectDialog } from "./CreateProjectDialog";
import { DeleteProjectDialog } from "./DeleteProjectDialog";
import { ProjectsContext, type ProjectsState } from "./ProjectsContext";
import { SettingsContext, type SettingsState } from "./SettingsContext";
import { PromoCard } from "./PromoCard";
import { SearchDialog } from "./SearchDialog";
import { SettingsDialog, type SettingsSection } from "./SettingsDialog";
import { Toast, ToastLink } from "./Toast";
import { ShellStateProvider, UNDO_TOAST_MS, useShell } from "./ShellContext";
import { Sidebar } from "./Sidebar";
import { IconExpand, IconWorkArea } from "./icons";
import styles from "./shell.module.css";

export interface ShellProps {
  readonly children: ReactNode;
  /** Injectable confirm for the Recents menu's Delete (tests). */
  readonly confirmImpl?: (message: string) => boolean;
}

/**
 * The frame every page sits in: sidebar (a 52 px rail when collapsed, a drawer below 900 px), top bar, content.
 * STORY_012; Recents from history (STORY_014); the theme and the inert notice (STORY_019); the folding sections, the
 * Recents menu, the Inbox, the Search / Create project dialogs and the promo card (STORY_021); the Work area toggle
 * shared with the task page through ShellContext (STORY_023).
 */
export function Shell({ children, confirmImpl }: ShellProps) {
  const pathname = usePathname();
  return (
    <ShellStateProvider scope={pathname}>
      <ShellFrame confirmImpl={confirmImpl}>{children}</ShellFrame>
    </ShellStateProvider>
  );
}

function ShellFrame({ children, confirmImpl }: ShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { workAreaOpen, toggleWorkArea, pageActions, toast, notify, clearToast } = useShell();
  const narrow = useNarrow();
  // BUG_005: hydrate with the defaults, take the stored preferences after — never a mismatch that would drop data-theme
  const prefs = useSyncExternalStore(subscribeShellPrefs, getShellPrefs, getServerShellPrefs);
  const dispatchPrefs = dispatchShellPrefs;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState<SettingsSection>("General");
  const [searchOpen, setSearchOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState<string | undefined>(undefined);
  const createFor = useRef<((project: Project) => void) | undefined>(undefined);
  const [deleting, setDeleting] = useState<Project | undefined>(undefined);
  const [projects, setProjects] = useState<readonly Project[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [themeChoice, setThemeChoice] = useThemeChoice();
  const [recents, setRecents] = useState<readonly RecentEntry[]>([]);
  const [agentRuns, setAgentRuns] = useState<readonly AgentRunEvent[]>([]); // STORY_050: director runs that ended without a prompt
  const confirmDelete = useCallback((message: string) => (confirmImpl ? confirmImpl(message) : window.confirm(message)), [confirmImpl]);

  const loadRecents = useCallback(() => {
    let cancelled = false;
    fetch("/api/history")
      .then(async (res) => (res.ok ? ((await res.json()) as { entries: RecentEntry[] }).entries : []))
      .then((entries) => {
        if (!cancelled) setRecents(entries);
      })
      .catch(() => undefined);
    // STORY_050: the Inbox's Messages rows come from the agent-runs store, loaded with the recents
    fetch("/api/agent/runs")
      .then(async (res) => {
        const body: unknown = res.ok ? await res.json() : undefined;
        const list = typeof body === "object" && body !== null ? (body as { runs?: unknown }).runs : undefined;
        return Array.isArray(list) ? (list as AgentRunEvent[]) : [];
      })
      .then((runs) => {
        if (!cancelled) setAgentRuns(runs);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  /** STORY_031: the projects, from the project store; refetched with the recents. */
  const loadProjects = useCallback(() => {
    let cancelled = false;
    fetch("/api/projects")
      .then(async (res) => (res.ok ? ((await res.json()) as { projects: Project[] }).projects : []))
      .then((list) => {
        if (!cancelled) setProjects(list);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  // Recents follow the history store; refetched on every navigation so a new job or a finished one shows up.
  useEffect(() => loadRecents(), [pathname, loadRecents]);
  // STORY_050: a director run that ended without a prompt tells the Shell to reload the Inbox's rows
  useEffect(() => {
    const reload = (): void => { loadRecents(); };
    window.addEventListener("minimax:agent-runs", reload);
    return () => { window.removeEventListener("minimax:agent-runs", reload); };
  }, [loadRecents]);
  useEffect(() => loadProjects(), [pathname, loadProjects]);
  /** STORY_034: the server-wide settings, read once and whenever Settings opens. */
  const loadSettings = useCallback(() => {
    let cancelled = false;
    fetch("/api/settings")
      .then(async (res) => (res.ok ? ((await res.json()) as Settings) : DEFAULT_SETTINGS))
      .then((value) => {
        if (!cancelled) setSettings(value);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => loadSettings(), [loadSettings]);
  useEffect(() => (settingsOpen ? loadSettings() : undefined), [settingsOpen, loadSettings]);
  const updateSettings = useCallback(
    (patch: Partial<Settings>) => {
      const before = settings;
      setSettings({ ...settings, ...patch }); // paint at once; the write is under way (CLAUDE.md §4c: send first — it is)
      fetch("/api/settings", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(patch) })
        .then(async (res) => {
          if (res.ok) setSettings((await res.json()) as Settings);
          else throw new Error(String(res.status));
        })
        .catch(() => {
          setSettings(before);
          notify("That did not save — the app's server did not answer", { tone: "info" });
        });
    },
    [settings, notify],
  );
  const setRemoveWatermark = useCallback((removeWatermark: boolean) => { updateSettings({ removeWatermark }); }, [updateSettings]);
  const settingsState = useMemo<SettingsState>(() => ({ settings, update: updateSettings }), [settings, updateSettings]);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
  }, []);
  const closeSettings = useCallback(() => {
    setSettingsOpen(false);
    setSettingsSection("General");
  }, []);
  const closeSearch = useCallback(() => {
    setSearchOpen(false);
  }, []);
  const closeCreate = useCallback(() => {
    setCreateOpen(false);
    setCreateError(undefined);
    createFor.current = undefined;
  }, []);

  useEffect(() => {
    if (!drawerOpen) return undefined;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") closeDrawer();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [drawerOpen, closeDrawer]);

  /** The Recents menu's Delete: the same forget-from-history as Assets (STORY_015); leaves the task page if it is open. */
  const deleteRecent = useCallback(
    async (entry: RecentEntry) => {
      if (!confirmDelete(`Delete "${entry.title}" from history? The file on the Spark is untouched.`)) return;
      await fetch(`/api/history/${encodeURIComponent(entry.id)}`, { method: "DELETE" }).catch(() => undefined);
      if (pathname === `/task/${encodeURIComponent(entry.id)}`) router.push("/");
      loadRecents();
    },
    [confirmDelete, pathname, router, loadRecents],
  );

  /** STORY_029: the row's Rename / Pin / Copy conversation ID — a PATCH, the list refetched, a toast when asked for. */
  const patchRecent = useCallback(
    async (entry: RecentEntry, body: Record<string, unknown>, message?: string): Promise<boolean> => {
      const res = await fetch(`/api/history/${encodeURIComponent(entry.id)}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).catch(() => undefined);
      loadRecents();
      const ok = res?.ok === true;
      if (!ok) notify("That did not save — the app's server did not answer", { tone: "info" });
      else if (message !== undefined) notify(message);
      return ok;
    },
    [loadRecents, notify],
  );
  /** STORY_030: Archive — no confirmation; the reference's toast offers Undo and a link to Settings › Archived tasks. */
  const openSettingsAt = useCallback((section: SettingsSection) => {
    setSettingsSection(section);
    setSettingsOpen(true);
  }, []);
  const unarchiveRecent = useCallback((entry: RecentEntry) => { void patchRecent(entry, { archived: false }); }, [patchRecent]);
  const archiveRecent = useCallback(
    (entry: RecentEntry) => {
      void patchRecent(entry, { archived: true }).then((ok) => {
        if (!ok) return;
        notify(
          <>
            <ToastLink onClick={() => { clearToast(); unarchiveRecent(entry); }}>Undo</ToastLink> or view archived tasks in{" "}
            <ToastLink onClick={() => { clearToast(); openSettingsAt("Archived tasks"); }}>Settings</ToastLink>
          </>,
          { tone: "info", durationMs: UNDO_TOAST_MS },
        );
      });
    },
    [patchRecent, notify, clearToast, unarchiveRecent, openSettingsAt],
  );
  /** STORY_030: Archived tasks › Delete all — one confirm naming the count, one DELETE, the task page left if it was one of them. */
  const deleteAllArchived = useCallback(async () => {
    const list = archivedRecents(recents);
    if (list.length === 0) return;
    if (!confirmDelete(`Delete all ${String(list.length)} archived ${list.length === 1 ? "task" : "tasks"} from history? The files on the Spark are untouched.`)) return;
    await fetch(`/api/history?ids=${list.map((e) => encodeURIComponent(e.id)).join(",")}`, { method: "DELETE" }).catch(() => undefined);
    if (list.some((e) => pathname === `/task/${encodeURIComponent(e.id)}`)) router.push("/");
    loadRecents();
  }, [recents, confirmDelete, pathname, router, loadRecents]);
  const renameRecent = useCallback((entry: RecentEntry, title: string) => { void patchRecent(entry, { title }, "Task renamed"); }, [patchRecent]);
  const pinRecent = useCallback((entry: RecentEntry, pinned: boolean) => { void patchRecent(entry, { pinned }, pinned ? "Task pinned" : "Task unpinned"); }, [patchRecent]);
  const copyRecentId = useCallback(
    (entry: RecentEntry) => {
      const clipboard = typeof navigator === "undefined" ? undefined : navigator.clipboard;
      if (!clipboard) {
        notify("Clipboard unavailable — the ID is " + entry.id);
        return;
      }
      clipboard.writeText(entry.id).then(
        () => { notify("Conversation ID copied"); },
        () => { notify("Clipboard unavailable — the ID is " + entry.id); },
      );
    },
    [notify],
  );

  /**
   * STORY_031: projects — Create (the dialog, with a callback for whoever asked: Move / Add to project › Add new project),
   * Rename, Pin, Delete (the dialog; its tasks stay), New task (the home composer in the project), Move to project.
   */
  const openCreateProject = useCallback(
    (onCreated?: (project: Project) => void) => {
      if (narrow) closeDrawer();
      createFor.current = onCreated;
      setCreateError(undefined);
      setCreateOpen(true);
    },
    [narrow, closeDrawer],
  );
  const createProject = useCallback(
    async (name: string) => {
      setCreateBusy(true);
      const res = await fetch("/api/projects", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name }) }).catch(() => undefined);
      setCreateBusy(false);
      if (!res?.ok) {
        setCreateError("That did not save — the app's server did not answer");
        return;
      }
      const { project } = (await res.json()) as { project: Project };
      loadProjects();
      setCreateOpen(false);
      if (prefs.folded.projects) dispatchPrefs({ type: "toggle-section", section: "projects" }); // the new row is visible at once
      const onCreated = createFor.current;
      createFor.current = undefined;
      onCreated?.(project);
    },
    [loadProjects, prefs.folded.projects, dispatchPrefs],
  );
  const patchProject = useCallback(
    async (project: Project, body: Record<string, unknown>, message: string) => {
      const res = await fetch(`/api/projects/${encodeURIComponent(project.id)}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).catch(() => undefined);
      loadProjects();
      if (res?.ok === true) notify(message);
      else notify("That did not save — the app's server did not answer", { tone: "info" });
    },
    [loadProjects, notify],
  );
  const renameProject = useCallback((project: Project, name: string) => { void patchProject(project, { name }, "Project renamed"); }, [patchProject]);
  const pinProject = useCallback((project: Project, pinned: boolean) => { void patchProject(project, { pinned }, pinned ? "Project pinned" : "Project unpinned"); }, [patchProject]);
  const deleteProject = useCallback(
    async (project: Project) => {
      setDeleting(undefined);
      await fetch(`/api/projects/${encodeURIComponent(project.id)}`, { method: "DELETE" }).catch(() => undefined);
      if (pathname === `/project/${encodeURIComponent(project.id)}`) router.push("/");
      loadProjects();
      loadRecents();
    },
    [pathname, router, loadProjects, loadRecents],
  );
  const newTask = useCallback(
    (project: Project) => {
      if (narrow) closeDrawer();
      router.push(`/?project=${encodeURIComponent(project.id)}`);
    },
    [narrow, closeDrawer, router],
  );
  const moveRecent = useCallback(
    (entry: RecentEntry, projectId: string | undefined) => {
      const target = projectId === undefined ? undefined : projects.find((p) => p.id === projectId);
      void patchRecent(entry, { projectId: projectId ?? null }, target ? `Task moved to ${target.name}` : "Task moved out of its project");
    },
    [patchRecent, projects],
  );
  const projectsState = useMemo<ProjectsState>(() => ({ projects, openCreate: openCreateProject }), [projects, openCreateProject]);
  /** STORY_033: the Inbox — Read all stamps the browser's prefs; a row opens its task. */
  const inboxReadAll = useCallback(() => {
    dispatchPrefs({ type: "inbox-read", at: new Date().toISOString() });
  }, [dispatchPrefs]);
  const openInboxEvent = useCallback(
    (event: InboxEvent) => {
      if (narrow) closeDrawer();
      if (event.runId !== undefined) {
        // STORY_050: a director run's row reopens the composer with the notes and the words; the row is stamped opened
        const id = event.runId;
        const openedAt = new Date().toISOString();
        setAgentRuns((runs) => runs.map((r) => (r.id === id ? { ...r, openedAt } : r)));
        void fetch(`/api/agent/runs/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ openedAt }) }).catch(() => undefined);
        router.push(`/?agentRun=${encodeURIComponent(id)}`);
        return;
      }
      if (event.taskId !== undefined) router.push(`/task/${encodeURIComponent(event.taskId)}`);
    },
    [narrow, closeDrawer, router],
  );

  const bar = topBarFor(pathname, recents);
  const asideOpen = narrow && drawerOpen;
  const rail = !narrow && prefs.collapsed;

  return (
    <div className={cx(styles.shell, rail && styles.shellCollapsed)}>
      <div className={cx(styles.scrim, asideOpen && styles.scrimOpen)} onClick={closeDrawer} aria-hidden="true" data-testid="scrim" />
      <aside className={cx(styles.aside, asideOpen && styles.asideOpen)} aria-hidden={narrow && !drawerOpen ? true : undefined}>
        <Sidebar
          pathname={pathname}
          recents={recents}
          agentRuns={agentRuns}
          prefs={prefs}
          rail={rail}
          onNavigate={narrow ? closeDrawer : undefined}
          onCollapse={() => {
            if (narrow) closeDrawer();
            else dispatchPrefs({ type: "set-collapsed", collapsed: true });
          }}
          onExpand={() => {
            dispatchPrefs({ type: "set-collapsed", collapsed: false });
          }}
          onToggleSection={(section: Section) => {
            dispatchPrefs({ type: "toggle-section", section });
          }}
          onDismissGuide={() => {
            dispatchPrefs({ type: "dismiss-guide" });
          }}
          onOpenSettings={() => {
            setSettingsOpen(true);
          }}
          onOpenSearch={() => {
            if (narrow) closeDrawer();
            setSearchOpen(true);
          }}
          onOpenCreateProject={openCreateProject}
          projects={projects}
          onRenameProject={renameProject}
          onPinProject={pinProject}
          onDeleteProject={setDeleting}
          onNewTask={newTask}
          onMoveRecent={moveRecent}
          inboxReadAt={prefs.inboxReadAt}
          onInboxReadAll={inboxReadAll}
          onOpenInboxEvent={openInboxEvent}
          onInboxOpen={loadRecents}
          onDeleteRecent={(entry) => {
            void deleteRecent(entry);
          }}
          onRenameRecent={renameRecent}
          onPinRecent={pinRecent}
          onCopyRecentId={copyRecentId}
          onArchiveRecent={archiveRecent}
        />
      </aside>
      <div className={styles.main}>
        <header className={styles.topbar}>
          <button type="button" className={styles.menuButton} aria-label="Expand sidebar" title="Expand sidebar" aria-expanded={asideOpen} onClick={() => {
              setDrawerOpen(true);
            }}>
            <IconExpand />
          </button>
          {bar.kind === "task" ? <span className={styles.topbarTitle} data-testid="topbar-title">{bar.title}</span> : null}
          {/* narrow-assets-all@390: the bar carries the page title centred, with the page's own buttons at the right (STORY_024) */}
          {bar.kind === "assets" && narrow ? <span className={styles.topbarCentre}>Assets</span> : null}
          {/* the pages behind the sidebar put their whole chrome in the bar at every width (STORY_025) */}
          {bar.kind === "page" ? <div className={styles.topbarPage}>{pageActions}</div> : null}
          <div className={styles.topbarActions}>
            {bar.kind === "assets" && narrow ? pageActions : null}
            {bar.kind === "task" && !narrow ? (
              // work-area-button@1440: shows / hides the task page's Work Area panel (STORY_023); the reference has none at 390
              <button type="button" className={styles.iconButton} aria-label="Work area" title="Work area" aria-pressed={workAreaOpen} onClick={toggleWorkArea}>
                <IconWorkArea />
              </button>
            ) : null}
          </div>
        </header>
        <div className={styles.content}>
          <ProjectsContext.Provider value={projectsState}>
            <SettingsContext.Provider value={settingsState}>{children}</SettingsContext.Provider>
          </ProjectsContext.Provider>
        </div>
      </div>
      {bar.kind === "home" && !narrow && !prefs.promoDismissed ? (
        <PromoCard
          onDismiss={() => {
            dispatchPrefs({ type: "dismiss-promo" });
          }}
        />
      ) : null}
      <Toast toast={toast} onClose={clearToast} />
      <SettingsDialog
        open={settingsOpen}
        choice={themeChoice}
        onChoose={setThemeChoice}
        onClose={closeSettings}
        initialSection={settingsSection}
        archived={archivedRecents(recents)}
        projects={projects}
        removeWatermark={settings.removeWatermark}
        onRemoveWatermark={setRemoveWatermark}
        onUnarchive={unarchiveRecent}
        onDeleteArchived={(entry) => {
          void deleteRecent(entry);
        }}
        onDeleteAllArchived={() => {
          void deleteAllArchived();
        }}
      />
      <SearchDialog open={searchOpen} recents={recents} onClose={closeSearch} />
      <CreateProjectDialog open={createOpen} onClose={closeCreate} onCreate={(name) => { void createProject(name); }} busy={createBusy} error={createError} />
      <DeleteProjectDialog project={deleting} taskCount={deleting ? tasksOf(recents, deleting.id).length : 0} onCancel={() => { setDeleting(undefined); }} onConfirm={(project) => { void deleteProject(project); }} />
    </div>
  );
}
