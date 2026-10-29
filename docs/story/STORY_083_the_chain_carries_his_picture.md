# STORY_083 — The chain carries his picture

**Status:** Proposed (2026-10-29 12:10 EDT) — built after STORY_082
**Epic:** [EPIC_014](../epic/EPIC_014_the_keyframe_in_every_shot.md)

As the owner, I want every segment of a chain I send from the composer — and an extension of a finished video — to carry the scene's photo as the subject picture, so that a round run from the UI holds him the way STORY_081's runner does.

## Current state (read 2026-10-29)

- **A chain's extensions carry no image.** `submitChain` (`app/lib/submit-job.ts:85–105`) posts the first segment with `state.images` and every later one as `{ prompt, continueFrom }`; `buildJobRequest` sends JSON whenever `continueFrom` is set (`:46`), dropping images by design (STORY_016).
- **Extend mode has no photo in hand.** With `state.extend` set the composer shows the continuation tile instead of the references area (`Composer.tsx:465–480`); the source job's own reference files are kept by the app (`saveReferenceFiles`, `app/app/api/jobs/route.ts:87`; `referenceFiles` on the history entry), so the server can find the chain's photo by following `continueFrom` back to the first job.
- **The Extend group** (`Composer.tsx:627–650`) has two radiogroups — *Overlap (what the new clip starts from)* and *End (where the new clip finishes)* — each shown only when the server's capabilities offer it. The chain strip's summary line (`ChainStrip.tsx:42–46`) says segments · each · total · overlap, and *draws apply to single clips…* when draws > 1.
- **The capability gate:** `Capabilities` (`app/lib/job-api.ts:76`) has `referenceImages.max`; after STORY_082 a server at v1.7 also lists `subjectImage.max`; an older server does not, and then nothing here may show.

## UI Mockup

No reference capture: the Extend group is our own control (STORY_017, STORY_061), not a surface of agent.minimax.io.

```
Overlap (what the new clip starts from)
 ( 0.9 s )  ( 1.6 s )  ( 2.3 s )  [ 3.8 s ]

End (where the new clip finishes)
 [ Source's last frame ]  ( Free )

Subject (who the new clip keeps)                      ← new, only when the server lists subjectImage
 [ Him, from the photo ]  ( Nobody in particular )     ← default: the photo, when there is one
```

The chain strip's summary gains *· his picture in every segment* while the subject is on. The continuation tile's second line reads *carries its last 3.8 s into the new clip · keeps him from the photo* while on. With no photo to use (a single clip with no image, an extension whose chain has no reference file) the group shows *(no photo on this clip)* and sends nothing. Narrow layout: the group wraps like the two above it (`devices["iPhone 13"]` in the e2e). Both themes: the existing segment styles.

## Acceptance Criteria

- [ ] **The composer offers the subject only when the server does:** `Capabilities.subjectImage?: { max }` is read from `/api/capabilities`; the group renders when it is present, never otherwise (an older server shows the Extend group exactly as today).
- [ ] **Chains send it on every segment:** with the subject on and a photo attached, `submitChain` posts segment 1 as today (`referenceImage` + `subjectImage`, both the photo) and every later segment as multipart with the same photo as `subjectImage` beside `continueFrom`; `buildJobRequest` therefore sends multipart for an extension that carries a subject and JSON otherwise. With the subject off the requests are byte for byte today's.
- [ ] **Extend mode finds the photo on the server:** extending a finished video with the subject on sends `subjectFrom: "source"` (an app-side field the route consumes and never forwards); the route resolves it to the first `referenceFiles` entry of the chain's first job (following `continueFrom` back), attaches it as `subjectImage`, and answers `400 validation` with a plain message when the chain has no photo. A chain sent with the photo in hand never needs this path.
- [ ] **The state knows it:** `ComposerState.subject: "photo" | "none"`, default `"photo"`, with a reducer action and the same capability clamp pattern as `endAnchor` (an unoffered value is ignored). The strip's summary and the continuation tile's line reflect it.
- [ ] **History and Scheduled show it:** a job sent with a subject picture shows a small *keeps him from the photo* line on the task page's request summary and in the Scheduled row (the same place the overlap and end are shown today).
- [ ] **Nothing else changes:** draws, run-at, Edit, the end-anchor rule for the last segment (STORY_068), the retry-chain route, and single clips without a photo.

## Technical Notes

- **Why two paths:** the chain has the `File` objects in state, so the client sends them; Extend mode starts from a tile with only the source's id, so the server looks the file up. One contract field (`subjectImage`), one app-side convenience (`subjectFrom`) that the route turns into that field.
- **Where the photo lives:** `saveReferenceFiles` keeps each job's reference files on the app's disk; the route reads the first one of the chain's first job. A job whose files were cleaned up answers the `400` above with a message the composer shows in its error line.
- **Default on:** the owner's rounds are the use; a chain with a photo keeps him unless told not to. The off state exists for scenes where the keyframe's clothing should not be held (a clothed scene 1 with undressing beats — the caution from the Ref2VA reading).
- **Retry-chain** (`app/app/api/jobs/[id]/retry-chain/route.ts`) re-posts a failed extension: it must carry the subject the original carried, resolved the same way.

## Testing Plan

- **Unit — app.** `composer-state.test.ts`: the default, the action, the clamp when the capability is absent. `submit-job.test.ts`: a chain with the subject on posts multipart on every segment with `subjectImage` = the photo and `continueFrom` on segments 2+; off → today's requests exactly; Extend mode sends `subjectFrom: "source"` and no file. `ChainStrip.test.tsx` / `Composer.test.tsx` (jsdom): the group renders only with the capability; the summary and the tile line; the *(no photo on this clip)* state.
- **Integration — app** (`app/test/integration/jobs.test.ts`): a multipart extension with `subjectImage` reaches the stub with the part; `subjectFrom: "source"` on an extension of a job that has a reference file reaches the stub with that file as `subjectImage`; on a chain with none → `400`; `retry-chain` carries it.
- **E2E** (`e2e/extend.spec.ts`, extended): the fixture attaches `fixture-reference.png`, writes a two-script chain, presses Send all; the waiter for each segment's `done` is registered before the click; then `stub.received(id)` for **both** segments lists an upload under `subjectImage` whose sha256 is the fixture's, and segment 2 also has `continueFrom`; the same chain with *Nobody in particular* selected sends no part on either. A narrow-width run of the same spec renders the group wrapped. Regression cover: the three existing `extend.spec.ts` scenarios, `composer.spec.ts`, `task.spec.ts`, `scheduled.spec.ts` stay green.
- **Manual verification (not a gate):** one real round of three takes from the UI on the Spark with the subject on; the body check at the end of every shot as STORY_081 did; the minutes per shot in the Done note.

## Estimated Complexity

Medium — about 2 h 30 min with the gate: one state field, one group, the request builder's multipart case, the route's lookup, the strip and tile lines, and the e2e extension at both widths.
