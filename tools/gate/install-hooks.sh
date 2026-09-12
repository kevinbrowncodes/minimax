#!/usr/bin/env bash
# tools/gate/install-hooks.sh — point git at .husky/_ (what `husky` does during pnpm install inside the gate container),
# for the case where the bind mount left .git/config untouched. Idempotent. Host needs only git.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
[ -d "$ROOT/.husky/_" ] || { echo "[hooks] .husky/_ missing — run tools/gate/run.sh once (pnpm install generates it)"; exit 1; }
git -C "$ROOT" config core.hooksPath .husky/_
echo "[hooks] core.hooksPath=$(git -C "$ROOT" config core.hooksPath)"
