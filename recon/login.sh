#!/usr/bin/env bash
# recon/login.sh — sign the recon profile in to agent.minimax.io from the Spark (CHORE_005). Two routes, both in the
# gate container, the profile in recon/.profile/ (gitignored), the owner typing every credential himself:
#   • a display is reachable (DISPLAY names an X socket that exists — the owner's desktop session, seen through NoMachine
#     or at the console): the headed recon:login window opens on that display and the owner signs in there;
#   • no display (or RECON_LOGIN=remote): recon:login-remote runs headless with Chromium's DevTools port published on the
#     LAN for the few minutes of the login, and the owner signs in through chrome://inspect on another machine.
# Either way, `recon/run.sh check` then reads "session: signed-in".
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

# The X socket for DISPLAY (":1" or ":1.0" → /tmp/.X11-unix/X1), empty when DISPLAY is unset or names a TCP display.
display_socket() {
  case "${DISPLAY:-}" in
    :*) local d="${DISPLAY#:}"; printf '/tmp/.X11-unix/X%s' "${d%%.*}" ;;
    *) ;;
  esac
}

socket="$(display_socket || true)"
if [ "${RECON_LOGIN:-}" != "remote" ] && [ -n "$socket" ] && [ -S "$socket" ]; then
  xauth="${XAUTHORITY:-$HOME/.Xauthority}"
  [ -r "$xauth" ] || { printf '[recon] ERROR: DISPLAY=%s is set but its Xauthority (%s) is not readable; set XAUTHORITY or RECON_LOGIN=remote\n' "$DISPLAY" "$xauth" >&2; exit 1; }
  printf '[recon] opening the headed login window on display %s (the desktop session) — sign in there\n' "$DISPLAY"
  # The window is the container's Chromium drawn on the host's X server: the socket directory and the session's
  # Xauthority (read-only) go in; the cookie's wildcard entry lets a container with another hostname present it.
  exec docker compose --project-directory "$ROOT" -f "$ROOT/compose.yaml" run --rm --no-deps -T --name minimax-recon-login \
    -e DISPLAY="$DISPLAY" -e XAUTHORITY=/tmp/Xauthority \
    -v /tmp/.X11-unix:/tmp/.X11-unix -v "$xauth:/tmp/Xauthority:ro" \
    gate pnpm --filter recon login
fi

printf '[recon] no display reachable — publishing the DevTools port %s for chrome://inspect on another machine\n' "$PORT"
exec docker compose --project-directory "$ROOT" -f "$ROOT/compose.yaml" run --rm --no-deps -T -p "$PORT:$PORT" -e RECON_DEBUG_PORT="$PORT" gate pnpm --filter recon login-remote
