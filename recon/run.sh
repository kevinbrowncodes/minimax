#!/usr/bin/env bash
# recon/run.sh <check|capture|tokens|interactions> [args…] — run a recon script in the gate container (CHORE_005), headless,
# with the profile recon/login.sh signed in. Curated captures land in docs/recon/<date>/, raw output in recon/out/ (gitignored).
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
[ $# -ge 1 ] || { sed -n '2,3p' "$0" >&2; exit 2; }
script="$1"; shift
SPARK_UID="$(id -u)"; SPARK_GID="$(id -g)"
export SPARK_UID SPARK_GID
exec docker compose --project-directory "$ROOT" -f "$ROOT/compose.yaml" run --rm --no-deps -T gate pnpm --filter recon "$script" -- "$@"
