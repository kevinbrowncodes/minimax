# Job API contract — create → status → result

**Version 1 (2026-09-12).** This is the one protocol the UI speaks to a generation server. Two servers implement it: the **stub** (`tools/stub-generation-server/`, STORY_008 — scripted outcomes for the test gate) and the **adapter** on the Spark in front of ComfyUI (`spark/adapter/`, STORY_006). The UI reaches either only through its own API routes (STORY_009), which read the base URL from `MODEL_BASE_URL`. A change to this document is a story on both sides.

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
| `prompt` | string, 1–2000 characters after trimming, required |
| `ratio` | one of `capabilities.ratios`, required |
| `resolution` | one of `capabilities.resolutions`, required |
| `durationSeconds` | integer within `capabilities.durationsSeconds` (`min`, `max`, `step`), required |
| `model` | one of `capabilities.models[].id`; optional, defaults to the first |

Response `202`:

```json
{ "id": "…", "status": "queued", "progress": 0 }
```

Errors: `400 validation` (with `field`), `400 unsupported_option` (a value the server's capabilities do not list, with `field`), `413 too_large`, `415 unsupported_media_type`, `503 busy` (the server cannot accept a job now; the UI may retry later).

## `GET /jobs/:id` — status

Response `200`:

```json
{
  "id": "…",
  "status": "running",
  "progress": 33,
  "createdAt": "2026-09-12T18:32:22Z",
  "updatedAt": "2026-09-12T18:33:10Z",
  "request": { "prompt": "…", "ratio": "16:9", "resolution": "768P", "durationSeconds": 5, "model": "minimax-h3", "referenceImages": 0 },
  "error": { "code": "moderated", "message": "…" },
  "result": { "url": "/jobs/…/result", "posterUrl": "/jobs/…/poster", "mimeType": "video/mp4", "durationSeconds": 5.17, "width": 1344, "height": 768, "sizeBytes": 1581571 }
}
```

`error` is present only when `status` is `failed` (`code` is `moderated` for a prompt or image the server refused on content grounds, `generation_failed` otherwise). `result` is present only when `status` is `done`; `url` and `posterUrl` are paths relative to the base URL. Unknown id → `404 not_found`.

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
  "referenceImages": { "max": 2 }
}
```

The UI renders its option controls from this and greys out what is absent (for example the reference's `2K`, which the Spark cannot produce — [interactions.md §5](../recon/2026-09-12/interactions.md)).

## `GET /health`

`200 { "ok": true, "server": "stub" | "adapter", "version": "…" }`.

## Error codes

`validation`, `unsupported_option`, `too_large`, `unsupported_media_type`, `unauthorized`, `not_found`, `already_terminal`, `not_done`, `busy` (HTTP errors); `moderated`, `generation_failed` (in a failed job's `error`). The UI adds one of its own that no server sends: `unreachable` (STORY_009's polling gives up after repeated network failures).

## Test hooks (stub only, not part of the contract)

The stub chooses a job's outcome from the `X-Stub-Script` header or `?script=` on `POST /jobs`, and exposes `/__stub/reset`, `/__stub/jobs` and `/__stub/jobs/:id/received` for specs. They are documented in [tools/stub-generation-server/README.md](../../tools/stub-generation-server/README.md). The adapter never implements them.
