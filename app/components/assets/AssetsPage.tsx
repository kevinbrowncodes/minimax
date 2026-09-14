"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ASSET_CHIPS, ASSET_TABS, fileNameFor, filterAssets, narrowChipLabel, type AssetChip, type AssetTab } from "@/lib/assets-filter";
import { cx } from "@/lib/cx";
import type { HistoryEntry } from "@/lib/history-store";
import { useNarrow } from "@/lib/use-narrow";
import { Inert } from "@/components/shell/Inert";
import { useShell } from "@/components/shell/ShellContext";
import { IconArrowUpRight, IconClose, IconDownload, IconFilter, IconLocate, IconMore, IconPlay, IconSearch, IconStar, IconTrash, IconVideo } from "@/components/shell/icons";
import styles from "./assets.module.css";

export interface AssetsPageProps {
  readonly fetchImpl?: typeof fetch;
  /** Injected for tests; the page confirms with window.confirm. */
  readonly confirmImpl?: (message: string) => boolean;
}

interface AssetMenuProps {
  readonly entry: HistoryEntry;
  readonly label: string;
  /** The preview's copy of the menu leads with Download (STORY_024 › Departures). */
  readonly withDownload?: boolean;
  readonly onDelete: () => void;
  readonly onClose: () => void;
}

/** assets-tile-menu-open@1440: Locate in task, Send to new task, Star, Delete (red); 198 wide, 36 px entries. */
function AssetMenu({ entry, label, withDownload = false, onDelete, onClose }: AssetMenuProps) {
  const name = fileNameFor(entry);
  const taskPath = `/task/${encodeURIComponent(entry.id)}`;
  return (
    <div className={styles.menu} role="menu" aria-label={label}>
      {withDownload ? (
        <a href={`/api/jobs/${encodeURIComponent(entry.id)}/result?download`} download={name} role="menuitem" className={styles.menuItem} onClick={onClose}><IconDownload /> Download</a>
      ) : null}
      <Link href={taskPath} role="menuitem" className={styles.menuItem} onClick={onClose}><IconLocate /> Locate in task</Link>
      <Link href={`${taskPath}?extend`} role="menuitem" className={styles.menuItem} onClick={onClose}><IconArrowUpRight /> Send to new task</Link>
      <Inert role="menuitem" label="Star" className={styles.menuItem}><IconStar /> Star</Inert>
      <button type="button" role="menuitem" className={cx(styles.menuItem, styles.menuDanger)} onClick={onDelete}><IconTrash /> Delete</button>
    </div>
  );
}

/**
 * Assets (STORY_015): every finished video as a tile, a preview modal, download, open task, delete from history.
 * STORY_024 gives it the reference's shape: the three tabs, the chips' shared empty state, the 252 × 182 tile with the
 * ⋯ menu (Locate in task / Send to new task / Star / Delete), the preview's × · name · ⋯ head, and the 390 layout
 * whose Search and Filter buttons live in the Shell's top bar.
 */
export function AssetsPage({ fetchImpl, confirmImpl }: AssetsPageProps) {
  const doFetch = fetchImpl ?? fetch;
  const confirmDelete = confirmImpl ?? ((message: string) => window.confirm(message));
  const narrow = useNarrow();
  const { setPageActions } = useShell();
  const [entries, setEntries] = useState<readonly HistoryEntry[] | undefined>(undefined);
  const [tab, setTab] = useState<AssetTab>("From agent");
  const [chip, setChip] = useState<AssetChip>("All");
  const [query, setQuery] = useState("");
  const [menuFor, setMenuFor] = useState<string | undefined>(undefined);
  const [previewMenuOpen, setPreviewMenuOpen] = useState(false);
  const [previewId, setPreviewId] = useState<string | undefined>(undefined);
  // narrow-assets-all@390: the bar's Search shows the field, its Filter shows the tabs
  const [searchShown, setSearchShown] = useState(false);
  const [tabsShown, setTabsShown] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const lastTile = useRef<HTMLElement | null>(null);
  const searchInput = useRef<HTMLInputElement>(null);

  const fetchEntries = (): Promise<readonly HistoryEntry[]> =>
    doFetch("/api/history")
      .then(async (res) => ((await res.json()) as { entries: HistoryEntry[] }).entries)
      .catch(() => []);
  const load = (): Promise<void> => fetchEntries().then(setEntries);
  useEffect(() => {
    let cancelled = false;
    fetchEntries()
      .then((list) => {
        if (!cancelled) setEntries(list);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once on mount
  }, []);

  // The page's buttons in the Shell's top bar at 390 (ShellContext.pageActions); cleared when the page leaves.
  const toggleSearch = useCallback(() => {
    setSearchShown((shown) => !shown);
  }, []);
  const toggleTabs = useCallback(() => {
    setTabsShown((shown) => !shown);
  }, []);
  useEffect(() => {
    const actions: ReactNode = (
      <>
        <button type="button" className={styles.barButton} aria-label="Search" aria-pressed={searchShown} onClick={toggleSearch}><IconSearch /></button>
        <button type="button" className={styles.barButton} aria-label="Filter" aria-pressed={tabsShown} onClick={toggleTabs}><IconFilter /></button>
      </>
    );
    setPageActions(actions);
    return () => {
      setPageActions(undefined);
    };
  }, [setPageActions, searchShown, tabsShown, toggleSearch, toggleTabs]);
  useEffect(() => {
    if (searchShown) searchInput.current?.focus();
  }, [searchShown]);

  useEffect(() => {
    if (!menuFor && !previewMenuOpen) return;
    const close = (event: MouseEvent): void => {
      if (!(event.target instanceof Element) || !event.target.closest("[data-kebab]")) {
        setMenuFor(undefined);
        setPreviewMenuOpen(false);
      }
    };
    window.addEventListener("mousedown", close);
    return () => {
      window.removeEventListener("mousedown", close);
    };
  }, [menuFor, previewMenuOpen]);

  const preview = entries?.find((e) => e.id === previewId);
  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (preview && !el.open) el.showModal();
    if (!preview && el.open) el.close();
  }, [preview]);

  const openPreview = (id: string, from: HTMLElement): void => {
    lastTile.current = from;
    setPreviewId(id);
  };
  const closePreview = (): void => {
    setPreviewId(undefined);
    setPreviewMenuOpen(false);
    lastTile.current?.focus();
  };
  const remove = async (entry: HistoryEntry): Promise<void> => {
    setMenuFor(undefined);
    setPreviewMenuOpen(false);
    if (!confirmDelete(`Delete "${entry.title}" from history? The file on the Spark is untouched.`)) return;
    if (previewId === entry.id) setPreviewId(undefined);
    await doFetch(`/api/history/${encodeURIComponent(entry.id)}`, { method: "DELETE" });
    await load();
  };

  const shown = entries ? filterAssets(entries, { chip, query, tab }) : [];

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Assets</h1>
      <div className={cx(styles.tabs, tabsShown && styles.tabsShown)} role="tablist" aria-label="Assets">
        {ASSET_TABS.map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} className={cx(styles.tab, tab === t && styles.tabActive)} onClick={() => { setTab(t); }}>
            {t}
          </button>
        ))}
      </div>
      <div className={styles.toolbar}>
        <div className={styles.chips}>
          {ASSET_CHIPS.map((c) => (
            <button key={c} type="button" className={cx(styles.chip, chip === c && styles.chipActive)} aria-pressed={chip === c} onClick={() => { setChip(c); }}>
              {narrow ? narrowChipLabel(c) : c}
            </button>
          ))}
        </div>
        <label className={cx(styles.search, searchShown && styles.searchShown)}>
          <IconSearch />
          <input ref={searchInput} type="search" placeholder="Search by file or task name" aria-label="Search by file or task name" value={query} onChange={(event) => { setQuery(event.target.value); }} />
        </label>
      </div>

      {entries !== undefined && shown.length === 0 ? (
        // assets-tab-from-you@1440 / assets-filter-images@1440: the one empty state for every tab and chip without content
        <div className={styles.empty} data-testid="assets-empty">
          <p className={styles.emptyTitle}>No assets yet</p>
          <p className={styles.emptyText}>Files generated by AI and uploaded by you will appear here</p>
          <Link href="/" className={styles.primary}>+ New task</Link>
        </div>
      ) : (
        <div className={styles.grid}>
          {shown.map((entry) => {
            const name = fileNameFor(entry);
            return (
              <article key={entry.id} className={styles.tile} data-testid="asset-tile" aria-label={name}>
                <button type="button" className={styles.poster} aria-label={`Preview ${name}`} onClick={(event) => { openPreview(entry.id, event.currentTarget); }}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- the adapter's first frame, served by our route */}
                  <img src={`/api/jobs/${encodeURIComponent(entry.id)}/poster`} alt="" onError={(event) => { event.currentTarget.style.display = "none"; }} />
                  <span className={styles.posterGlyph} aria-hidden="true"><IconVideo /></span>
                  <span className={styles.playGlyph} aria-hidden="true"><IconPlay /></span>
                </button>
                <div className={styles.name}>
                  <span className={styles.nameIcon} aria-hidden="true"><IconVideo /></span>
                  <span className={styles.nameText}>{name}</span>
                  <span className={styles.kebabWrap} data-kebab={entry.id}>
                    <button type="button" className={styles.kebab} aria-label={`More actions for ${name}`} aria-haspopup="menu" aria-expanded={menuFor === entry.id} onClick={() => { setMenuFor(menuFor === entry.id ? undefined : entry.id); }}><IconMore /></button>
                    {menuFor === entry.id ? <AssetMenu entry={entry} label={`Actions for ${name}`} onDelete={() => void remove(entry)} onClose={() => { setMenuFor(undefined); }} /> : null}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* narrow-assets-video-preview@390: × · the name · ⋯, the video under it (the 1440 dialog was not captured; it takes the same head) */}
      <dialog ref={dialog} className={styles.dialog} aria-label={preview ? fileNameFor(preview) : "Preview"} onClose={closePreview} onClick={(event) => { if (event.target === dialog.current) closePreview(); }}>
        {preview ? (
          <>
            <div className={styles.dialogHead}>
              <button type="button" className={styles.dialogButton} aria-label="Close asset preview" onClick={closePreview}><IconClose /></button>
              <span className={styles.dialogTitle}>{fileNameFor(preview)}</span>
              <span className={styles.kebabWrap} data-kebab="preview">
                <button type="button" className={styles.dialogButton} aria-label="More actions" aria-haspopup="menu" aria-expanded={previewMenuOpen} onClick={() => { setPreviewMenuOpen((open) => !open); }}><IconMore /></button>
                {previewMenuOpen ? <AssetMenu entry={preview} label="Preview actions" withDownload onDelete={() => void remove(preview)} onClose={() => { setPreviewMenuOpen(false); }} /> : null}
              </span>
            </div>
            <div className={styles.dialogBody}>
              <video className={styles.dialogVideo} controls playsInline preload="metadata" poster={`/api/jobs/${encodeURIComponent(preview.id)}/poster`} src={`/api/jobs/${encodeURIComponent(preview.id)}/result`} data-testid="preview-video">
                <track kind="captions" />
              </video>
            </div>
          </>
        ) : null}
      </dialog>
    </main>
  );
}
