# CHORE_001 — Recon scripts run on Node's own TypeScript support instead of tsx

**Status:** Done (2026-09-12)

## Summary

Run `recon/src/*.ts` with `node` directly (Node 26 strips types natively) and drop `tsx`.

## Why

tsx compiles with esbuild's `keepNames`, which injects a `__name` helper into every function it emits. Playwright serialises the callback given to `page.evaluate` and runs it in the browser, where that helper does not exist — the first authenticated probe died on `ReferenceError: __name is not defined` before reading anything. Every recon script from STORY_002 on runs code in the page, so the transform has to go. Node's type stripping performs no transform, so what is written is what runs.

## Changes

- [x] `recon/package.json`: `login` and `check` scripts call `node src/<script>.ts`; `tsx` removed from devDependencies.
- [x] Relative imports use the real `.ts` extension; `recon/tsconfig.json` sets `allowImportingTsExtensions` (legal because it already sets `noEmit`).
- [x] No enums, namespaces or parameter properties are used (Node strips only erasable syntax).

## Testing

- **Unit** — the existing `session.test.ts` (9 cases) runs unchanged under Vitest, which resolves `.ts` imports itself.
- **Integration / E2E** — N/A (no runtime behaviour changed; the scripts still hit a third-party site behind a login, outside the gate). Manual: `pnpm recon:check` prints `session: signed-in` after the switch.
