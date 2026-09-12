# STORY_011 — The seven-step gate runs on every push from one script, with coverage floors

**Epic:** [EPIC_002](../epic/EPIC_002_the_app_has_a_skeleton_a_stub_generation_server_and_a_test_gate.md)
**Status:** Done (2026-09-12, on the Spark)
**Created:** 2026-09-12

As the owner, I want `git push origin develop` to refuse a push unless typecheck, lint, unit, integration, build and e2e are all green in the gate container, with coverage floors that only ever go up, so that "run the steps by hand before every push" stops being a promise and becomes a mechanism.

## Current state

`tools/gate/run.sh` runs the six steps on request (STORY_007–010). Nothing runs them automatically; there is no coverage measurement; [CLAUDE.md → §4](../../CLAUDE.md#4-dev-workflow) says the hook is added by this epic.

## UI Mockup

N/A (tooling).

## Acceptance Criteria

- [x] `tools/gate/run.sh` gains `--from <n>` to restart from a step after a fix, prints each step's wall time, and exits with the failing step's name and number in its last line.
- [x] Coverage: Vitest with `@vitest/coverage-v8` on the unit and integration lanes, reported per file; thresholds (`lines`, `branches`, `functions`, `statements`) set in `app/vitest.config.ts` and `tools/stub-generation-server/vitest.config.ts` from the **measured** baseline of STORY_007–010 minus 2 points, and the numbers written in this story's Done note. `tools/gate/coverage-rank.ts` prints the files with the most missing branches when a threshold fails, so the defensible place to add a test is obvious ([CLAUDE.md → §4](../../CLAUDE.md#4-dev-workflow), the coverage-gate paragraph). **Thresholds are never lowered.**
- [x] Husky pre-push hook: `husky` as a dev dependency with the `prepare` script, `.husky/pre-push` committed; when the push targets `develop` it runs `tools/gate/run.sh` (all six steps, inside the gate container — the hook itself is a shell script calling `docker`, so the host needs no Node); any other branch is pushed without the gate; `--no-verify` is documented as emergency-only with the justification required in the commit message.
- [x] The gate's total duration on this box is measured and recorded here and in README → Testing; if it exceeds 15 minutes, the story records where the time goes (build, browsers) as input for a later chore, not as a reason to skip steps.
- [x] README → Testing is filled in: the three layers and what runs where, the commands, the coverage floors, the fixture codec chosen in STORY_010, and how the hook runs; CLAUDE.md's "until that hook exists, run the steps by hand" sentence is proposed for removal to the owner (CLAUDE.md changes need approval).

## Technical Notes

- `husky` writes `core.hooksPath=.husky` into `.git/config` during `pnpm install`, which runs inside the gate container with `.git` bind-mounted, so the hook is active for the host's `git` too. If the mount makes that unreliable, `tools/gate/install-hooks.sh` sets `core.hooksPath` from the host explicitly; recorded here either way.
- The hook must not run the gate when the push is to a non-`develop` branch or when nothing is pushed (`git push` with no new commits), to keep tag and doc pushes cheap.
- Coverage collection excludes generated files, `e2e/**`, config files and the placeholder page.

## Testing Plan

- **Unit** — `tools/gate/coverage-rank.test.ts`: given a coverage-summary JSON, files are ranked by missing branches descending and ties by missing lines; the output names the file and the counts.
- **Integration** — `tools/gate/run.test.sh` (shellcheck-clean bash, run inside the gate container): a fake step that fails makes `run.sh` exit non-zero with that step named in the last line, and `--from` skips earlier steps. The pre-push hook is exercised with a dry-run push to a throwaway local remote (`git push --dry-run` triggers hooks) to a non-`develop` branch (no gate) and to `develop` (gate invoked; the gate's own steps are stubbed by an env var for this test only).
- **E2E** — N/A: no UI.
- **Gate** — the full seven steps run once by hand from a clean checkout of `develop` inside the gate container, and the duration goes in the Done note.

## Estimated Complexity

S–M

## Done note (2026-09-12)

- **`tools/gate/run.sh`:** `--from N`, per-step wall time, the failing step's name and number in the last line and as the exit code; step 5 also builds the production image (the STORY_009 lesson: `pnpm build` can pass while the image breaks); on a failed unit or integration step the files with the most uncovered branches are printed. `GATE_DRY_RUN=<cmd>` substitutes the container for `tools/gate/run.test.sh`, which proves the sequencing (6 checks: all pass; lint failure → exit 2 with `lint` named; e2e failure → exit 6; `--from 3` skips typecheck and lint; named steps run in gate order).
- **Coverage:** `@vitest/coverage-v8` on every Vitest lane, `json-summary` + `text-summary`. Baselines measured on 2026-09-12 and floors set at baseline − 2 (rounded down): app unit lines 89.74 / branches 86.66 / functions 92.3 / statements 89.15 → **87 / 84 / 90 / 87**; app integration 92.47 / 75.8 / 100 / 92.23 → **90 / 73 / 98 / 90**; stub 95.11 / 84.03 / 100 / 90.9 → **93 / 82 / 98 / 88**; the gate helper package 62.5 / 63.15 / 100 / 68.42 → **60 / 61 / 98 / 66** (its CLI block is exercised by hand, not by a test). `tools/gate/src/coverage-rank.ts` (+ 2 tests) ranks by missing branches, then lines.
- **Hook:** `husky` 9.1.7 in the root `devDependencies` with `prepare: husky`; `pnpm install` inside the gate container wrote `core.hooksPath=.husky/_` into the bind-mounted `.git/config` and generated the shims, so the host's `git` runs them with no Node on the host. `.husky/pre-push` reads the ref lines on stdin and runs `tools/gate/run.sh` only for `refs/heads/develop`. Proven with dry-run pushes to a throwaway bare remote: `develop:feature-x` → no gate; `develop:develop` → `[pre-push] push to develop — running the gate` and the six (stubbed) steps. `tools/gate/install-hooks.sh` re-points `core.hooksPath` if a fresh clone's install did not.
- **Measured gate duration on the Spark:** **27 s** with a warm image cache (typecheck 2, lint 4, unit 3, integration 1, build 10 incl. the image, e2e 6); **45 s** when the lockfile changed (the image's dependency stage rebuilt). Under the 15-minute bound by a wide margin; the push that lands this story is the first to run the gate through the hook itself.
- **README → Testing** completed. **CLAUDE.md:** the §4 sentence "until that hook exists, run the steps by hand before every push and say so in the summary" is now stale; its removal is proposed to the owner (CLAUDE.md changes need approval).
