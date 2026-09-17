#!/usr/bin/env bash
# spark/gcloud/login.sh — the owner's one-time sign-in to Google Cloud, from the gcloud container (STORY_047).
#
#   THE OWNER RUNS THIS IN HIS OWN TERMINAL. gcloud prints a URL; open it in your browser, approve, then paste the
#   authorization code it shows back into this terminal (gcloud's --no-launch-browser flow, read from Google's
#   reference 2026-09-17). The code and the resulting credentials never pass through an assistant's session
#   (CLAUDE.md § 4b) — the assistant runs setup-vertex.sh afterwards and only checks that a login exists.
#
# The login persists under spark/data/gcloud (gitignored). Re-run it if status.sh says "signed in: no".
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
. "$HERE/lib.sh"
log() { printf '[login] %s\n' "$*"; }

prepare_dirs
if [ "${1:-}" = "--adc" ]; then
  # The fallback when the organisation forbids service-account keys (setup-vertex.sh step 4): the owner's own
  # application-default credentials, written by gcloud into the persisted config and copied to the path the app mounts.
  log "Application-default login (the key-creation fallback): open the URL, approve, paste the code back here."
  compose run --rm gcloud auth application-default login --no-launch-browser
  cp "$GCLOUD_CONFIG_DIR/application_default_credentials.json" "$SECRETS_DIR/vertex-sa.json"
  chmod 600 "$SECRETS_DIR/vertex-sa.json"
  log "credentials file written: yes (authorized-user shape; the app's config accepts it)"
  exit 0
fi
if signed_in; then
  log "already signed in (spark/data/gcloud). To sign in as someone else, run: spark/gcloud/status.sh --revoke"
  exit 0
fi
log "Sign in once: open the URL gcloud prints in your browser, approve, then paste the code it shows back here."
compose run --rm gcloud auth login --no-launch-browser
"$HERE/status.sh"
