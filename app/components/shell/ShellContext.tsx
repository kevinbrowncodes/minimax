"use client";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

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
}

const noop = (): void => undefined;

export const ShellContext = createContext<ShellState>({ workAreaOpen: true, toggleWorkArea: noop, previewOpen: false, openPreview: noop, closePreview: noop, pageActions: undefined, setPageActions: noop });

export function useShell(): ShellState {
  return useContext(ShellContext);
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
  const value = useMemo<ShellState>(() => ({ workAreaOpen, toggleWorkArea, previewOpen, openPreview, closePreview, pageActions, setPageActions }), [workAreaOpen, toggleWorkArea, previewOpen, openPreview, closePreview, pageActions]);
  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}
