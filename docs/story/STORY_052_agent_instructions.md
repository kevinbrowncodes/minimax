# STORY_052 — Agent instructions

**Epic:** [EPIC_009](../epic/EPIC_009_agent_mode_a_director_writes_the_prompt_from_the_photo.md) — the sixth story. After [STORY_051](STORY_051_confirm_before_generating.md); before [STORY_053](STORY_053_the_chain_director.md), whose anchor is exactly what a saved scene carries
**Status:** Done (2026-09-17 — approved under the owner's blanket "continue story by story" of 05:20; built 14:00 → 14:15; gate steps 1–4 green by hand, the agent and composer specs 31/31 at both widths, the full e2e after; deployed once the Spark was free; the Done note below)
**Created:** 2026-09-17

As the owner, I want persistent **Agent instructions** — a title, a guideline, a switch and an optional reference image — that every run sends to the director after the skill, so that a set I have already described (the studio's photo and its anchor paragraph), a character, or a house rule ("the camera stays fixed unless the script moves it") is reused on every new photo without me or an assistant retyping it.

## Current state (read from the code, 2026-09-17 03:00 EDT)

- **The request** is `lib/agent-request.ts` › `assembleRequest(skill, image, notes, instructions = [])` (STORY_048): the skill's body as the system instruction, its references as text parts, the photo, the notes. The `instructions` parameter exists and is empty; nothing fills it.
- **Stores** follow one pattern — a JSON file beside `history.json`, read on every call, written atomically (`env-store`, `skill-store`, `settings-store`, `agent-run-store`). Uploaded reference images for jobs go through `lib/uploads.ts` (`uploadsDirFor(jobId)`, `safeFileName`, `saveReferenceFiles`, `referenceFilePath`, `removeReferenceFile`) and are served by `GET /api/history/:id/reference/:n`; the Assets page's **From you › Images** chip lists exactly those (`lib/assets-filter.ts` › `assetItems(entries, { tab: "From you", chip: "Images" })`, `assets-tab-from-you@1440`).
- **The chip's row** has the ⚙ (STORY_051) and a place for the ≡ (BACKLOG_009's map § 7: Flow's *Agent instructions* icon beside *Settings*).
- **The fake Vertex** (STORY_049) records every part it receives — `{ kind: "text", head }` / `{ kind: "image", mimeType, bytes, sha256 }` — so an e2e can prove an instruction and its image arrived without reading Google's reply.
- **The skill** asks for a 150–250-word scene anchor that "serves every prompt written from this image" (SKILL.md › Output › SCENE_ANCHOR); `references/anchor-example.md` is one that held. A saved scene is that paragraph plus the photo it describes.

## UI Mockup

**Reference capture:** none for the panel — agent.minimax.io has no such surface; Flow's panel is the model (the map § 7, labels quoted from the owner's Flow project: *+ Add instruction*; a row = toggle "Toggle instruction active" on by default, "Instruction title", "Delete instruction", *+ Reference* → "Select reference image" with All / Images / Characters / Avatars and "Upload media", the text "Create a guideline for your agent"; **Done**). Ours is drawn in the Settings dialog's chrome as STORY_051's panel is (`settings-general@1440`: the panel title, 14 px/400 rows, the helper 13 px muted, the switch of `behaviour-settings-preferences-01`), 480 px anchored right; the reference thumbnails are the composer's reference tiles (`reference-tile@1440`: 90 × 90, radius 12, `rgb(245,245,245)`) at 56 px; the picker lists the Assets page's From-you images as its tiles (`assets-tab-from-you@1440`).

**The row with the ≡ and its count** (the ≡ carries the number of active instructions as a small badge; none → no badge):

```
│ [+] [◉ Agent · Thirst trap ⌄] [≡2] [⚙] [◉ MiniMax-H3 ⌄] [16:9 │ 768P │ 5s]   Gemini Flash ⌄ [Run at…] [↑] │
```

**The panel** (from ≡; Done saves everything and closes; × or Escape asks nothing and discards unsaved edits):

```
                                            ┌ Agent instructions ─────────────────────────── × ┐
                                            │ [on ] Studio · sequin curtain                 🗑 │
                                            │       ┌────┐                                     │
                                            │       │ 01 │ + Reference                         │
                                            │       └────┘                                     │
                                            │       A fit young man in his early twenties …    │
                                            │       the camera on a tripod, dead still.        │
                                            │ ──────────────────────────────────────────────── │
                                            │ [off] Bathroom · blue wall                    🗑 │
                                            │       ┌────┐                                     │
                                            │       │ 01 │ + Reference                         │
                                            │       └────┘                                     │
                                            │       A fit young man in his mid-twenties …      │
                                            │ ──────────────────────────────────────────────── │
                                            │ [on ] House rule                              🗑 │
                                            │       + Reference                                │
                                            │       The camera stays completely fixed unless   │
                                            │       the script moves it.                       │
                                            │ ──────────────────────────────────────────────── │
                                            │ + Add instruction                                │
                                            │                                                  │
                                            │                                           [Done] │
                                            └──────────────────────────────────────────────────┘
```

**A new row** — the title field focused with the placeholder *Instruction title*, the text area with *Create a guideline for your agent*, the switch on, no reference. **+ Reference** opens the picker:

```
   ┌ Select reference image ─────────────────────────────── × ┐
   │ [All] [Images]                              [Upload media]│
   │ ┌────┐ ┌────┐ ┌────┐ ┌────┐                               │
   │ │    │ │    │ │    │ │    │   ← the From-you images, newest │
   │ └────┘ └────┘ └────┘ └────┘     first, each titled by its   │
   │ 26-09-17-0312 · 01.jpeg …        task's stamp and file name │
   │                                                            │
   │ No images yet — attach one to a generation, or upload.     │  ← the empty state
   └────────────────────────────────────────────────────────────┘
```

A chosen tile shows in the row at 56 px with a × to remove it. **A reference whose task was deleted** shows the tile greyed with *missing* and the run sends the text alone. **Empty panel** — one line, *No instructions yet — add a scene, a character or a house rule the director should always follow*, and *+ Add instruction*. **Narrow (iPhone 13)** — a full-width sheet, ← in the head, the picker a second sheet; targets ≥ 44 px.

## Acceptance Criteria

- [x] **The store** — `lib/agent-instruction-store.ts` › `agent-instructions.json` beside `history.json`: `[{ id, title, text, active, createdAt, reference?: { kind: "history", historyId, n } | { kind: "upload", file: { name, type, size } } }]`, written atomically; uploads saved under the uploads root as `agent-instructions/<id>/<safe name>` (the `uploads.ts` helpers); `title` ≤ 80 characters, `text` ≤ 4,000, at most 20 instructions (the limits named in the 400s). `GET /api/agent/instructions` lists; `PUT /api/agent/instructions` replaces the list (the panel's Done) — references are kept by id across a PUT and the files of dropped rows deleted; `POST /api/agent/instructions/:id/reference` takes multipart (`referenceImage`, validated as the jobs route validates one) or JSON `{ historyId, n }` (the entry and file must exist); `DELETE …/reference` removes it; `GET …/reference` serves the image (the uploaded file, or the history file through `referenceFilePath`).
- [x] **The panel** — a ≡ icon button (32 px, `aria-label="Agent instructions"`, the active count as a badge) after the chip while it is on; the **Agent instructions** panel (`role="dialog"`, labelled, focus trapped) lists the rows newest last with the switch (`role="switch"`, "Toggle instruction active"), the title, the text, *+ Reference* (or the tile with its ×), and 🗑 ("Delete instruction" — immediate in the panel, written on Done); *+ Add instruction* appends a row with the switch on and focuses the title; **Done** PUTs the list and closes with the toast *Saved*; × and Escape discard. The picker lists the From-you images (from `GET /api/history`, the entries' `referenceFiles`, newest first, the empty line when none) and **Upload media** (the file input; the same types and size as a job's reference); a pick or an upload POSTs the reference at once (the row's id is minted client-side and the PUT carries it).
- [x] **Every run sends the active instructions**: `POST /api/agent/runs` reads the store and passes the active rows to `assembleRequest`, which places them **after the skill's references and before the photo**, each as a text part `Instruction — <title>:\n<text>` and, when it has a reference, an image part directly before its text part introduced by `Reference image for the instruction "<title>":` — then the photo introduced by `The attached photo — the first frame:`, then the notes (the order is STORY_048's, extended here, and the fake's record proves it). An inactive row sends nothing; a reference whose file is gone sends the text alone and the route logs it once. The system instruction is the skill's body alone — instructions are never merged into it.
- [x] **The ≡ badge and the status line**: the badge shows the active count (none → no badge); while a run is in flight the status line reads *Thinking… (2 instructions)* when any are active.
- [x] **Both widths, both themes**; the narrow sheet and picker as sketched; STORY_050's and 051's `agent.spec` cases stay green (a fresh store has no instructions).

**AC corrections made during implementation, as § 3 item 8 asks (2026-09-17):**

- **Uploads live under `uploads/agent-instructions/<id>/<safe name>`** as the AC says; a reference *picked from Assets* is kept as a pointer (`{ kind: "history", historyId, n }`) and read from the job's own file at run time, so the same image is never copied twice; a deleted task makes it "missing" and the run sends the text alone (the route logs it once).
- **A draft row needs to exist on the server before a reference can attach**, so *+ Reference* on a new row saves the list first (a placeholder title/text if empty); Done saves it again with what was typed. Uploads and picks are therefore saved the moment they are made; × and Escape discard only the text edits since.
- **The picker's tabs** are one grid (the From-you images) with *Upload media*; the AC's *All / Images* tabs were the same list twice.
- **The narrow bar (STORY_050's, found here):** with the Agent chip in the row the 390 px bar overflowed and the page scrolled sideways — the chip is glyph-only at narrow widths and the bar may wrap to a second row rather than overflow; recorded as a narrow departure in both stories.

## Departures from the reference

- The panel, the rows and the picker are ours in Flow's words and shape (the map § 7's decision); agent.minimax.io has no equivalent. The picker's tabs are *All* and *Images* only — Flow's *Characters* and *Avatars* are its image-generation features, out of scope.
- A reference is an image the owner already gave us (a past job's reference) or an upload — never a generated frame (a later candidate: a draw's first frame as a character).

## Technical Notes

- `components/composer/AgentInstructionsPanel.tsx` and `ReferencePicker.tsx` (new files) on the Settings chrome; the rows' state is local until Done (a `useReducer` over the list); the tiles reuse `composer.module.css`'s `thumb` at a smaller size.
- `app/app/api/agent/instructions/route.ts` and `…/[id]/reference/route.ts`; the store's file writes follow `skill-store.ts`; the PUT diff deletes the files of rows that vanished.
- `lib/agent-request.ts` › `assembleRequest(skill, image, notes, instructions: [{ title, text, image?: { bytes, mimeType } }])` — the route reads each reference's bytes with `readFileSync` at run time (never cached: the owner can replace a file).
- The fake's `/__stub/agent/runs` record already lists heads; the spec asserts the heads' prefixes and the image count.
- STORY_053's chain director receives the same instructions; a saved scene with a photo is the anchor it is asked to keep.

## Testing Plan

- **Unit (`pnpm test`)** — `agent-instruction-store.test.ts` (new): add, list, replace with a kept reference, replace dropping a row deletes its file, the three limits, garbage on disk → empty, atomic write. `agent-request.test.ts` (048's, extended): the part order with 0 / 1 / 3 instructions, with and without images, an inactive row absent, a missing file → text alone, the system instruction unchanged. `assets-filter.test.ts`: nothing new (the picker reuses `assetItems`) — said so.
- **Component (`AgentInstructionsPanel.test.tsx`, `ReferencePicker.test.tsx`, `Composer.test.tsx`)** — the ≡ absent with the chip off, present with the badge count; the panel renders the rows from a fake fetch; Add focuses a new title; the switch toggles; 🗑 removes a row; Done PUTs the list and toasts; × discards; the picker lists the From-you images and the empty line; Upload POSTs the reference; a pick POSTs `{ historyId, n }`; the missing reference greyed; the status line's count during a run.
- **Integration (`test/integration/agent.test.ts`, extended)** — the instructions routes (list, PUT, upload, pick by history id, the 404s, the 400s); a run with two active instructions (one with an uploaded image) → the fake's record shows, in order: the three skill references, `Reference image for the instruction "Studio"`, the image (sha256 of the upload), `Instruction — Studio:`, `Instruction — House rule:`, `The attached photo`, the photo, the notes; with the first toggled off → one image and one instruction head; with the referenced history entry deleted → the text alone.
- **E2E (`e2e/agent.spec.ts`, extended, both widths)** — (8) *An instruction with a reference is sent, and not when off*: chip on → ≡ → Add instruction → title "House rule", text "The camera stays fixed." → + Reference → Upload media (`fixture-reference.png`) → Done → the badge reads 1 → attach the photo → Send (`?agentScript=clean`) → the fake's record has two images and a head starting `Instruction — House rule` → ≡ → the switch off → Done → the badge gone → Send again → one image, no instruction head. The store is cleared in `afterEach` (PUT `[]`). Regression cover: STORY_050 (1)–(4) and 051 (5)–(7) with an empty store; `assets.spec` (the From-you tab unchanged).
- **Manual verification (Google only — no GPU; in the Done note with the date, the model id and the token counts):** the studio scene saved as an instruction (`spark/data/input/01.jpg` uploaded, `references/anchor-example.md`'s paragraph as the text) and the house rule; one real run on the office photo — the reply read for the rule (a static camera sentence) and for the scene being **not** described (a different photo: the director must not paste the studio's anchor into an office prompt — if it does, the instruction's wording is the fix, in a CHORE).

## Estimated Complexity

Medium–Large — a store with files, four routes, a panel with rows and a picker, the request's second half, at both widths: ≈ 2 h of build and gate (the epic's figure); no GPU.

## Done note (2026-09-17)

**Built** (14:00 → 14:15 EDT): `lib/agent-instruction-store.ts` (the list, `replaceInstructions` keeping ids and references and deleting a dropped row's files, `setUploadedReference`, `setHistoryReference`, `clearReference`, `referenceLocation`, `activeInstructionInputs` reading the bytes at run time, the limits, `clearInstructions`), the routes `GET+PUT /api/agent/instructions` and `GET+POST+DELETE /api/agent/instructions/:id/reference`, `lib/agent-service.ts` reading the active rows for every run (after the skill's references, before the photo — `assembleRequest`'s order from STORY_048, proven on the fake's record), `components/composer/AgentInstructionsPanel.tsx` (new file: the rows with the switch, the title, the text, *+ Reference* / the 56 px tile with ×, 🗑, *+ Add instruction*, Done, the picker over the From-you images with *Upload media*), the ≡ with its badge and the status line's count in `Composer.tsx`, the styles; `clearHistory` in the e2e fixtures clears the instructions too. Tests: `agent-instruction-store.test.ts` (3), `test/integration/agent-instructions.test.ts` (2 — the routes end to end incl. a pick from a real job's reference, and a run's parts in order with the studio image's hash, then the gone file, then everything toggled off), `AgentInstructionsPanel.test.tsx` (3 — the rows, Add with focus, the switch, Delete, Done's PUT, × discarding; the picker's pick and upload and the missing tile; the badge and *Thinking… (1 instruction)*), `e2e/agent.spec.ts` (+1 at both widths: add a rule with an uploaded reference → the fake's record shows two images with the instruction's parts between the references and the photo → toggle off → one image, no instruction).

**Gate.** Steps 1–4 by hand at 14:17 (unit incl. the six new cases, integration 49), the agent and composer specs 31/31 at both widths, then the full build + e2e; the hook re-runs all six on the push.

**Verified live (2026-09-17, after the Spark finished STORY_051's draw):** the deployed composer — ≡ → *No instructions yet* → *+ Add instruction* "House rule" / "The camera stays completely fixed unless the script moves it." → Done → *Saved*, the ≡ badge reads 1 → the office photo, Send → *Thinking… (1 instruction)* → the reply read for the rule (a static camera sentence). The Google-only manual verification with the studio scene saved as an instruction is the addendum below.
