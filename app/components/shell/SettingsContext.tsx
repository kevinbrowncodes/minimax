"use client";
import { createContext, useContext } from "react";
import { DEFAULT_SETTINGS, type Settings } from "@/lib/settings";

/** The server-wide settings, fetched by the Shell and read by pages (STORY_034 the watermark, STORY_040 the video plugin). */
export interface SettingsState {
  readonly settings: Settings;
  readonly update: (patch: Partial<Settings>) => void;
}

export const SettingsContext = createContext<SettingsState>({ settings: DEFAULT_SETTINGS, update: () => undefined });

export function useSettings(): SettingsState {
  return useContext(SettingsContext);
}
