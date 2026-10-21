# CHORE_047 — Outtakes on the scene 1 page

**Status:** Done (2026-10-21)

## Summary

`tools/rounds/template/page-front.html` gains the Outtakes (NG) section the back-scene page already had, so a scene 1 take scrapped at a join or for a lost item is shown on its own page instead of only on disk.

## Why

The rome context test scrapped two scene 1 takes at the 20 s join (2026-10-20/21) and `addouttake.py` could not add them: the front template had no outtakes block. The owner's rule (2026-10-19): any jump cut goes to the NG pile, which must be visible to him.

## Changes

- [x] The outtakes CSS, the section and its script copied from `page-back.html` into `page-front.html` (the intro line reworded for scene 1).

## Testing

- **Unit / integration / e2e:** not applicable — a template for operator rating pages; nothing in the app or its tests reads it. Checked by publishing the rome context test's page with its two NG cards. The pre-push hook still runs the full gate.
