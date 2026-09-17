#!/usr/bin/env bash
# spark/gcloud/lib.sh — host-side shared paths and the compose invocation for the gcloud container (STORY_047).
# Sourced by login.sh, status.sh and setup-vertex.sh. The host needs only docker; nothing is installed on it —
# gcloud runs from Google's official image (root compose.yaml › gcloud, profile "tools") as the owner's uid, with
# its configuration (the login) persisted under spark/data/gcloud and the service-account key under spark/data/secrets,
# both gitignored through spark/data/.
# shellcheck disable=SC2034  # the variables are used by the scripts that source this file
SPARK_GCLOUD_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SPARK_GCLOUD_DIR/../.." && pwd)"
SPARK_DATA="${SPARK_DATA:-$REPO_DIR/spark/data}"
GCLOUD_CONFIG_DIR="$SPARK_DATA/gcloud"
SECRETS_DIR="$SPARK_DATA/secrets"
KEY_FILE_IN_CONTAINER="/secrets/vertex-sa.json"
SPARK_UID="$(id -u)"
SPARK_GID="$(id -g)"
export SPARK_DATA SPARK_UID SPARK_GID

compose() { docker compose --project-directory "$REPO_DIR" -f "$REPO_DIR/compose.yaml" "$@"; }
# One gcloud command in a throw-away container. Non-interactive (-T); login.sh runs its own interactive form.
gc() { compose run --rm -T gcloud "$@"; }

prepare_dirs() { mkdir -p "$GCLOUD_CONFIG_DIR" "$SECRETS_DIR"; chmod 700 "$SECRETS_DIR"; }

# "yes" when a credentialed account is active in the persisted configuration; never prints the account.
signed_in() {
  local n
  n="$(gc auth list --filter=status:ACTIVE --format='value(account)' 2>/dev/null | grep -c . || true)"
  [ "${n:-0}" -gt 0 ]
}
