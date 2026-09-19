# Job API contract — create → status → result

**Version 1.5 (2026-09-19, STORY_061; v1.4 2026-09-16; v1.3 2026-09-14; v1.2 2026-09-14; v1.1 2026-09-13; v1 2026-09-12).** v1.1 added extending a finished video (`continueFrom`, `capabilities.extension`, STORY_016) and an optional `seed`; v1.2 replaces `contextSeconds` with `overlapFrames` (STORY_017: the source's last frames become the new clip's own first frames). This is the one protocol the UI speaks to a generation server. Two servers implement it: the **stub** (`tools/stub-generation-server/`, STORY_008 — scripted outcomes for the test gate) and the **adapter** on the Spark in front of ComfyUI (`spark/adapter/`, STORY_006). The UI reaches either only through its own API routes (STORY_009), which read the base URL from `MODEL_BASE_URL`. A change to this document is a story on both sides. v1.3 adds `result.cuts` (where the server measured a shot change) and raises the prompt limit to 6000 characters; the servers also build the prompt the model is documented to expect around the caller's text (see below). v1.4 gives each cut a `kind` and the result a `camera` (what the prompt asked of the camera), so the UI can tell a camera move the prompt asked for from a cut the model made.

## Conventions

- Base URL: `MODEL_BASE_URL` (no trailing slash). All paths below are relative to it.
- JSON everywhere except uploads (multipart) and the result and poster bodies (binary).
- Optional auth: `Authorization: Bearer <MODEL_API_KEY>`. A server configured with a key answers `401 { error: { code: "unauthorized" } }` when the header is missing or wrong; a server without a key ignores the header.
- Errors always have the shape `{ error: { code, message, field? } }` with the HTTP status that matches (`400`, `401`, `404`, `409`, `413`, `415`, `503`). `code` is one of the codes listed at the end.
- Ids are opaque strings. Timestamps are ISO-8601 UTC.
- Status is one of `queued | running | done | failed | cancelled`. `done`, `failed` and `cancelled` are **terminal**: a terminal job never changes again. `progress` is an integer 0–100 and never decreases.

## `POST /jobs` — create a job

Request, either `application/json`:

```json
{ "prompt": "A small paper boat …", "ratio": "16:9", "resolution": "768P", "durationSeconds": 5, "model": "minimax-h3" }
```

or `multipart/form-data` with the same fields as text parts plus **0–2** `referenceImage` file parts (`image/png`, `image/jpeg` or `image/webp`, ≤ 10 MB each; FL2VA first/last frame).

| Field | Rule |
| --- | --- |
| `prompt` | string, 1–6000 characters after trimming, required (v1.3: was 2000; MiniMax-length prompts need the room) |
| `ratio` | one of `capabilities.ratios`, required |
| `resolution` | one of `capabilities.resolutions`, required |
| `durationSeconds` | integer within `capabilities.durationsSeconds` (`min`, `max`, `step`), required |
| `model` | one of `capabilities.models[].id`; optional, defaults to the first |
| `seed` | integer 0–4294967295; optional. The noise seed, for like-for-like runs; the server draws one when absent and echoes the one used |
| `continueFrom` | id of a job of **this** server whose status is `done`; optional. Makes the job an **extension** (v1.1): the result is the source video followed by a continuation |
| `overlapFrames` | one of `capabilities.extension.overlapFrames.options`; optional, only with `continueFrom`; defaults to its `default`. How many of the source's last frames become the new clip's own first frames (v1.2; `contextSeconds` from v1.1 is refused with `400 validation`) |
| `endAnchor` | `"source-last-frame"` or `"none"` (`capabilities.extension.endAnchor.options`); optional, only with `continueFrom` (elsewhere `400 validation`); defaults to `capabilities.extension.endAnchor.default`. Where the extension ends (v1.5, STORY_061): `source-last-frame` pins the source's last frame at the new segment's last frame — the model's own keyframe input (`MiniMaxH3AddGuide` on the Spark) — so the shot must return to where it began; STORY_060 measured it as the one lever that holds the join. `none` leaves the end to the model. Echoed in `GET /jobs/:id`'s `request` |

**Extensions (v1.2).** With `continueFrom`: `durationSeconds` is the number of seconds **added** and must lie within `capabilities.extension.durationsSeconds`, and the overlap plus the seconds added must fit the model's `capabilities.extension.maxFrames` in one generation (with the default 39-frame overlap the most is 13 s); `ratio`, `resolution` and `model` must equal the source's; no `referenceImage` part may be sent; the source must not be longer than `capabilities.extension.maxSourceSeconds`. The server makes the source's last `overlapFrames` frames (and their sound) the first frames of the clip it generates, protected from change, generates the rest as the same clip, and joins the source and the new frames after the overlap into one clip; `result.durationSeconds` is the joined length, and an extension can be extended again.

Response `202`:

```json
{ "id": "…", "status": "queued", "progress": 0 }
```

Errors: `400 validation` (with `field`; for an extension also an unknown, unfinished or vanished `continueFrom`, a differing `ratio`/`resolution`/`model`, or a reference image), `400 unsupported_option` (a value the server's capabilities do not list, with `field`; for an extension also a source longer than `maxSourceSeconds` under `continueFrom`), `413 too_large`, `415 unsupported_media_type`, `503 busy` (the server cannot accept a job now — ComfyUI down, the job limit, or a checkpoint the extension needs missing; the UI shows the message).

## `GET /jobs/:id` — status

Response `200`:

```json
{
  "id": "…",
  "status": "running",
  "progress": 33,
  "createdAt": "2026-09-12T18:32:22Z",
  "updatedAt": "2026-09-12T18:33:10Z",
  "request": { "prompt": "…", "ratio": "16:9", "resolution": "768P", "durationSeconds": 5, "model": "minimax-h3", "referenceImages": 0, "seed": 1234567 },
  "error": { "code": "moderated", "message": "…" },
  "result": { "url": "/jobs/…/result", "posterUrl": "/jobs/…/poster", "mimeType": "video/mp4", "frames": 124, "durationSeconds": 5.167, "width": 1344, "height": 768, "sizeBytes": 1581571, "cuts": [], "camera": "static" }
}
```

`request` echoes what was accepted, `seed` included. For an extension it also carries `continueFrom`, `overlapFrames` (as requested or defaulted) and `overlap: { frames, seconds }` (what the server carried into the new clip). `result.frames` is the clip's length on the 24 fps grid (an extension's is the source's plus the new frames).

`error` is present only when `status` is `failed` (`code` is `moderated` for a prompt or image the server refused on content grounds, `generation_failed` otherwise). `result` is present only when `status` is `done`; `url` and `posterUrl` are paths relative to the base URL. Unknown id → `404 not_found`.

**`result.cuts` (v1.3, STORY_020).** Where the server measured that the shot changed — the set or the framing is no longer what it was — as `[{ "frame", "seconds" }]` on the joined clip's timeline (`frame` is the first frame of the new shot, 0-based; `seconds` = frame ⁄ 24 to two decimals). `[]` when the shot held; **absent** when the measure was unavailable (a server older than v1.3, or the measure missing from the run). The rule: the picture's outer border (the top and bottom 10 % of rows and the left and right 10 % of columns — the set, not the person) differs by 30 or more (mean absolute RGB, 0–255) from **one second** earlier, **or** by 20 or more from **three seconds** earlier (BUG_006: a slow dissolve of the set spreads its change over more than one second); each contiguous run is one event, placed at the largest single-frame border step inside the first window that tripped it; events within 48 frames merge. Calibrated on static-camera footage; a prompt that moves the camera trips it too, which is why the UI says "the set or the framing". The stub's script `done-with-cut` reports `[{ "frame": 270, "seconds": 11.25, "kind": "cut" }]`; every other script reports `[]`, except the two below.

**`result.cuts[].kind` and `result.camera` (v1.4, STORY_046).** Each event's `kind` is `"cut"` — the border jumped by 30 or more between **two consecutive frames** (the real cuts on disk step 46.5–49.7 in one frame; handheld footage at most 15.7, a held shot 2.4, a slow dissolve 2.8) — or `"framing"` — the one- or three-second rule tripped without such a jump: the set or the framing changed, which on a moving camera is what was asked for. Events within 48 frames still merge, a cut winning the merged event's frame and kind. `result.camera` is what the prompt asked of the camera, read by the server from the prompt the model got: `"static"` (the server's own wrapper, or the caller's base-format text saying `static shot` with no move named), `"moving"` (the description names a move — push in / pull out, pan, tilt, pedestal, arc shot, tracking shot, dolly, zoom, handheld, sway, "camera follows"), `"unknown"` (neither). Both **absent** from a server older than v1.4; the UI reads absence as `"framing"` and `"unknown"`, which is v1.3's behaviour. The UI's rule: a cut on any camera, or framing on a camera that is not `"moving"`, is the amber notice with Retry; framing alone on a `"moving"` camera is a quiet line with no Retry and no Inbox event. The stub's `done-with-framing-move` reports three framing events (frames 24, 100, 204) with `camera: "moving"`; `done-with-cut-in-a-move` the same plus a cut at frame 142.

**The prompt the model gets (v1.3, STORY_020).** Both servers accept the caller's text as typed; the Spark's adapter builds MiniMax's documented format around it before sending it to the model: for a first frame, the instruction line `For the target video, at 0.00 seconds into the target video, <Picture 1> (from [Shot 1]) is fully referenced.`; for first + last frame, the FL2VA alignment line; none for text-only and for an extension; then `integrated_multimodal_description: [Shot 1] Live-action. The camera holds a perfectly static shot throughout the entire S.SS-second duration: no cut, no dissolve, no transition and no change of framing; …` followed by the caller's text as one paragraph (a line's leading `[m:ss-m:ss]` becomes `From m:ss to m:ss,`), then `overall_soundscape:` and `non_diegetic_music:`. Text that already begins with `integrated_multimodal_description:` or with either instruction line is sent unchanged. `request.prompt` still echoes what the caller sent.

## `DELETE /jobs/:id` — cancel

Response `202 { "id": "…", "status": "cancelled", "progress": <last> }`. The server stops the work on its side; the job is terminal from this response on. A job that is already terminal → `409 already_terminal`. Unknown id → `404`.

## `GET /jobs/:id/result` — the video

`200` with the video bytes, `Content-Type` (`video/mp4` or `video/webm`), `Content-Length`, `Accept-Ranges: bytes`; a `Range` request is answered with `206` and `Content-Range`, so a `<video>` element can seek. Job not `done` → `409 not_done`. Unknown id → `404`.

## `GET /jobs/:id/poster` — a still

`200` with an image (`image/png` or `image/jpeg`). Same errors as the result.

## `GET /capabilities` — what this server can do

```json
{
  "models": [{ "id": "minimax-h3", "label": "MiniMax-H3.0" }],
  "ratios": ["21:9", "16:9", "4:3", "1:1", "3:4", "9:16"],
  "resolutions": ["768P"],
  "durationsSeconds": { "min": 4, "max": 15, "step": 1 },
  "referenceImages": { "max": 2 },
  "extension": { "durationsSeconds": { "min": 4, "max": 14, "step": 1, "default": 10 }, "overlapFrames": { "options": [22, 39, 56], "default": 39 }, "maxFrames": 362, "maxSourceSeconds": 30, "endAnchor": { "options": ["source-last-frame", "none"], "default": "source-last-frame" } }
}
```

`extension.endAnchor` (v1.5) lists where an extension may end and the server's default; a client that does not see it (an older server) shows no choice and sends nothing. `extension` (v1.2) says how a finished video can be extended: the seconds added per step, the overlaps on offer (the source's last frames that become the new clip's head — 0.9 / 1.6 / 2.3 s), the model's per-generation frame ceiling (`maxFrames`, which with a given overlap caps the seconds one step can add), and the longest source the server joins.

The UI renders its option controls from this and greys out what is absent (for example the reference's `2K`, which the Spark cannot produce — [interactions.md §5](../recon/2026-09-12/interactions.md)).

## `GET /health`

`200 { "ok": true, "server": "stub" | "adapter", "version": "…" }`.

## Error codes

`validation`, `unsupported_option`, `too_large`, `unsupported_media_type`, `unauthorized`, `not_found`, `already_terminal`, `not_done`, `busy` (HTTP errors); `moderated`, `generation_failed` (in a failed job's `error`). The UI adds one of its own that no server sends: `unreachable` (STORY_009's polling gives up after repeated network failures).

## Test hooks (stub only, not part of the contract)

The stub chooses a job's outcome from the `X-Stub-Script` header or `?script=` on `POST /jobs`, and exposes `/__stub/reset`, `/__stub/jobs` and `/__stub/jobs/:id/received` for specs. They are documented in [tools/stub-generation-server/README.md](../../tools/stub-generation-server/README.md). The adapter never implements them.
