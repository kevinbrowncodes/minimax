#!/usr/bin/env bash
# spark/comfyui/container/fetch-h3.sh — runs inside the image (docker compose run --rm fetch): download from
# Comfy-Org/MiniMax-H3 what FL2VA text-to-video and Ref2VA extensions (STORY_016) need, at one precision, into the models bind mount; verify every
# size against the Hub; copy the official template out of the pinned templates package; print the total on disk.
#
# Refuses to start unless MIN_FREE_GB (300) is free on the volume behind the models mount. Never deletes anything.
# Re-running skips files that are already complete.
#
# Env: H3_PRECISION (int8_convrot | bf16 | fp8_scaled | pruned_int8_convrot | pruned_bf16)
#      H3_TEXT_ENCODER (nvfp4_awq | int8_convrot | bf16)   MIN_FREE_GB (300)   HF_TOKEN (optional; the repo is public)
set -euo pipefail
# shellcheck source=../h3.sh
. /comfy/bin/h3.sh

MODELS=/comfy/ComfyUI/models
TEMPLATES=/comfy/templates
H3_PRECISION="${H3_PRECISION:-int8_convrot}"
H3_TEXT_ENCODER="${H3_TEXT_ENCODER:-nvfp4_awq}"
MIN_FREE_GB="${MIN_FREE_GB:-300}"

log() { printf '[fetch] %s\n' "$*"; }
die() { printf '[fetch] ERROR: %s\n' "$*" >&2; exit 1; }
gb() { awk -v b="$1" 'BEGIN { printf "%.2f", b / 1000000000 }'; }

[ -d "$MODELS" ] || die "$MODELS is not mounted"
unet_file="$(h3_unet_file "$H3_PRECISION")"
ref2va_file="$(h3_ref2va_file "$H3_PRECISION")"
clip_file="$(h3_clip_file "$H3_TEXT_ENCODER")"
FILES=("diffusion_models/$unet_file" "diffusion_models/$ref2va_file" "text_encoders/$clip_file" "vae/$H3_VIDEO_VAE" "vae/$H3_AUDIO_VAE")

log "licence: $H3_LICENSE"
log "the Spark is used outside the licence's Excluded Territories (EPIC_004 decision #1, owner 2026-09-12)"

# --- disk gate (df on the bind mount reports the host volume) ---------------------------------------
free_gb="$(df --output=avail -B1G "$MODELS" | tail -n 1 | tr -d ' ')"
log "free on the models volume: ${free_gb} GB (need >= ${MIN_FREE_GB} GB)"
if [ "$free_gb" -lt "$MIN_FREE_GB" ]; then
  die "only ${free_gb} GB free; STORY_005 needs ${MIN_FREE_GB} GB. Stop and ask the owner which volume to use — never delete anything to make room."
fi

# --- expected sizes from the Hub (x-linked-size on the resolve redirect) ----------------------------
expected_size() {
  curl -fsI "https://huggingface.co/$H3_REPO/resolve/main/$1" | tr -d '\r' | awk 'tolower($1) == "x-linked-size:" { print $2 }'
}
declare -A want
total_expected=0
for f in "${FILES[@]}"; do
  s="$(expected_size "$f")"
  [ -n "$s" ] || die "could not read the size of $f from the Hub"
  want["$f"]="$s"
  total_expected=$((total_expected + s))
  printf '[fetch]   %-64s %7s GB\n' "$f" "$(gb "$s")"
done
log "to fetch: ${#FILES[@]} files, $(gb "$total_expected") GB, precision=$H3_PRECISION text_encoder=$H3_TEXT_ENCODER"

# --- download (hf resumes partial files and skips complete ones) ------------------------------------
log "downloading into $MODELS"
hf download "$H3_REPO" "${FILES[@]}" --local-dir "$MODELS" > /dev/null

# --- verify sizes -----------------------------------------------------------------------------------
ok=1
for f in "${FILES[@]}"; do
  path="$MODELS/$f"
  if [ ! -f "$path" ]; then log "MISSING $f"; ok=0; continue; fi
  have="$(stat -c %s "$path")"
  if [ "$have" != "${want[$f]}" ]; then log "SIZE MISMATCH $f: have $have, Hub says ${want[$f]}"; ok=0; else log "ok $f ($have bytes)"; fi
done
[ "$ok" = 1 ] || die "one or more files are missing or the wrong size"

# --- the official template, from the templates package pinned by ComfyUI's requirements -------------
tpl="$(find /comfy/venv -name "$H3_TEMPLATE" -print -quit 2>/dev/null || true)"
[ -n "$tpl" ] || die "the official template $H3_TEMPLATE is not in the venv's comfyui-workflow-templates package"
mkdir -p "$TEMPLATES" && cp -f "$tpl" "$TEMPLATES/$H3_TEMPLATE"
log "template: ${tpl#/comfy/venv/} -> $TEMPLATES/$H3_TEMPLATE"

log "on disk under the models mount:"
du -ch "${FILES[@]/#/$MODELS/}" | sed 's/^/[fetch]   /'
log "done"
