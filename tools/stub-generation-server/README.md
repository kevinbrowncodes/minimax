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

## Test hooks (not part of the contract)

- `POST /__stub/reset` forgets every job.
- `GET /__stub/jobs` → `{ jobs: [{ id, script, status, progress }] }` — assert nothing is left running.
- `GET /__stub/jobs/:id/received` → what the job was sent: `request` and `uploads[] { filename, contentType, size, sha256 }`.

Hooks never require the bearer token. Fixtures and how they were made: [fixtures/README.md](fixtures/README.md).
