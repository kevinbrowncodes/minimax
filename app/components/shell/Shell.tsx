"use client";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useReducer, useState, type ReactNode } from "react";
import { topBarFor, type RecentEntry } from "@/lib/route-title";
import { DEFAULT_SHELL_PREFS, readShellPrefs, reduceShellPrefs, writeShellPrefs, type Section, type ShellPrefs, type ShellPrefsAction } from "@/lib/shell-prefs";
import { useNarrow } from "@/lib/use-narrow";
import { cx } from "@/lib/cx";
import { useThemeChoice } from "@/lib/use-theme";
import { CreateProjectDialog } from "./CreateProjectDialog";
import { Inert } from "./Inert";
import { PromoCard } from "./PromoCard";
import { SearchDialog } from "./SearchDialog";
import { SettingsDialog } from "./SettingsDialog";
import { ShellStateProvider, useShell } from "./ShellContext";
import { Sidebar } from "./Sidebar";
import { IconDocument, IconDownload, IconExpand, IconWorkArea } from "./icons";
import styles from "./shell.module.css";

export interface ShellProps {
  readonly children: ReactNode;
  /** Injectable confirm for the Recents menu's Delete (tests). */
  readonly confirmImpl?: (message: string) => boolean;
}

function safeStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function prefsReducer(prefs: ShellPrefs, action: ShellPrefsAction): ShellPrefs {
  const next = reduceShellPrefs(prefs, action);
  writeShellPrefs(safeStorage(), next);
  return next;
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
  const { workAreaOpen, toggleWorkArea } = useShell();
  const narrow = useNarrow();
  const [prefs, dispatchPrefs] = useReducer(prefsReducer, DEFAULT_SHELL_PREFS, () => (typeof window === "undefined" ? DEFAULT_SHELL_PREFS : readShellPrefs(safeStorage())));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [themeChoice, setThemeChoice] = useThemeChoice();
  const [recents, setRecents] = useState<readonly RecentEntry[]>([]);
  const confirmDelete = useCallback((message: string) => (confirmImpl ? confirmImpl(message) : window.confirm(message)), [confirmImpl]);

  const loadRecents = useCallback(() => {
    let cancelled = false;
    fetch("/api/history")
      .then(async (res) => (res.ok ? ((await res.json()) as { entries: RecentEntry[] }).entries : []))
      .then((entries) => {
        if (!cancelled) setRecents(entries);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  // Recents follow the history store; refetched on every navigation so a new job or a finished one shows up.
  useEffect(() => loadRecents(), [pathname, loadRecents]);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
  }, []);
  const closeSettings = useCallback(() => {
    setSettingsOpen(false);
  }, []);
  const closeSearch = useCallback(() => {
    setSearchOpen(false);
  }, []);
  const closeCreate = useCallback(() => {
    setCreateOpen(false);
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
          onOpenCreateProject={() => {
            if (narrow) closeDrawer();
            setCreateOpen(true);
          }}
          onDeleteRecent={(entry) => {
            void deleteRecent(entry);
          }}
        />
      </aside>
      <div className={styles.main}>
        <header className={styles.topbar}>
          <button type="button" className={styles.menuButton} aria-label="Expand sidebar" title="Expand sidebar" aria-expanded={asideOpen} onClick={() => {
              setDrawerOpen(true);
            }}>
            <IconExpand />
          </button>
          {bar.kind === "task" ? <span className={styles.topbarTitle}>{bar.title}</span> : null}
          <div className={styles.topbarActions}>
            {bar.kind === "home" ? (
              <>
                <Inert label="Changelog" className={styles.iconButton} align="end"><IconDocument /></Inert>
                <Inert label="Download" className={styles.secondaryButton} align="end"><IconDownload /> Download</Inert>
              </>
            ) : null}
            {bar.kind === "task" && !narrow ? (
              // work-area-button@1440: shows / hides the task page's Work Area panel (STORY_023); the reference has none at 390
              <button type="button" className={styles.iconButton} aria-label="Work area" title="Work area" aria-pressed={workAreaOpen} onClick={toggleWorkArea}>
                <IconWorkArea />
              </button>
            ) : null}
          </div>
        </header>
        <div className={styles.content}>{children}</div>
      </div>
      {bar.kind === "home" && !narrow && !prefs.promoDismissed ? (
        <PromoCard
          onDismiss={() => {
            dispatchPrefs({ type: "dismiss-promo" });
          }}
        />
      ) : null}
      <SettingsDialog open={settingsOpen} choice={themeChoice} onChoose={setThemeChoice} onClose={closeSettings} />
      <SearchDialog open={searchOpen} recents={recents} onClose={closeSearch} />
      <CreateProjectDialog open={createOpen} onClose={closeCreate} />
    </div>
  );
}
