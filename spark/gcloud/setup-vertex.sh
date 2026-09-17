#!/usr/bin/env bash
# spark/gcloud/setup-vertex.sh <project-id> <billing-account-id> [region] — the one-time Google Cloud setup for agent
# mode (STORY_047), run from the login persisted by login.sh. Idempotent: every step checks first, so a re-run is safe.
#
#   1. creates the project (name "MiniMax Local") unless it exists          gcloud projects create
#   2. links the billing account unless billing is already enabled          gcloud billing projects link
#   3. enables the Vertex AI API                                            gcloud services enable aiplatform.googleapis.com
#   4. checks the iam.disableServiceAccountKeyCreation policy — if it is enforced (an organisation's default on newer
#      orgs; a personal no-org project cannot have it) the script STOPS and names the fallback
#   5. creates the service account minimax-agent with roles/aiplatform.user only
#   6. writes its key to spark/data/secrets/vertex-sa.json (mode 600, owned by the owner's uid) unless one is there
#   7. writes VERTEX_PROJECT and VERTEX_LOCATION into the gitignored .env (created from .env.example when absent)
#
# Prints presence, never content: "key written: yes". The billing account id and the project id are identifiers,
# not credentials; the key never leaves spark/data/secrets. CLOUDSDK_CORE_DISABLE_PROMPTS keeps gcloud from asking.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
. "$HERE/lib.sh"
log() { printf '[setup-vertex] %s\n' "$*"; }
die() { printf '[setup-vertex] ERROR: %s\n' "$*" >&2; exit 1; }

PROJECT="${1:-}"
BILLING="${2:-}"
REGION="${3:-us-central1}"
[ -n "$PROJECT" ] && [ -n "$BILLING" ] || die "usage: $0 <project-id> <billing-account-id> [region]"
[[ "$PROJECT" =~ ^[a-z][a-z0-9-]{4,28}[a-z0-9]$ ]] || die "project id must be 6–30 chars, lowercase letters, digits and hyphens, starting with a letter"
[[ "$BILLING" =~ ^[0-9A-F]{6}-[0-9A-F]{6}-[0-9A-F]{6}$ ]] || die "billing account id must look like XXXXXX-XXXXXX-XXXXXX"
SA_NAME="minimax-agent"
SA_EMAIL="$SA_NAME@$PROJECT.iam.gserviceaccount.com"
ENV_FILE="$REPO_DIR/.env"
export CLOUDSDK_CORE_DISABLE_PROMPTS=1

prepare_dirs
signed_in || die "not signed in — the owner runs spark/gcloud/login.sh in his own terminal first"

# 1. the project
if gc projects describe "$PROJECT" --format='value(projectId)' > /dev/null 2>&1; then
  log "project exists: $PROJECT"
else
  log "creating project $PROJECT (MiniMax Local)"
  gc projects create "$PROJECT" --name="MiniMax Local" --set-as-default > /dev/null
  log "project created: $PROJECT"
fi
gc config set project "$PROJECT" > /dev/null 2>&1

# 2. billing
if [ "$(gc billing projects describe "$PROJECT" --format='value(billingEnabled)' 2>/dev/null | tr -d '[:space:]')" = "True" ]; then
  log "billing already enabled on $PROJECT"
else
  log "linking billing account to $PROJECT"
  gc billing projects link "$PROJECT" --billing-account="$BILLING" > /dev/null
  log "billing linked"
fi

# 3. the API
if gc services list --enabled --project="$PROJECT" --filter='config.name:aiplatform.googleapis.com' --format='value(config.name)' 2>/dev/null | grep -q aiplatform; then
  log "Vertex AI API already enabled"
else
  log "enabling the Vertex AI API (aiplatform.googleapis.com)"
  gc services enable aiplatform.googleapis.com --project="$PROJECT" > /dev/null
  log "Vertex AI API enabled"
fi

# 4. the org policy on key creation — read before trying to create one
policy="$(gc resource-manager org-policies describe iam.disableServiceAccountKeyCreation --project="$PROJECT" --effective 2>/dev/null || true)"
if printf '%s' "$policy" | grep -q 'enforced: true'; then
  die "iam.disableServiceAccountKeyCreation is enforced on this project, so a service-account key cannot be created. Fallback (STORY_047): the owner runs 'spark/gcloud/login.sh --adc' (gcloud auth application-default login) in his own terminal and the app uses that credentials file at the same path; say so in the story's Done note"
fi
log "key creation policy: not enforced"

# 5. the service account and its one role
if gc iam service-accounts describe "$SA_EMAIL" --project="$PROJECT" > /dev/null 2>&1; then
  log "service account exists: $SA_NAME"
else
  log "creating service account $SA_NAME"
  gc iam service-accounts create "$SA_NAME" --project="$PROJECT" --display-name="MiniMax Local agent (Vertex AI)" > /dev/null
  log "service account created"
fi
gc projects add-iam-policy-binding "$PROJECT" --member="serviceAccount:$SA_EMAIL" --role=roles/aiplatform.user --condition=None > /dev/null
log "role bound: roles/aiplatform.user"

# 6. the key — written straight into the mounted secrets directory by gcloud, never through this shell
# an empty file is a failed earlier attempt (gcloud opens the file before the API answers), not a key
[ -s "$SECRETS_DIR/vertex-sa.json" ] || rm -f "$SECRETS_DIR/vertex-sa.json"
if [ -s "$SECRETS_DIR/vertex-sa.json" ]; then
  log "key written: already (spark/data/secrets/vertex-sa.json exists — delete it to mint a new one)"
else
  # a service account created seconds ago is not yet visible to the keys API (eventual consistency): retry briefly
  attempt=0
  until gc iam service-accounts keys create "$KEY_FILE_IN_CONTAINER" --iam-account="$SA_EMAIL" --project="$PROJECT" > /dev/null 2>&1; do
    rm -f "$SECRETS_DIR/vertex-sa.json"
    attempt=$((attempt + 1))
    [ "$attempt" -lt 8 ] || die "could not create the key after $attempt tries — re-run this script in a minute"
    log "the service account is not visible to the keys API yet — retrying ($attempt/8)"
    sleep 8
  done
  chmod 600 "$SECRETS_DIR/vertex-sa.json"
  log "key written: yes"
fi
[ -s "$SECRETS_DIR/vertex-sa.json" ] && [ -r "$SECRETS_DIR/vertex-sa.json" ] || die "the key file is empty or not readable by uid $SPARK_UID"

# 7. the variables in .env
[ -f "$ENV_FILE" ] || cp "$REPO_DIR/.env.example" "$ENV_FILE"
set_env() {
  local key="$1" value="$2"
  if grep -q "^$key=" "$ENV_FILE"; then
    sed -i "s|^$key=.*|$key=$value|" "$ENV_FILE"
  else
    printf '%s=%s\n' "$key" "$value" >> "$ENV_FILE"
  fi
}
set_env VERTEX_PROJECT "$PROJECT"
set_env VERTEX_LOCATION "$REGION"
log ".env: VERTEX_PROJECT and VERTEX_LOCATION set (VERTEX_MODEL is STORY_048's)"
log "done — project $PROJECT, region $REGION; restart the app (docker compose up -d app) to mount the key"
