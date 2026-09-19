#!/usr/bin/env bash
# spark/comfyui/container/fetch-nsfw.sh — runs inside the image (docker compose run --rm fetch-nsfw; STORY_063): fill the
# NSFW container's models directory from the manifest. One row per file, tab-separated:
#   <dest under models-nsfw>  <source: copy:<path under models/> | https://…>  <sha256>  <bytes>  <note>
# copy: rows come from the SFW models mount (read-only, /comfy/models-sfw) — a local copy, never a download;
# https rows are downloaded with curl (Civitai: the token as a query parameter, so the signed redirect never sees it;
# Hugging Face: HF_TOKEN as a bearer header if set). Every file lands as <dest>.part and is renamed only when its size and
# SHA-256 match the manifest; a present file with the right hash is skipped; nothing is ever deleted.
#
# Env: MIN_FREE_GB (100)   CIVITAI_TOKEN (never printed)   HF_TOKEN (optional)
set -euo pipefail
MODELS=/comfy/ComfyUI/models
SFW=/comfy/models-sfw
MANIFEST=/comfy/nsfw/nsfw-files.tsv
MIN_FREE_GB="${MIN_FREE_GB:-100}"

log() { printf '[fetch-nsfw] %s\n' "$*"; }
die() { printf '[fetch-nsfw] ERROR: %s\n' "$*" >&2; exit 1; }
gb() { awk -v b="$1" 'BEGIN { printf "%.2f", b / 1000000000 }'; }
sha_of() { sha256sum "$1" | cut -d ' ' -f 1; }

[ -d "$MODELS" ] || die "$MODELS is not mounted"
[ -f "$MANIFEST" ] || die "$MANIFEST is not mounted"
for t in curl sha256sum cp stat awk; do command -v "$t" > /dev/null || die "$t is missing in the image"; done

free_gb="$(df --output=avail -B1G "$MODELS" | tail -n 1 | tr -d ' ')"
log "free on the models-nsfw volume: ${free_gb} GB (need >= ${MIN_FREE_GB} GB)"
[ "$free_gb" -ge "$MIN_FREE_GB" ] || die "only ${free_gb} GB free — never delete anything to make room; ask the owner"

rows=0; done_rows=0; skipped=0; skipped_rows=""; total_bytes=0; t_all="$(date +%s)"
while IFS=$'\t' read -r dest source sha bytes note; do
  case "$dest" in ''|'#'*) continue ;; esac
  rows=$((rows + 1))
  sha="${sha,,}"
  path="$MODELS/$dest"; part="$path.part"
  mkdir -p "$(dirname "$path")"
  if [ -f "$path" ] && [ "$(stat -c %s "$path")" = "$bytes" ]; then
    if [ "$(sha_of "$path")" = "$sha" ]; then
      log "ok (present)   $dest  $(gb "$bytes") GB"; skipped=$((skipped + 1)); continue
    fi
    log "present but the hash differs — fetching again: $dest"
  fi
  t0="$(date +%s)"
  case "$source" in
    copy:*)
      src="$SFW/${source#copy:}"
      [ -f "$src" ] || die "$src is missing under the SFW models mount (fetch-h3.sh first): needed for $dest"
      [ "$(stat -c %s "$src")" = "$bytes" ] || die "$src has $(stat -c %s "$src") bytes, the manifest says $bytes — the SFW file is not the one the manifest names"
      log "copying        $dest  from models/${source#copy:}  $(gb "$bytes") GB"
      cp --reflink=auto "$src" "$part"
      ;;
    https://civitai.com/*)
      url="$source"
      if [ -n "${CIVITAI_TOKEN:-}" ]; then
        case "$url" in *\?*) url="$url&token=$CIVITAI_TOKEN" ;; *) url="$url?token=$CIVITAI_TOKEN" ;; esac
      fi
      log "downloading    $dest  from civitai (file $(sed -E 's/.*fileId=([0-9]+).*/\1/' <<< "$source"))  $(gb "$bytes") GB"
      if ! curl -fsSL --retry 3 --retry-delay 5 -A 'minimax-local/1.0' -o "$part" "$url"; then
        rm -f "$part"
        if [ -z "${CIVITAI_TOKEN:-}" ]; then
          log "SKIPPED        $dest — Civitai refused it without a token (some of its NSFW files need CIVITAI_TOKEN); the rest continues"
          skipped_rows="$skipped_rows $dest"; continue
        fi
        die "download failed for $dest with the token set — see the curl error above"
      fi
      ;;
    https://huggingface.co/*)
      log "downloading    $dest  from huggingface  $(gb "$bytes") GB"
      if [ -n "${HF_TOKEN:-}" ]; then
        curl -fsSL --retry 3 --retry-delay 5 -H "Authorization: Bearer $HF_TOKEN" -o "$part" "$source" || die "download failed for $dest"
      else
        curl -fsSL --retry 3 --retry-delay 5 -o "$part" "$source" || die "download failed for $dest"
      fi
      ;;
    *) die "unknown source kind for $dest: $source" ;;
  esac
  have="$(stat -c %s "$part")"
  [ "$have" = "$bytes" ] || die "$dest: $have bytes, the manifest says $bytes (kept as $part for inspection)"
  got="$(sha_of "$part")"
  [ "$got" = "$sha" ] || die "$dest: SHA-256 $got, the manifest says $sha (kept as $part for inspection)"
  mv -f "$part" "$path"
  t1="$(date +%s)"
  log "ok             $dest  $(gb "$bytes") GB in $((t1 - t0))s  ${note:+— $note}"
  done_rows=$((done_rows + 1)); total_bytes=$((total_bytes + bytes))
done < "$MANIFEST"
log "manifest rows $rows: $done_rows fetched or copied ($(gb "$total_bytes") GB in $(( $(date +%s) - t_all ))s), $skipped already present"
log "on disk under models-nsfw:"
du -sh "$MODELS"/* 2>/dev/null | sed 's/^/[fetch-nsfw]   /'
if [ -n "$skipped_rows" ]; then
  log "NOT FETCHED (Civitai, no token):$skipped_rows — add CIVITAI_TOKEN to the Spark's .env and run fetch-nsfw.sh again; present files are skipped"
  log "done, with rows missing"; exit 3
fi
log "done"
