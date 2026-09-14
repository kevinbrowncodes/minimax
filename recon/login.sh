#!/usr/bin/env bash
# recon/login.sh — sign the recon profile in to agent.minimax.io from the Spark, which has no display (CHORE_005):
# runs recon:login-remote in the gate container with Chromium's DevTools port published on the LAN, so the owner
# signs in through chrome://inspect on the Mac. The port is open only while this runs; the profile stays in
# recon/.profile/ (gitignored). Then `recon/run.sh check` reads "session: signed-in".
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
PORT="${RECON_DEBUG_PORT:-9222}"
SPARK_UID="$(id -u)"; SPARK_GID="$(id -g)"
export SPARK_UID SPARK_GID
docker image inspect minimax/gate:1.63.0-node26 > /dev/null 2>&1 || { printf '[recon] ERROR: gate image missing — run tools/gate/build.sh\n' >&2; exit 1; }
mkdir -p "$ROOT/recon/.profile"
# Chromium leaves its process-singleton links behind when a previous login was stopped rather than closed; they only
# ever point at a container that no longer exists, and a launch with them present refuses "profile in use".
rm -f "$ROOT/recon/.profile/SingletonLock" "$ROOT/recon/.profile/SingletonCookie" "$ROOT/recon/.profile/SingletonSocket"
exec docker compose --project-directory "$ROOT" -f "$ROOT/compose.yaml" run --rm --no-deps -T -p "$PORT:$PORT" -e RECON_DEBUG_PORT="$PORT" gate pnpm --filter recon login-remote
