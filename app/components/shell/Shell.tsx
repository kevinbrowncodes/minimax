"use client";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { topBarFor, type RecentEntry } from "@/lib/route-title";
import { useNarrow } from "@/lib/use-narrow";
import { cx } from "@/lib/cx";
import { Sidebar } from "./Sidebar";
import { IconDocument, IconDownload, IconMenu, IconWorkArea } from "./icons";
import styles from "./shell.module.css";

const INERT_TITLE = "Not part of MiniMax Local";

export interface ShellProps {
  readonly children: ReactNode;
}

/** The frame every page sits in: sidebar (a drawer below 900 px), top bar, content. STORY_012; Recents from history (STORY_014). */
export function Shell({ children }: ShellProps) {
  const pathname = usePathname();
  const narrow = useNarrow();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [recents, setRecents] = useState<readonly RecentEntry[]>([]);

  // Recents follow the history store; refetched on every navigation so a new job or a finished one shows up.
  useEffect(() => {
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
  }, [pathname]);
  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") closeDrawer();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [drawerOpen, closeDrawer]);

  const bar = topBarFor(pathname, recents);
  const asideOpen = narrow && drawerOpen;

  return (
    <div className={cx(styles.shell, !narrow && collapsed && styles.shellCollapsed)}>
      <div className={cx(styles.scrim, asideOpen && styles.scrimOpen)} onClick={closeDrawer} aria-hidden="true" data-testid="scrim" />
      <aside className={cx(styles.aside, asideOpen && styles.asideOpen)} aria-hidden={narrow && !drawerOpen ? true : undefined}>
        <Sidebar
          pathname={pathname}
          recents={recents}
          onNavigate={narrow ? closeDrawer : undefined}
          onCollapse={() => {
            if (narrow) closeDrawer();
            else setCollapsed((c) => !c);
          }}
        />
      </aside>
      <div className={styles.main}>
        <header className={styles.topbar}>
          <button type="button" className={styles.menuButton} aria-label="Open sidebar" aria-expanded={asideOpen} onClick={() => {
              setDrawerOpen(true);
            }}>
            <IconMenu />
          </button>
          {bar.kind === "task" ? <span className={styles.topbarTitle}>{bar.title}</span> : null}
          <div className={styles.topbarActions}>
            {bar.kind === "home" ? (
              <>
                <span className={styles.iconButton} role="button" aria-disabled="true" title={INERT_TITLE} aria-label="Changelog"><IconDocument /></span>
                <span className={styles.secondaryButton} role="button" aria-disabled="true" title={INERT_TITLE}><IconDownload /> Download</span>
              </>
            ) : null}
            {bar.kind === "task" ? <span className={styles.iconButton} role="button" aria-disabled="true" title={INERT_TITLE} aria-label="Work Area"><IconWorkArea /></span> : null}
          </div>
        </header>
        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );
}
