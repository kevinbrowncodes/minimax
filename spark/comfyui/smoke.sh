#!/usr/bin/env bash
# spark/comfyui/smoke.sh — one MiniMax-H3 FL2VA text-to-video clip through the running ComfyUI container, with the numbers.
#
# Submits h3_t2v_prompt.json (derived from the official template) through POST /prompt with the story's fixed prompt,
# 16:9 at 1344x768, 5 s (124 frames on the model's 17k+5 grid), 24 fps and the template's 20 steps; polls GET /history/<id>;
# saves the MP4 through GET /view into $SPARK_DATA/smoke; runs memwatch.sh for the duration; keeps the container log for
# the run. Exits non-zero if ComfyUI errors, the container dies, the run times out, or the file is missing or empty.
# Prints wall time, peak memory, model-load lines, file size and duration. Host needs only curl, jq and ffprobe.
#
# Env: H3_PRECISION (int8_convrot)  H3_TEXT_ENCODER (nvfp4_awq)  WIDTH (1344) HEIGHT (768) DURATION (5, whole seconds)  FPS (24)
#      SEED (1) STEPS (20) SAMPLER (res_multistep) SCHEDULER (simple)  POLL_SECONDS (5)  TIMEOUT_SECONDS (7200)  SPARK_DATA
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
. "$HERE/lib.sh"

H3_PRECISION="${H3_PRECISION:-int8_convrot}"
H3_TEXT_ENCODER="${H3_TEXT_ENCODER:-nvfp4_awq}"
WIDTH="${WIDTH:-1344}"; HEIGHT="${HEIGHT:-768}"; DURATION="${DURATION:-5}"; FPS="${FPS:-24}"
SEED="${SEED:-1}"; STEPS="${STEPS:-20}"; SAMPLER="${SAMPLER:-res_multistep}"; SCHEDULER="${SCHEDULER:-simple}"
POLL_SECONDS="${POLL_SECONDS:-5}"; TIMEOUT_SECONDS="${TIMEOUT_SECONDS:-7200}"
OUT_DIR="$SPARK_DATA/smoke"
# Fixed so that later precisions are comparable (STORY_005 Technical Notes; the reference rendered the same prompt on 2026-09-12).
PROMPT="${PROMPT:-A small paper boat drifting across a rain puddle in soft morning light, gentle ripples, camera slowly pushing in.}"

log() { printf '[smoke] %s\n' "$*"; }
die() { printf '[smoke] ERROR: %s\n' "$*" >&2; exit 1; }
for t in docker curl jq ffprobe; do command -v "$t" >/dev/null || die "$t is required on the host"; done

unet_file="$(h3_unet_file "$H3_PRECISION")"
clip_file="$(h3_clip_file "$H3_TEXT_ENCODER")"
length="$(h3_length_for_seconds "$DURATION")"
stamp="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUT_DIR" "$SPARK_DATA/logs"
out_mp4="$OUT_DIR/smoke-$stamp-$H3_PRECISION.mp4"
summary="$OUT_DIR/smoke-$stamp-$H3_PRECISION.txt"
memlog="$SPARK_DATA/logs/memwatch-$stamp.log"
runlog="$SPARK_DATA/logs/smoke-$stamp-comfyui.log"

# --- ComfyUI up, and it can see the files -----------------------------------------------------------
container_running || die "the $COMFY_CONTAINER container is not running — run run.sh first"
stats="$(curl -fsS "$COMFY_URL/system_stats" 2>/dev/null)" || die "ComfyUI is not answering at $COMFY_URL"
comfy_version="$(jq -r '.system.comfyui_version' <<< "$stats")"
torch_version="$(jq -r '.system.pytorch_version' <<< "$stats")"
object_info="$(curl -fsS "$COMFY_URL/object_info")"
jq -e --arg f "$unet_file" '.UNETLoader.input.required.unet_name[0] | index($f) != null' <<< "$object_info" > /dev/null \
  || die "ComfyUI does not list $unet_file under diffusion_models — run fetch-h3.sh (H3_PRECISION=$H3_PRECISION)"
jq -e --arg f "$clip_file" '.CLIPLoader.input.required.clip_name[0] | index($f) != null' <<< "$object_info" > /dev/null \
  || die "ComfyUI does not list $clip_file under text_encoders — run fetch-h3.sh (H3_TEXT_ENCODER=$H3_TEXT_ENCODER)"
jq -e '.MiniMaxH3ImageToVideo' <<< "$object_info" > /dev/null || die "this ComfyUI has no MiniMaxH3ImageToVideo node (needs >= 0.30.0)"

# --- the graph --------------------------------------------------------------------------------------
client_id="smoke-$stamp"
body="$(jq -n --slurpfile g "$HERE/h3_t2v_prompt.json" \
  --arg unet "$unet_file" --arg clip "$clip_file" --arg prompt "$PROMPT" --arg sampler "$SAMPLER" --arg scheduler "$SCHEDULER" \
  --argjson width "$WIDTH" --argjson height "$HEIGHT" --argjson length "$length" --argjson fps "$FPS" \
  --argjson seed "$SEED" --argjson steps "$STEPS" --arg client_id "$client_id" '
  ($g[0] | del(._comment)
    | .unet.inputs.unet_name = $unet
    | .clip.inputs.clip_name = $clip
    | .cond.inputs.prompt = $prompt | .cond.inputs.width = $width | .cond.inputs.height = $height | .cond.inputs.length = $length
    | .noise.inputs.noise_seed = $seed
    | .sampler.inputs.sampler_name = $sampler
    | .sigmas.inputs.scheduler = $scheduler | .sigmas.inputs.steps = $steps
    | .video.inputs.fps = ($fps | tonumber)) as $p
  | {prompt: $p, client_id: $client_id}')"

log "comfyui $comfy_version  pytorch $torch_version  container $COMFY_CONTAINER"
log "unet $unet_file  clip $clip_file  ${WIDTH}x${HEIGHT}  ${DURATION}s -> $length frames @ ${FPS}fps  steps $STEPS  $SAMPLER/$SCHEDULER  seed $SEED"
log "prompt: $PROMPT"

# --- memwatch for the duration; the container log is kept whatever happens ---------------------------
"$HERE/memwatch.sh" "$memlog" 2 2> /dev/null &
memwatch_pid=$!
prompt_id=""
t_submit="$(date +%s)"
save_run_log() { docker logs -t --since "$t_submit" "$COMFY_CONTAINER" > "$runlog" 2>&1 || true; }
cleanup() {
  if kill -0 "$memwatch_pid" 2>/dev/null; then kill -TERM "$memwatch_pid" 2>/dev/null || true; wait "$memwatch_pid" 2>/dev/null || true; fi
  save_run_log
}
on_fail() {
  if [ -n "$prompt_id" ]; then curl -fsS -X POST "$COMFY_URL/interrupt" > /dev/null 2>&1 || true; fi  # never leave the job running
  cleanup
}
trap on_fail ERR
trap cleanup EXIT

# --- submit -----------------------------------------------------------------------------------------
resp="$(curl -fsS -X POST "$COMFY_URL/prompt" -H 'Content-Type: application/json' --data-binary "$body")" \
  || { log "POST /prompt failed:"; curl -sS -X POST "$COMFY_URL/prompt" -H 'Content-Type: application/json' --data-binary "$body" | jq . >&2 || true; false; }
if jq -e '.error' <<< "$resp" > /dev/null 2>&1; then
  log "ComfyUI rejected the graph:"; jq . <<< "$resp" >&2; false
fi
prompt_id="$(jq -r '.prompt_id' <<< "$resp")"
log "submitted prompt_id $prompt_id at $(date -d "@$t_submit" +%H:%M:%S)"

# --- poll /history until done or error ---------------------------------------------------------------
entry=""; last_note=0
while true; do
  now="$(date +%s)"; elapsed=$((now - t_submit))
  if [ "$elapsed" -gt "$TIMEOUT_SECONDS" ]; then die "timed out after ${elapsed}s (prompt $prompt_id)"; fi
  if ! container_running || ! curl -fsS "$COMFY_URL/system_stats" > /dev/null 2>&1; then
    printf '%s\n' "--- last 60 container log lines ---" >&2; docker logs --tail 60 "$COMFY_CONTAINER" >&2 2>&1 || true
    die "ComfyUI stopped answering ${elapsed}s after submit — the container died or hung (out of memory?)"
  fi
  entry="$(curl -fsS "$COMFY_URL/history/$prompt_id" | jq -c --arg id "$prompt_id" '.[$id] // empty')"
  if [ -n "$entry" ]; then
    status="$(jq -r '.status.status_str // "unknown"' <<< "$entry")"
    if [ "$status" = "error" ]; then
      log "ComfyUI reported an error after ${elapsed}s. status.messages, verbatim:"
      jq -r '.status.messages[] | @json' <<< "$entry" >&2
      printf '%s\n' "--- container log since submit: error/traceback lines, then the tail ---" >&2
      docker logs --since "$t_submit" "$COMFY_CONTAINER" 2>&1 | grep -nE 'Error|error|Traceback|Exception' | head -40 >&2 || true
      docker logs --tail 30 "$COMFY_CONTAINER" >&2 2>&1 || true
      false
    fi
    if jq -e '.status.completed == true' <<< "$entry" > /dev/null; then break; fi
  fi
  if [ $((elapsed - last_note)) -ge 30 ]; then
    log "…${elapsed}s  $(docker logs --tail 1 "$COMFY_CONTAINER" 2>&1 | tr -d '\r' | tail -c 140)"; last_note=$elapsed
  fi
  sleep "$POLL_SECONDS"
done
t_done="$(date +%s)"
wall=$((t_done - t_submit))
log "completed after ${wall}s"

# --- fetch the file through /view -------------------------------------------------------------------
read -r fname fsub ftype < <(jq -r '[.outputs[] | .. | objects | select(has("filename"))][0] | "\(.filename) \(.subfolder // "") \(.type // "output")"' <<< "$entry")
[ -n "${fname:-}" ] && [ "$fname" != "null" ] || die "history has no output file for $prompt_id: $(jq -c '.outputs' <<< "$entry")"
curl -fsS -G "$COMFY_URL/view" --data-urlencode "filename=$fname" --data-urlencode "subfolder=$fsub" --data-urlencode "type=$ftype" -o "$out_mp4" \
  || die "GET /view failed for $fname"
[ -s "$out_mp4" ] || die "$out_mp4 is missing or empty"
t_file="$(date +%s)"

# --- numbers ----------------------------------------------------------------------------------------
size_bytes="$(stat -c %s "$out_mp4")"
probe="$(ffprobe -v error -show_entries format=duration,size -show_entries stream=codec_type,codec_name,width,height,r_frame_rate,sample_rate,channels -of json "$out_mp4")"
duration_s="$(jq -r '.format.duration' <<< "$probe")"
video_desc="$(jq -r '[.streams[] | select(.codec_type=="video")][0] | "\(.codec_name) \(.width)x\(.height) \(.r_frame_rate) fps"' <<< "$probe")"
audio_desc="$(jq -r '[.streams[] | select(.codec_type=="audio")][0] | if . then "\(.codec_name) \(.sample_rate) Hz \(.channels) ch" else "none" end' <<< "$probe")"
cleanup
peak_line="$(grep '^# peak' "$memlog" | tail -n 1 || true)"
exec_msgs="$(jq -r '.status.messages[] | select(.[0] | test("execution_(start|success)")) | "\(.[0]) \(.[1].timestamp)"' <<< "$entry" 2>/dev/null | tr '\n' ';' || true)"
load_lines="$(grep -E 'Requested to load|loaded completely|loaded partially|Prompt executed|lowvram|out of memory|OutOfMemory' "$runlog" || true)"

{
  echo "story=STORY_005 smoke  date=$(date -Iseconds)"
  echo "comfyui_version=$comfy_version  pytorch=$torch_version  image=minimax-spark/comfyui:$COMFYUI_TAG"
  echo "precision=$H3_PRECISION  unet=$unet_file  text_encoder=$H3_TEXT_ENCODER  clip=$clip_file"
  echo "size=${WIDTH}x${HEIGHT}  duration_requested=${DURATION}s  length=${length} frames  fps=$FPS  steps=$STEPS  sampler=$SAMPLER  scheduler=$SCHEDULER  seed=$SEED"
  echo "prompt=$PROMPT"
  echo "prompt_id=$prompt_id"
  echo "wall_submit_to_done=${wall}s  submit_to_file=$((t_file - t_submit))s"
  echo "server_execution_messages=$exec_msgs"
  echo "output=$out_mp4"
  echo "file_size_bytes=$size_bytes  ($(awk -v b="$size_bytes" 'BEGIN { printf "%.1f", b / 1048576 }') MiB)"
  echo "ffprobe_duration=${duration_s}s  video=$video_desc  audio=$audio_desc"
  echo "memory_peak: ${peak_line#\# }"
  echo "memwatch_log=$memlog"
  echo "container_log=$runlog"
  echo "--- model load / execution lines from the container log (docker timestamps) ---"
  printf '%s\n' "$load_lines"
} | tee "$summary"
log "summary written to $summary"
