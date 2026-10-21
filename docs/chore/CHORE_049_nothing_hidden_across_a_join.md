# CHORE_049 — Nothing hidden across a join

**Status:** Done (owner's insight, 2026-10-21)

## Summary

`.claude/skills/minimax-h3-i2v-amg-scene/SKILL.md` (Build 2026-10-21-0130): a beat that covers part of him lasts about a beat (~2 s), and by the last 3.75 s of every shot everything that matters is back in view; a covering pose is never carried through the end hold into the next shot's opener.

## Why

The rome context test's take 2 wrapped the left arm behind the column for 8.5 s, across the 20 s join; the 3.75 s video context (STORY_080) never saw the wrist, and shot 3 redrew the bangle as a different bracelet (owner 2/5, 2026-10-21). Owner: 3.75 s was chosen to cover a beat and then some — it fails when the script stretches one hide over 8.5 s.

## Changes

- [x] The rule, with its evidence, in the skill's H3 section.

## Testing

- **Unit / integration / e2e:** not applicable — a skill; nothing in the app or its tests reads it. The rome context test's v2 shot 2 (no column wrap) is the first scripts under it. The pre-push hook still runs the full gate.
