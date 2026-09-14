/**
 * The shell preferences as an external store (BUG_005). React hydrates with the defaults (the server snapshot) and
 * takes the stored preferences right after, through useSyncExternalStore, so the first client render never disagrees
 * with the server's HTML — a mismatch made React 19 re-create the root and drop the boot script's `data-theme`.
 */
import { DEFAULT_SHELL_PREFS, readShellPrefs, reduceShellPrefs, writeShellPrefs, type ShellPrefs, type ShellPrefsAction } from "./shell-prefs";

function safeStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

let cached: ShellPrefs | undefined;
const listeners = new Set<() => void>();

/** The stored preferences, read once per page; the same object until a dispatch, as useSyncExternalStore requires. */
export function getShellPrefs(): ShellPrefs {
  cached ??= readShellPrefs(safeStorage());
  return cached;
}

export function getServerShellPrefs(): ShellPrefs {
  return DEFAULT_SHELL_PREFS;
}

export function dispatchShellPrefs(action: ShellPrefsAction): void {
  cached = reduceShellPrefs(getShellPrefs(), action);
  writeShellPrefs(safeStorage(), cached);
  for (const listener of listeners) listener();
}

export function subscribeShellPrefs(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Tests: forget what was read so the next read sees the storage afresh. */
export function resetShellPrefsStore(): void {
  cached = undefined;
}
