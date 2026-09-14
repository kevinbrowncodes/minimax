"use client";
import { useCallback, useState } from "react";
import { applyChoice, readStoredChoice, storeChoice, type ThemeChoice, DEFAULT_CHOICE } from "./theme";

/**
 * The theme choice as React state (STORY_019). The initial value is read from storage on the client (the server has no
 * storage and renders the default; nothing painted at mount depends on the choice — the Settings dialog is closed and
 * the boot script has already set the attribute — so there is no flash and no hydration mismatch). Setting a choice
 * applies it to the document element and stores it.
 */
export function useThemeChoice(): readonly [ThemeChoice, (choice: ThemeChoice) => void] {
  const [choice, setChoiceState] = useState<ThemeChoice>(() => (typeof window === "undefined" ? DEFAULT_CHOICE : readStoredChoice(safeStorage())));
  const setChoice = useCallback((next: ThemeChoice) => {
    setChoiceState(next);
    applyChoice(document.documentElement, next);
    storeChoice(safeStorage(), next);
  }, []);
  return [choice, setChoice] as const;
}

function safeStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
