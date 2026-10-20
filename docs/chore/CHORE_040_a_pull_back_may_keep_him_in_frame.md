# CHORE_040 — A pull-back may keep him in frame

**Status:** Done (owner's decision, 2026-10-19)
**Created:** 2026-10-19

## Summary

`.claude/skills/minimax-h3-i2v-amg-scene/SKILL.md`: one exception to "never write a camera move" — a slow pull-back, only when a beat would otherwise take him out of the frame, preferred in a scene's last shot, allowed in shots 1–2 with the join check as the safety net; a round goes back to a locked camera if more than half its takes are scrapped at a join because of it. Push-ins are never written: the owner pushes in during the edit. The script-supervisor skill's framing check tracks it. Build 2026-10-19-1800 → 2026-10-19-2130.

## Why

Sheet scene 2, take 1: standing up toward a low close camera put part of his face out of frame for about 3 s — the owner's biggest deduction (rated 4). He can push in during the edit but cannot push out when the subject is already cut off (2026-10-19). Evidence for the safety net: pull-backs held their joins in vines (4 of 7 shipped) and broke them in rome (8 of 8).

## Changes

- [x] The pull-back exception and the never-push-in rule in "Every shot ends at the framing it started at".
- [x] script-supervisor's framing check: face out of frame, the per-round pull-back fallback.
- [x] Build stamp 2026-10-19-2130.

## Testing

- **Unit / integration / e2e:** not applicable — prompt-writing and monitoring skills; nothing in the app or the tests reads them. The pre-push hook still runs the full gate.
