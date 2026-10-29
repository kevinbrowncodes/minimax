# STORY_082 — The adapter's reference picture

**Status:** Proposed (2026-10-29 12:10 EDT) — built only if STORY_081's answer is yes
**Epic:** [EPIC_014](../epic/EPIC_014_the_keyframe_in_every_shot.md)

As the owner, I want a job — a fresh clip or an extension — to carry one **subject picture** the model keeps him from, so that the UI's chains can do what STORY_081's runner did without the test tooling.

## Current state (read 2026-10-29)

- **The contract (v1.6, `docs/contracts/job-api.md`)** knows one kind of image: 0–2 `referenceImage` parts, which are FL2VA's first and last frame (`buildGraph` wires them to `first_frame` / `last_frame`, `mapping.ts:113–120`). An extension refuses any image: "an extension takes no reference images: the video being extended is the reference" (`spark/adapter/src/capabilities.ts:135`; the stub's `server.ts:214`; the app never sends one, `app/lib/submit-job.ts:46`).
- **The graph:** `cond` is always `MiniMaxH3ImageToVideo`. `REQUIRED_CLASSES` (`mapping.ts:70–81`) has `MiniMaxH3AddGuide` (STORY_061) but not `MiniMaxH3ReferenceToVideo`. `/health` already says whether the Ref2VA file exists (`server.ts:315–331`, `ref2vaFileFor`), unused since STORY_017.
- **The prompt wrapper** (`spark/adapter/src/prompt.ts`): a plain prompt is wrapped in the base format; with one image it gets the I2VA alignment line ("at 0.00 seconds … `<Picture 1>` … is fully referenced"), with two the FL2VA line, as an extension no line. A prompt that already starts with `integrated_multimodal_description:` or either alignment line passes unchanged; one starting with `subject_definitions:` (the full-reference format MiniMax's guide and STORY_081's row 2 use) does **not** — it would be wrapped.
- **The stub** mirrors the adapter's validation and records every upload per job (`uploads` with sha256; `GET /__stub/jobs/:id/received`), which is what the e2e lane asserts on.
- **Versions:** adapter `VERSION = "1.7.0"` (`server.ts:22`); contract v1.6 (STORY_080). EPIC_011's STORY_064 was drafted as v1.6 before STORY_080 took it — **v1.7 goes to whichever lands first**, the other renumbers before its code.
- **The model's two ways in** differ in strength (joeygambino, measured): a first frame *lands* on the picture, a reference *nudges* toward it. So the first frame stays a keyframe and the subject picture is added beside it, never instead of it.

## UI Mockup

N/A (no UI change): a contract field, the adapter's graph and the stub. The composer's half is STORY_083.

## Acceptance Criteria

- [ ] **Contract v1.7:** `POST /jobs` takes at most one `subjectImage` file part (`image/png`, `image/jpeg` or `image/webp`, ≤ 10 MB) on a fresh job **or an extension**; two parts, another type, or the part on a server that does not list it → `400 validation` with `field: "subjectImage"`. `GET /capabilities` gains `subjectImage: { max: 1 }`; a client that does not see it offers nothing. The request echo carries `subjectImage: true` when one was sent. `referenceImage` keeps its meaning and its rules (still refused on an extension). The document says what the picture is for (the person's identity, not a frame) and that the prompt may name it `<Picture 1>`.
- [ ] **The adapter accepts and validates it** (`capabilities.ts`): the part is recognised beside `referenceImage`, counted apart from the 0–2 limit, uploaded to ComfyUI like the others, and reaches `buildGraph` as `options.subject?: UploadedImage`.
- [ ] **The graph with a subject picture, fresh job:** `cond` becomes `MiniMaxH3ReferenceToVideo` (`clip`, `vae`, `prompt`, `width`, `height`, `length`, `ref_image_size: "match"`, `"ref_images.ref_image_0"` ← `LoadImage(subject)`); the sampler takes its latent; a first frame, when sent, is pinned with `MiniMaxH3AddGuide` at `frame_idx: 0` and a last frame at `L − 1`, chained onto `cond`, the guider taking the last node of the chain. Without a subject picture the graph is byte for byte today's (every existing `buildGraph` test stays green unchanged).
- [ ] **The graph with a subject picture, extension:** the same swap of `cond`; the masked latent, the overlap, the end anchor (chained after `cond` as today), the join and the measures are untouched. `REQUIRED_CLASSES` gains `MiniMaxH3ReferenceToVideo`, so a ComfyUI without it fails the start-up check by name.
- [ ] **The prompt wrapper** (`prompt.ts`): a plain prompt with a subject picture names it once at first appearance — the anchor clause becomes *"the person in `<Picture 1>` — their face, hair, skin and body exactly as pictured — the set, the props and the lighting … stay as they are"* (fresh and extension alike); with a subject picture **and** a first frame the I2VA line is still emitted (the picture is the frame too); with a subject picture and no frame **no alignment line** is emitted (STORY_081's finding: the first-frame line fights the kept footage). A prompt starting with `subject_definitions:` passes through unchanged, like the other two starts.
- [ ] **The stub mirrors it:** `capabilities.subjectImage`, the same validation and errors, the part recorded in `uploads` with its field name so `received` shows it; the `rejects-upload` script keeps its meaning.
- [ ] **Versions and docs:** adapter 1.8.0; `docs/contracts/job-api.md` v1.7 with the field, the capability and the echo; README › Running the Model: the subject picture, what it costs per shot (STORY_081's measured minutes), `match`.
- [ ] **Manual verification (not a gate):** one 10 s fresh job and one +10 s extension from the UI's route with a subject picture on the Spark (Equinox), the graphs read back from ComfyUI's history and compared with STORY_081's dry-run dump; the minutes recorded.

## Technical Notes

- **Why `AddGuide` for the frames:** `MiniMaxH3ReferenceToVideo` has no `first_frame` / `last_frame` inputs; the guide node pins a frame at any index (STORY_061 already uses it at `L − 1`). Two differences to record, not hide: the guide resizes with a centre crop where `first_frame` stretched (the same ratio in practice — the composer's canvas follows the photo); and a picture that reaches the model only through `AddGuide` is **not shown to the text encoder** (ComfyUI's multiframe docs, line 84), so in this graph `<Picture 1>` always means the subject picture. For a chain's shot 1 the two are the same file.
- **The field name:** `subjectImage`, after MiniMax's own word (`<Subject 1> is the man in <Picture 1>`), distinct from `referenceImage`, which this contract has used for first/last frames since v1 — renaming that would touch every client.
- **Uploads:** the part goes through the same `comfy.uploadImage` path with a `job-<id>-subject` name; the app's history keeps it like the other reference files (STORY_083 reads it back for Extend mode).
- **Deploy:** the adapter container only; ComfyUI and the model untouched. Check `nvidia-smi` and the queue first (no take running).
- **Cost:** STORY_081's measured number replaces the +1.4 min estimate in the README.

## Testing Plan

- **Unit — adapter.** `mapping.test.ts`: `buildGraph` with a subject and no frames (the swapped `cond`, the dotted slot, the sampler on its latent); with a subject and one frame (`AddGuide` at 0 chained, the guider on it); with a subject and two frames (0 and `L − 1`); an extension with a subject (the swap, the masked latent and the end anchor untouched, the join as before); and **the whole existing suite unchanged** for no subject. `capabilities.test.ts`: the part accepted on a fresh job and on an extension, two parts refused, a bad type refused, the echo `subjectImage: true`, `referenceImage` still refused on an extension, the published capability. `prompt.test.ts`: the anchor clause with a subject, the I2VA line kept with a frame, no line without one, `subject_definitions:` passed through byte for byte. `server.test.ts` (fake ComfyUI): `MiniMaxH3ReferenceToVideo` missing from `/object_info` fails the start-up check by name.
- **Unit — stub.** `server.test.ts`: the same acceptance and refusals; `received` lists the part under `subjectImage`.
- **Integration — app** (`app/test/integration/jobs.test.ts`): the route forwards a `subjectImage` part to the stub on a fresh job and on an extension, and the capability is relayed. (The route's own forwarding change is small and lands here so STORY_083 builds on a proven path.)
- **E2E:** none in this story — nothing user-facing changes until STORY_083; `extend.spec.ts`, `composer.spec.ts` and `task.spec.ts` staying green is the regression cover.
- **Manual verification:** the two Spark jobs above, dated, with the seeds and the minutes.

## Estimated Complexity

Medium — about 3 h with the gate: the validation and the capability on both servers, the graph branches and their tests, the wrapper, the contract paragraph, the route's forwarding, one adapter redeploy and two draws.
