# Stub generation server

A local, deterministic fake of the job API in [docs/contracts/job-api.md](../../docs/contracts/job-api.md) (STORY_008). Every unit, integration and e2e test targets it; the real server is the adapter on the Spark (STORY_006). Zero runtime dependencies; runs on Node 26 with type stripping (`node src/main.ts`).

```bash
pnpm --filter stub-generation-server start      # STUB_PORT (4010), STUB_HOST (0.0.0.0), STUB_FIXTURE (mp4|webm), STUB_API_KEY
docker compose run --rm stub                    # the same, as the compose service (gate image)
```

## Choosing an outcome

Per job, with `X-Stub-Script: <name>` or `?script=<name>` on `POST /jobs`. Progress advances **per status poll**, never by wall clock. The k-th `GET /jobs/:id` returns the k-th step; the last step holds.

| Script | Steps after creation (`queued/0`) |
| --- | --- |
| `done-after-3-polls` (default) | running 33 → running 66 → done 100 |
| `done-after-1-poll` | done 100 |
| `slow-done-after-10-polls` | queued, running 10 … 95 → done on the 10th poll |
| `fails-after-2-polls` | running 40 → failed (`generation_failed`) |
| `moderated` | failed on the first poll (`moderated`) |
| `cancel-midway` | running 10 → 25 → 50 and stays running until `DELETE` |
| `rejects-upload` | `POST /jobs` with a reference image → `400` (`field: referenceImage`) |

## Extensions (contract v1.2, STORY_017)

`POST /jobs` with `continueFrom: <id of a job this stub has seen reach done>` is an extension: `durationSeconds` is the seconds added (4–14, less when the overlap leaves fewer of the model's 362 frames), `overlapFrames` (22, 39 or 56, default 39) is how much of the source becomes the new clip's own first frames, and the parameters must match the source's. The stub validates exactly as the adapter does and echoes `request.overlap` and the joined length (`src/extension.ts` mirrors `spark/adapter/src/grid.ts`; the fixture counts as 56 frames), but **its result is always the fixture**. `contextSeconds` (v1.1) is refused with a pointer to `overlapFrames`. An optional integer `seed` is echoed on any job.

## Test hooks (not part of the contract)

- `POST /__stub/reset` forgets every job.
- `GET /__stub/jobs` → `{ jobs: [{ id, script, status, progress }] }` — assert nothing is left running.
- `GET /__stub/jobs/:id/received` → what the job was sent: `request` (with `continueFrom`, `overlapFrames`, `overlap` and `seed` when they apply) and `uploads[] { filename, contentType, size, sha256 }`.
- `GET /__stub/fixtures/<fixture.mp4|fixture.webm|fixture-poster.png|fixture-reference.png>` → that file, whatever `STUB_FIXTURE` is (for the codec probe).

Hooks never require the bearer token. Fixtures and how they were made: [fixtures/README.md](fixtures/README.md).
