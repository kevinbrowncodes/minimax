#!/usr/bin/env bash
# spark/gcloud/spike.sh — STORY_048's spike: one photo through a director skill on Gemini, from the agent-spike compose
# service (the gate image with the key mounted read-only). Paths are the repo's, as the container sees them under /work.
#   spark/gcloud/spike.sh agents/skills/minimax-h3-director-thirst-trap test/26-09-17-0800_office/01.jpeg "keep the camera still" --safety least
#   spark/gcloud/spike.sh --models
# Replies are also saved under spark/data/agent-spike/ (gitignored) when --out is not given.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
. "$HERE/lib.sh"
[ -s "$SECRETS_DIR/vertex-sa.json" ] || { printf '[spike] no key at spark/data/secrets/vertex-sa.json — run setup-vertex.sh first\n' >&2; exit 1; }
OUT="$SPARK_DATA/agent-spike"
mkdir -p "$OUT"
case " $* " in *" --out "*|*" --models "*) compose run --rm -T agent-spike "$@" ;; *) compose run --rm -T agent-spike "$@" --out "spark/data/agent-spike" ;; esac
