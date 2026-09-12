# STORY_011 — The seven-step gate runs on every push from one script, with coverage floors

**Epic:** [EPIC_002](../epic/EPIC_002_the_app_has_a_skeleton_a_stub_generation_server_and_a_test_gate.md)
**Status:** Ready (drafted 2026-09-12)
**Created:** 2026-09-12

As the owner, I want `git push origin develop` to refuse a push unless typecheck, lint, unit, integration, build and e2e are all green in the gate container, with coverage floors that only ever go up, so that "run the steps by hand before every push" stops being a promise and becomes a mechanism.

## Current state

`tools/gate/run.sh` runs the six steps on request (STORY_007–010). Nothing runs them automatically; there is no coverage measurement; [CLAUDE.md → §4](../../CLAUDE.md#4-dev-workflow) says the hook is added by this epic.

## UI Mockup

N/A (tooling).

## Acceptance Criteria

- [ ] `tools/gate/run.sh` gains `--from <n>` to restart from a step after a fix, prints each step's wall time, and exits with the failing step's name and number in its last line.
- [ ] Coverage: Vitest with `@vitest/coverage-v8` on the unit and integration lanes, reported per file; thresholds (`lines`, `branches`, `functions`, `statements`) set in `app/vitest.config.ts` and `tools/stub-generation-server/vitest.config.ts` from the **measured** baseline of STORY_007–010 minus 2 points, and the numbers written in this story's Done note. `tools/gate/coverage-rank.ts` prints the files with the most missing branches when a threshold fails, so the defensible place to add a test is obvious ([CLAUDE.md → §4](../../CLAUDE.md#4-dev-workflow), the coverage-gate paragraph). **Thresholds are never lowered.**
- [ ] Husky pre-push hook: `husky` as a dev dependency with the `prepare` script, `.husky/pre-push` committed; when the push targets `develop` it runs `tools/gate/run.sh` (all six steps, inside the gate container — the hook itself is a shell script calling `docker`, so the host needs no Node); any other branch is pushed without the gate; `--no-verify` is documented as emergency-only with the justification required in the commit message.
- [ ] The gate's total duration on this box is measured and recorded here and in README → Testing; if it exceeds 15 minutes, the story records where the time goes (build, browsers) as input for a later chore, not as a reason to skip steps.
- [ ] README → Testing is filled in: the three layers and what runs where, the commands, the coverage floors, the fixture codec chosen in STORY_010, and how the hook runs; CLAUDE.md's "until that hook exists, run the steps by hand" sentence is proposed for removal to the owner (CLAUDE.md changes need approval).

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
