# STORY_028 — The last placeholders go: MaxHermes, MaxClaw, the More section and the "Help improve" switch

**Epic:** [EPIC_006](../epic/EPIC_006_what_minimax_local_kept_from_the_reference_works_for_the_video_workflow.md) — the first wiring story: a removal, so that every story after it wires something real
**Status:** Done (2026-09-15; approved by the owner's "proceed with … completing epic 6")
**Created:** 2026-09-15 — the owner, on the recon's findings: cut MaxHermes / MaxClaw and the More section ("Start now does nothing even there"), cut the "Help improve our services" switch, ignore the reference's new Daily check-in card

As the owner, I want the two product pages and the section that only held them gone, and the consent switch gone from Settings, so that what remains in the UI is either real or on EPIC_006's list to be made real.

## Current state

STORY_026 kept MaxHermes and MaxClaw because the owner said keep; STORY_027 then recorded that their only control, **Start now**, does nothing on the reference either (`behaviour-product-start-01/02`: no navigation, no tab, no dialog — `POST …/commerce/get_membership_info` only). The **More** section exists only to hold those two rows. Settings › General › Preferences has two switches: the watermark one, which STORY_034 makes real, and **Help improve our services**, a data-sharing consent (`update_data_contribution_setting`) with no local meaning. The reference has since gained a **Daily check-in** card in the sidebar (credits); ours has no credits.

## UI Mockup

The captures departed from: `page-maxhermes@1440`, `page-maxclaw@1440`, `sidebar-more-expanded@1440`, `settings-general@1440` (docs/recon/2026-09-14/). What changes:

```
sidebar (1440)                         Settings › General › Preferences
┌ New task            ┐                ┌ Appearance  [Light] [Dark] [System] ┐
│ Search              │                │ Preferences                          │
│ Plugins             │                │  Remove an "AI-generated" watermark  ●│   (the only row; real in STORY_034)
│ Assets              │                └──────────────────────────────────────┘
│ Connect mobile      │
│ Projects            │   ← no "More" header above Projects
│ Recents             │
```

## Acceptance Criteria

- [x] `/max-hermes` and `/max-claw` answer Next's 404; the sidebar has no **More** section (Projects follows Connect mobile directly at 1440 and in the 390 drawer); `shell-prefs` no longer stores `folded.more` (an old stored value still parses).
- [x] Settings › General › Preferences shows the watermark row only; "Help improve our services" is gone.
- [x] Nothing else changes: the Projects section, the guide and promo cards, the Recents menu, the rail, the theme and every real flow behave as before; `shell.spec.ts` and `dialogs.test.tsx` cover the "unchanged" halves.
- [x] No Daily check-in card is added (recorded here so nobody adds it for fidelity later).

## Departures from the reference

The reference shows MaxHermes / MaxClaw under More, the consent switch and the check-in card; MiniMax Local shows none — the owner's decision of 2026-09-15, with STORY_027's evidence that Start now is inert on the reference itself.

## Technical Notes

- Deleted: `app/app/max-hermes/`, `app/app/max-claw/`, `components/pages/ProductPage.tsx`, `PRODUCTS` in `lib/reference-pages.ts`, the More section in `Sidebar.tsx` (`SectionHeader` stays for Projects / Recents), the `more` key in `shell-prefs`' `folded` (reducer, defaults, parse), the second `PreferenceRow` in `SettingsDialog.tsx`, the `max-hermes` / `max-claw` entries of `route-title.ts`, the icons nothing uses.
- `removed.test.tsx` gains the names; `pages.test.tsx` loses the product case.

## Testing Plan

- **Unit** — `lib/shell-prefs.test.ts`: `folded` is `{ projects, recents }`, an old `{ more: … }` value parses; `lib/route-title.test.ts`: the two paths are `other`; `lib/reference-pages.test.ts`: no products.
- **Component** — `Sidebar.test.tsx`: no More header, Projects right after Connect mobile; `dialogs.test.tsx` / `UserMenu.test.tsx`: one switch; `removed.test.tsx`: MaxHermes, MaxClaw, More, "Help improve our services" absent on the home and in Settings.
- **Integration:** none.
- **E2E** — `shell.spec.ts`: the More-folding test goes; `/max-hermes` and `/max-claw` → 404 (added to the STORY_026 sweep); the BUG_005 reload test unfolds nothing (it used More — it will pin Dark mode with the sidebar collapsed instead).

## Estimated Complexity

Small — a deletion in five files and the tests that named them.

## Done (2026-09-15)

**Landed:** `/max-hermes`, `/max-claw`, `ProductPage.tsx`, the `PRODUCTS` content and their icons are gone; the sidebar has no More section (`shell-prefs`' `folded` is `{ projects, recents }`; a stored `more` is ignored, pinned by a unit test); Settings › General keeps the watermark row alone; `removed.test.tsx` and the `shell.spec.ts` sweep name MaxHermes, MaxClaw and the consent switch; the BUG_005 reload test now stores the collapsed sidebar instead of the More fold. No check-in card. Gate green by hand (typecheck, lint, 146 unit) and in the pre-push hook; deployed.
