# CHORE_002 — The MiniMax H3 references live in the repo, so the model can be understood offline

**Status:** Done (2026-09-13)
**Created:** 2026-09-13 (owner's request that morning)

## Summary

`docs/references/` holds a local copy of everything public that explains the model the Spark serves — MiniMax's model card, license and prompt guides, the platform's H3 API and self-hosting pages, ComfyUI's H3 documentation, the official workflow templates, the node and model sources from our own ComfyUI image, the announcement post, and the community Spark write-up — with an index ([docs/references/README.md](../references/README.md)) that says what each file is, where it came from, when, and under which license, and a script (`fetch.sh`) that re-fetches all of it.

## Why

The owner asked for "all the PDFs and all info that will help you best understand the MiniMax H3 model" as a local source (2026-09-13). There is no technical report or PDF for H3 as of that date; what exists is spread across four sites and one Docker image. Having it in the repo means a story can cite a page by path, the citation does not rot when a site changes, and the assistant reads the actual node source rather than remembering it. STORY_016 (extend a video) was the first to need it.

## Changes

- [x] `docs/references/README.md` — the index: per file, what it is, source URL, fetch date, license; what the references say about continuing a video; what does not exist (no technical report, no PDFs, no extension in MiniMax's API).
- [x] `docs/references/fetch.sh` — re-fetches every file (curl for the sites, `docker cp` from the ComfyUI image for the sources); idempotent; text only.
- [x] `docs/references/raw/`, `api-reference/`, `comfy-docs/`, `prompt-guides/`, `model-config/`, `comfyui/`, `community/`, `blog/` — the files (≈ 1.6 MB, all text or JSON; nothing that belongs in the gitignored data directory).
- [x] README.md — Project Structure lists `docs/references/`.

## Testing

- **Unit / integration / e2e: not applicable** — no runtime code changes; nothing under `app/`, `spark/adapter/`, `tools/` or the gate. The gate still runs on the push and must stay green.
- `fetch.sh` was run once end to end on the Spark (2026-09-13) and reproduced the tree; shellcheck (the same container the Spark scripts use) reports nothing.
