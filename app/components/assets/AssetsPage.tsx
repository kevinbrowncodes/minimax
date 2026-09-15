"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ASSET_CHIPS, ASSET_TABS, assetItems, assetKey, assetName, fileNameFor, referenceUrl, type AssetChip, type AssetItem, type AssetTab } from "@/lib/assets-filter";
import { cx } from "@/lib/cx";
import type { HistoryEntry } from "@/lib/history-store";
import { useShell } from "@/components/shell/ShellContext";
import { IconArrowUpRight, IconClose, IconCopy, IconDownload, IconFilter, IconImage, IconLocate, IconMore, IconPlay, IconSearch, IconStar, IconTrash, IconVideo } from "@/components/shell/icons";
import styles from "./assets.module.css";

export interface AssetsPageProps {
  readonly fetchImpl?: typeof fetch;
  /** Injected for tests; the page confirms with window.confirm. */
  readonly confirmImpl?: (message: string) => boolean;
}

interface AssetMenuProps {
  readonly item: AssetItem;
  readonly label: string;
  /** The preview's copy of the menu leads with Download and Copy link (STORY_024 › Departures, STORY_032). */
  readonly withDownload?: boolean;
  readonly onDelete: () => void;
  readonly onStar: (entry: HistoryEntry) => void;
  readonly onCopyLink: (entry: HistoryEntry) => void;
  readonly onClose: () => void;
}

/**
 * assets-tile-menu-open@1440: Locate in task, Send to new task, Star, Delete (red); 198 wide, 36 px entries. STORY_032:
 * Star / Unstar is real (behaviour-assets-star-03 reads Unstar); an image's menu is Locate in task and Delete.
 */
function AssetMenu({ item, label, withDownload = false, onDelete, onStar, onCopyLink, onClose }: AssetMenuProps) {
  const { entry } = item;
  const taskPath = `/task/${encodeURIComponent(entry.id)}`;
  return (
    <div className={styles.menu} role="menu" aria-label={label}>
      {withDownload && item.kind === "video" ? (
        <>
          <a href={`/api/jobs/${encodeURIComponent(entry.id)}/result?download`} download={fileNameFor(entry)} role="menuitem" className={styles.menuItem} onClick={onClose}><IconDownload /> Download</a>
          <button type="button" role="menuitem" className={styles.menuItem} onClick={() => { onClose(); onCopyLink(entry); }}><IconCopy /> Copy link</button>
        </>
      ) : null}
      <Link href={taskPath} role="menuitem" className={styles.menuItem} onClick={onClose}><IconLocate /> Locate in task</Link>
      {item.kind === "video" ? (
        <>
          <Link href={`${taskPath}?extend`} role="menuitem" className={styles.menuItem} onClick={onClose}><IconArrowUpRight /> Send to new task</Link>
          <button type="button" role="menuitem" className={styles.menuItem} onClick={() => { onClose(); onStar(entry); }}><IconStar /> {entry.starred === true ? "Unstar" : "Star"}</button>
        </>
      ) : null}
      <button type="button" role="menuitem" className={cx(styles.menuItem, styles.menuDanger)} onClick={onDelete}><IconTrash /> Delete</button>
    </div>
  );
}

/**
 * Assets (STORY_015): every finished video as a tile, a preview modal, download, open task, delete from history.
 * STORY_024 gives it the reference's shape: the three tabs, the chips' shared empty state, the 252 × 182 tile with the
 * ⋯ menu (Locate in task / Send to new task / Star / Delete), the preview's × · name · ⋯ head, and the 390 layout
 * whose Search and Filter buttons live in the Shell's top bar. STORY_032 fills Star (the tab, Star / Unstar, a toast),
 * From you and the Images chip (the reference images kept with each job, previewable, deletable) and the preview's
 * Copy link.
 */
export function AssetsPage({ fetchImpl, confirmImpl }: AssetsPageProps) {
  const doFetch = fetchImpl ?? fetch;
  const confirmDelete = confirmImpl ?? ((message: string) => window.confirm(message));
  const { setPageActions, notify } = useShell();
  const [entries, setEntries] = useState<readonly HistoryEntry[] | undefined>(undefined);
  const [tab, setTab] = useState<AssetTab>("From agent");
  const [chip, setChip] = useState<AssetChip>("All");
  const [query, setQuery] = useState("");
  const [menuFor, setMenuFor] = useState<string | undefined>(undefined);
  const [previewMenuOpen, setPreviewMenuOpen] = useState(false);
  const [previewKey, setPreviewKey] = useState<string | undefined>(undefined);
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

  const shown = entries ? assetItems(entries, { chip, query, tab }) : [];
  // the preview follows the list, so a star or a delete is reflected in it
  const preview = previewKey === undefined ? undefined : (entries ? assetItems(entries, { chip: "All", query: "", tab: "From agent" }).concat(assetItems(entries, { chip: "Images", query: "", tab: "From you" })) : []).find((item) => assetKey(item) === previewKey);
  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (preview && !el.open) el.showModal();
    if (!preview && el.open) el.close();
  }, [preview]);

  const openPreview = (item: AssetItem, from: HTMLElement): void => {
    lastTile.current = from;
    setPreviewKey(assetKey(item));
  };
  const closePreview = (): void => {
    setPreviewKey(undefined);
    setPreviewMenuOpen(false);
    lastTile.current?.focus();
  };
  const remove = async (item: AssetItem): Promise<void> => {
    setMenuFor(undefined);
    setPreviewMenuOpen(false);
    if (item.kind === "video") {
      if (!confirmDelete(`Delete "${item.entry.title}" from history? The file on the Spark is untouched.`)) return;
      if (previewKey === assetKey(item)) setPreviewKey(undefined);
      await doFetch(`/api/history/${encodeURIComponent(item.entry.id)}`, { method: "DELETE" });
    } else {
      // STORY_032: the reference image only; the task stays
      if (!confirmDelete(`Delete "${item.ref.name}"? The image is removed; the task stays.`)) return;
      if (previewKey === assetKey(item)) setPreviewKey(undefined);
      await doFetch(referenceUrl(item.entry, item.ref), { method: "DELETE" });
    }
    await load();
  };
  /** STORY_032: Star / Unstar — a PATCH, the list refetched, the reference's "Starred" toast (behaviour-assets-star-01). */
  const star = async (entry: HistoryEntry): Promise<void> => {
    const starred = entry.starred !== true;
    const res = await doFetch(`/api/history/${encodeURIComponent(entry.id)}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ starred }) }).catch(() => undefined);
    await load();
    if (res?.ok === true) notify(starred ? "Starred" : "Unstarred");
    else notify("That did not save — the app's server did not answer", { tone: "info" });
  };
  /** STORY_032: the preview's Copy link — the result's URL on the clipboard. */
  const copyLink = (entry: HistoryEntry): void => {
    const link = `${window.location.origin}/api/jobs/${encodeURIComponent(entry.id)}/result`;
    const clipboard = typeof navigator === "undefined" ? undefined : navigator.clipboard;
    if (!clipboard) {
      notify(`Clipboard unavailable — the link is ${link}`, { tone: "info" });
      return;
    }
    clipboard.writeText(link).then(
      () => { notify("Link copied"); },
      () => { notify(`Clipboard unavailable — the link is ${link}`, { tone: "info" }); },
    );
  };

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
              {c}
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
          {shown.map((item) => {
            const name = assetName(item);
            const key = assetKey(item);
            const src = item.kind === "video" ? `/api/jobs/${encodeURIComponent(item.entry.id)}/poster` : referenceUrl(item.entry, item.ref);
            return (
              <article key={key} className={styles.tile} data-testid="asset-tile" data-kind={item.kind} aria-label={name}>
                <button type="button" className={styles.poster} aria-label={`Preview ${name}`} onClick={(event) => { openPreview(item, event.currentTarget); }}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- the adapter's first frame or the kept image, served by our routes */}
                  <img src={src} alt="" onError={(event) => { event.currentTarget.style.display = "none"; }} />
                  <span className={styles.posterGlyph} aria-hidden="true">{item.kind === "video" ? <IconVideo /> : <IconImage />}</span>
                  {item.kind === "video" ? <span className={styles.playGlyph} aria-hidden="true"><IconPlay /></span> : null}
                </button>
                <div className={styles.name}>
                  <span className={styles.nameIcon} aria-hidden="true">{item.kind === "video" ? <IconVideo /> : <IconImage />}</span>
                  <span className={styles.nameText}>{name}</span>
                  <span className={styles.kebabWrap} data-kebab={key}>
                    <button type="button" className={styles.kebab} aria-label={`More actions for ${name}`} aria-haspopup="menu" aria-expanded={menuFor === key} onClick={() => { setMenuFor(menuFor === key ? undefined : key); }}><IconMore /></button>
                    {menuFor === key ? <AssetMenu item={item} label={`Actions for ${name}`} onDelete={() => void remove(item)} onStar={(entry) => void star(entry)} onCopyLink={copyLink} onClose={() => { setMenuFor(undefined); }} /> : null}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* narrow-assets-video-preview@390: × · the name · ⋯, the video under it (the 1440 dialog was not captured; it takes the same head) */}
      <dialog ref={dialog} className={styles.dialog} aria-label={preview ? assetName(preview) : "Preview"} onClose={closePreview} onClick={(event) => { if (event.target === dialog.current) closePreview(); }}>
        {preview ? (
          <>
            <div className={styles.dialogHead}>
              <button type="button" className={styles.dialogButton} aria-label="Close asset preview" onClick={closePreview}><IconClose /></button>
              <span className={styles.dialogTitle}>{assetName(preview)}</span>
              <span className={styles.kebabWrap} data-kebab="preview">
                <button type="button" className={styles.dialogButton} aria-label="More actions" aria-haspopup="menu" aria-expanded={previewMenuOpen} onClick={() => { setPreviewMenuOpen((open) => !open); }}><IconMore /></button>
                {previewMenuOpen ? <AssetMenu item={preview} label="Preview actions" withDownload onDelete={() => void remove(preview)} onStar={(entry) => void star(entry)} onCopyLink={copyLink} onClose={() => { setPreviewMenuOpen(false); }} /> : null}
              </span>
            </div>
            <div className={styles.dialogBody}>
              {preview.kind === "video" ? (
                <video className={styles.dialogVideo} controls playsInline preload="metadata" poster={`/api/jobs/${encodeURIComponent(preview.entry.id)}/poster`} src={`/api/jobs/${encodeURIComponent(preview.entry.id)}/result`} data-testid="preview-video">
                  <track kind="captions" />
                </video>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- the kept image, served by our route
                <img className={styles.dialogImage} src={referenceUrl(preview.entry, preview.ref)} alt={preview.ref.name} data-testid="preview-image" />
              )}
            </div>
          </>
        ) : null}
      </dialog>
    </main>
  );
}
