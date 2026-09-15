"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

/** The toast's life: two seconds for a confirmation (STORY_029); longer when it carries an Undo (STORY_030, unmeasured). */
export const TOAST_MS = 2000;
export const UNDO_TOAST_MS = 6000;
export type ToastTone = "success" | "info";
export interface ToastState {
  /** Changes on every notify so an identical message restarts the clock. */
  readonly id: number;
  readonly content: ReactNode;
  readonly tone: ToastTone;
  readonly durationMs: number;
}
export interface NotifyOptions {
  readonly tone?: ToastTone;
  readonly durationMs?: number;
}

/**
 * What the Shell shares with the task page it frames (STORY_023): whether the Work Area panel is shown — the top bar's
 * Work area button toggles it and the choice lasts the session — and whether the page's preview pane is open, which
 * hides the panel while it is; the button then closes the pane and brings the panel back. Outside a provider the panel
 * is shown and the pane never opens, so a page renders its resting state in a test without one.
 */
export interface ShellState {
  readonly workAreaOpen: boolean;
  readonly toggleWorkArea: () => void;
  readonly previewOpen: boolean;
  readonly openPreview: () => void;
  readonly closePreview: () => void;
  /** What the page puts in the top bar at 390 (STORY_024: the Assets page's Search and Filter buttons); undefined when it has nothing. */
  readonly pageActions: ReactNode;
  readonly setPageActions: (actions: ReactNode) => void;
  /**
   * STORY_029: the toast at the top of the page ("Task pinned"); the Shell renders it, any page or the sidebar shows one.
   * STORY_030: a tone (green ✓ or the ℹ info pill), a duration, and content that may hold links (Undo / Settings).
   */
  readonly toast: ToastState | undefined;
  readonly notify: (content: ReactNode, options?: NotifyOptions) => void;
  readonly clearToast: () => void;
}

const noop = (): void => undefined;

export const ShellContext = createContext<ShellState>({ workAreaOpen: true, toggleWorkArea: noop, previewOpen: false, openPreview: noop, closePreview: noop, pageActions: undefined, setPageActions: noop, toast: undefined, notify: noop, clearToast: noop });

export function useShell(): ShellState {
  return useContext(ShellContext);
}

/**
 * Puts a page's chrome in the Shell's top bar for as long as the page is mounted (STORY_024/025). Pass a memoised
 * node: the effect re-runs when the node changes, so an unmemoised one would loop through the Shell's re-render.
 */
export function usePageActions(actions: ReactNode): void {
  const { setPageActions } = useShell();
  useEffect(() => {
    setPageActions(actions);
    return () => {
      setPageActions(undefined);
    };
  }, [setPageActions, actions]);
}

export interface ShellStateProviderProps {
  /** The page the preview belongs to (the pathname): navigating away closes it, because the next page has its own key. */
  readonly scope: string;
  readonly children: ReactNode;
}

/** Holds the shell state for the pages under it; the Shell wraps its content in one, and the page tests wrap the page. */
export function ShellStateProvider({ scope, children }: ShellStateProviderProps) {
  const [workAreaOpen, setWorkAreaOpen] = useState(true);
  const [previewFor, setPreviewFor] = useState<string | undefined>(undefined);
  const [pageActions, setPageActions] = useState<ReactNode>(undefined);
  const [toast, setToast] = useState<ToastState | undefined>(undefined);
  const toastCount = useRef(0);
  const notify = useCallback((content: ReactNode, options?: NotifyOptions) => {
    toastCount.current += 1;
    setToast({ id: toastCount.current, content, tone: options?.tone ?? "success", durationMs: options?.durationMs ?? TOAST_MS });
  }, []);
  const clearToast = useCallback(() => {
    setToast(undefined);
  }, []);
  const previewOpen = previewFor === scope;
  const toggleWorkArea = useCallback(() => {
    if (previewFor === scope) {
      setPreviewFor(undefined);
      setWorkAreaOpen(true);
    } else {
      setWorkAreaOpen((open) => !open);
    }
  }, [previewFor, scope]);
  const openPreview = useCallback(() => {
    setPreviewFor(scope);
  }, [scope]);
  const closePreview = useCallback(() => {
    setPreviewFor(undefined);
  }, []);
  const value = useMemo<ShellState>(() => ({ workAreaOpen, toggleWorkArea, previewOpen, openPreview, closePreview, pageActions, setPageActions, toast, notify, clearToast }), [workAreaOpen, toggleWorkArea, previewOpen, openPreview, closePreview, pageActions, toast, notify, clearToast]);
  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}
