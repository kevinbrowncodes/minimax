# BUG_005 — Dark mode is lost on reload once a sidebar preference has been stored

**Status:** Resolved
**Found:** 2026-09-14 by the assistant, shooting STORY_025's dark captures with the More section unfolded: every "dark" screenshot came out light

## Summary

With **Dark mode** chosen in Settings, a reload renders the page **light** as soon as the browser holds any sidebar preference that differs from the defaults — the sidebar collapsed, More or Projects unfolded, the promo card or the Agents guide dismissed. With the default preferences the theme survives, which is the only case STORY_019's e2e checks.

## Steps to Reproduce

1. Settings › General › Appearance › **Dark mode**.
2. Unfold **More** in the sidebar (or collapse the sidebar, or dismiss the promo card).
3. Reload.

## Expected vs Actual Behaviour

- **Expected:** the page comes back dark, More still unfolded.
- **Actual:** More is unfolded and the page is light; `<html>` has no `data-theme` (checked with Playwright on the production build: `data-theme` is `null` and the body is `rgb(255, 255, 255)`; with the preferences cleared it is `dark` / `rgb(28, 28, 28)`).

## Root Cause

`Shell.tsx` initialised its preferences with `useReducer(…, () => readShellPrefs(localStorage))` — read **during the first client render**. The server renders the defaults, so the first client render disagrees with the HTML whenever the stored preferences differ; React 19 then throws the server tree away and renders the root from scratch (silently in production), and in re-creating `<html>`'s attributes it drops the `data-theme` the boot script had set before hydration. The theme never changed — the attribute carrying it did.

## Acceptance Criteria

- [x] The Shell hydrates with the default preferences and takes the stored ones after hydration without a mismatch: `lib/shell-prefs-store.ts` holds them behind `useSyncExternalStore` (server snapshot = defaults), so the boot script's `data-theme` is never disturbed.
- [x] Tests: `lib/shell-prefs-store.test.ts` (the store reads once, dispatches through the reducer, writes and notifies); `e2e/shell.spec.ts` — Dark mode chosen, More unfolded, reload → the page is still dark and More still unfolded (the case that reproduced it).

## Resolution

Fixed with STORY_025's commit (2026-09-14): the preferences moved into `lib/shell-prefs-store.ts`, read once on the client and served to React through `useSyncExternalStore` with the defaults as the server snapshot; `Shell.tsx` dispatches into the store. The reload e2e above pins it.
