# BUG_004 — Download saves a file named "result" with no extension

**Status:** Resolved
**Found:** 2026-09-14 by the owner, downloading the 31 s clip from the task page in his browser on the Mac

## Summary

Pressing **Download** on a finished video saves a file called `result` — the last segment of the route's URL — with no `.mp4` extension, so macOS does not know what it is until it is renamed.

## Steps to Reproduce

1. Open a finished task in a browser on the LAN (`http://spark-1.local:3000/task/<id>`).
2. Press **⤓ Download**.
3. Look at the saved file's name.

## Expected vs Actual Behaviour

- **Expected:** `<the task's title>.mp4` — the name the Assets tile shows for the same clip.
- **Actual:** `result`, no extension.

## Root Cause

`GET /api/jobs/:id/result` sends `Content-Type`, `Content-Length` and the range headers a `<video>` element needs, and **no `Content-Disposition`** (checked live on 2026-09-14 with `curl -I`). The file name therefore rested entirely on the anchor's `download="<title>.mp4"` attribute, which the owner's browser did not apply — a browser that ignores or restricts the attribute falls back to the URL's last path segment, `result`, and adds an extension only if it feels like it. The gate's two browsers happen to honour the attribute, which is why `task.spec.ts` "Download yields the fixture's bytes" passed with `/\.mp4$/`.

## Acceptance Criteria

- [x] `GET /api/jobs/:id/result` always carries `Content-Disposition` with the same name Assets shows (`fileNameFor(entry)`, e.g. `A small paper boat.mp4`; `video.mp4` when the job is not in history), as `inline` so the player keeps working; with `?download` on the URL it is `attachment`, so the save has that name in every browser whatever it does with the anchor's attribute. Non-ASCII titles are carried in `filename*` (RFC 5987) with an ASCII fallback.
- [x] Every Download control (the task page's result card, the Assets tile menu, the Assets preview modal) links to `…/result?download`, keeping the `download` attribute.
- [x] Tests: `lib/content-disposition.test.ts` (the header's two forms and the escaping); `test/integration/jobs.test.ts` (inline with the history title, attachment with `?download`, `video.mp4` for an unknown history entry, the range request still named); `e2e/task.spec.ts` and `e2e/assets.spec.ts` assert the **exact** suggested file name, not just `.mp4`.

## Resolution (2026-09-14)

`app/lib/content-disposition.ts` builds the header; the result route looks the job up in history and sets it (`attachment` with `?download`); the three Download links carry `?download`. Verified live after the deploy with `curl -I` on the 31 s clip: `content-disposition: inline; filename="[000-003] From the three-quarter angle, he.mp4"; filename*=…`, and `attachment` with `?download`.
