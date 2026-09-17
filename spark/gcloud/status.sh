#!/usr/bin/env bash
# spark/gcloud/status.sh — is there a Google Cloud login in the persisted configuration, and which project is set?
# Prints presence only ("signed in: yes/no"), never an account, a token or a key (STORY_047; CLAUDE.md § 4b).
#   --revoke   forget the login (the next login.sh signs in afresh)
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
. "$HERE/lib.sh"

prepare_dirs
if [ "${1:-}" = "--revoke" ]; then
  gc auth revoke --all > /dev/null 2>&1 || true
  printf '[status] login revoked\n'
fi
if signed_in; then
  printf '[status] signed in: yes\n'
else
  printf '[status] signed in: no — run spark/gcloud/login.sh in your own terminal\n'
fi
project="$(gc config get-value project 2>/dev/null | tr -d '[:space:]' || true)"
printf '[status] project set in the gcloud config: %s\n' "${project:-(none)}"
if [ -s "$SECRETS_DIR/vertex-sa.json" ]; then printf '[status] key written: yes\n'; else printf '[status] key written: no\n'; fi
