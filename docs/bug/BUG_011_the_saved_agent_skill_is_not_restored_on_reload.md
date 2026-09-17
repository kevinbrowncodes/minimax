# BUG_011 — The saved agent skill is not restored when the page loads

**Status:** Resolved (2026-09-17; see Resolution)
**Found by:** STORY_053's e2e — `PATCH /api/settings {agentSkill: "minimax-h3-director-thirst-trap-chain"}` then a fresh page: the chip read *Agent on · Thirst trap*

## Summary

STORY_050 saves the skill chosen in the chip's menu as the `agentSkill` setting so it survives a reload. On a fresh page the composer's skills effect runs once on mount with the `settings` it captured at that moment — the Shell's `DEFAULT_SETTINGS`, because `/api/settings` is still loading — so `chosen` is always `undefined` and the first folder is picked. The setting is written correctly (the panel and the route are fine) and never read back on load.

## Steps to Reproduce

1. On the deployed app, turn the chip on, open ⌄ and pick *Chain director*; `GET /api/settings` shows `"agentSkill": "minimax-h3-director-thirst-trap-chain"`.
2. Reload the page, open video mode, turn the chip on.
3. The chip reads *Agent on · Thirst trap*.

## Expected vs Actual Behaviour

- **Expected:** the chip comes back with the saved skill — *Agent on · Chain director*.
- **Actual:** the first skill folder, whatever was saved; only a reopened run (`/?agentRun=`) or a new pick changes it.

## Root Cause

`Composer.tsx`'s skills effect (`useEffect(..., [])`) dispatches `agent-skills` with `chosen: settings.agentSkill ?? initialAgentRun?.skill`; `settings` is the context value at mount, which the Shell fills asynchronously after its own `fetch("/api/settings")`. The component tests hand the settings in synchronously, so they pass; the e2e of STORY_050 never reloaded after a pick.

## Acceptance Criteria

- [x] After the settings arrive (or change), the composer applies `agentSkill` when the skills list has it: a second effect on `settings.agentSkill` and the loaded skills dispatches `agent-skill`.
- [x] A pick in the menu still applies at once and writes the setting (unchanged); the effect's re-dispatch of the same id is a no-op.
- [x] STORY_053's e2e cases set the skill through the API before the page loads and assert the chip's label; `AgentChip.test` gains a case where the settings context changes after mount.

## Resolution

Fixed 2026-09-17 in STORY_053's commit: `Composer.tsx` gains `useEffect(() => { if (settings.agentSkill !== undefined) dispatch({ type: "agent-skill", skillId: settings.agentSkill }); }, [settings.agentSkill, state.agent.skills])` — the reducer ignores an id the list does not have. Covered by `AgentChip.test.tsx` (the settings arriving after the skills) and the two STORY_053 e2e cases that set the skill through the API.
