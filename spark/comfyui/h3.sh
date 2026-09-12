#!/usr/bin/env bash
# spark/comfyui/h3.sh — the Comfy-Org/MiniMax-H3 file names and the frame-count rule. Sourced on the host (lib.sh)
# and inside the image (/comfy/bin/h3.sh). No side effects.
# shellcheck disable=SC2034  # the variables are used by the scripts that source this file
#
# Weights are licensed under the MiniMax H3 Community License Agreement, read on 2026-09-12 from
# https://huggingface.co/MiniMaxAI/MiniMax-H3/blob/main/LICENSE. The Spark is used outside the licence's
# Excluded Territories (EPIC_004, decision #1, owner 2026-09-12).

H3_REPO="Comfy-Org/MiniMax-H3"
H3_LICENSE="MiniMax H3 Community License Agreement (https://huggingface.co/MiniMaxAI/MiniMax-H3/blob/main/LICENSE, read 2026-09-12)"
H3_VIDEO_VAE="minimax_h3_video_vae_fp16.safetensors"
H3_AUDIO_VAE="minimax_h3_audio_vae_fp32.safetensors"
H3_TEMPLATE="video_minimax_h3_t2v.json"

# The FL2VA diffusion model file for a precision name. fp8_scaled exists only as the pruned file on the Hub.
h3_unet_file() {
  case "$1" in
    int8_convrot)        echo "minimax_h3_fl2va_int8_convrot.safetensors" ;;
    bf16)                echo "minimax_h3_fl2va_bf16.safetensors" ;;
    fp8_scaled)          echo "minimax_h3_fl2va_pruned_fp8_scaled.safetensors" ;;
    pruned_int8_convrot) echo "minimax_h3_fl2va_pruned_int8_convrot.safetensors" ;;
    pruned_bf16)         echo "minimax_h3_fl2va_pruned_bf16.safetensors" ;;
    *) printf 'unknown H3_PRECISION "%s" (int8_convrot | bf16 | fp8_scaled | pruned_int8_convrot | pruned_bf16)\n' "$1" >&2; return 1 ;;
  esac
}

# The Qwen3-VL-32B text encoder file for a quantisation name. nvfp4_awq is the official template's default.
h3_clip_file() {
  case "$1" in
    nvfp4_awq|int8_convrot|bf16) echo "qwen3vl_32b_minimax_h3_$1.safetensors" ;;
    *) printf 'unknown H3_TEXT_ENCODER "%s" (nvfp4_awq | int8_convrot | bf16)\n' "$1" >&2; return 1 ;;
  esac
}

# Frame count for a duration in whole seconds at 24 fps, snapped up to the model's 17k+5 grid —
# the official template's expression: max(5, round(a * 24)) + (5 - (max(5, round(a * 24)) % 17)) % 17.
h3_length_for_seconds() {
  local n=$(( $1 * 24 ))
  if [ "$n" -lt 5 ]; then n=5; fi
  echo $(( n + (((5 - n % 17) % 17) + 17) % 17 ))
}
