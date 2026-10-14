#!/usr/bin/env bash
# spark/comfyui/memwatch.sh — sample used unified memory every N seconds from /proc/meminfo, plus the GPU's temperature
# and power draw from nvidia-smi (CHORE_023); print the peaks on exit.
#
# nvidia-smi reports no memory column on the Spark, so "used" here is MemTotal - MemAvailable, which is what both the
# GPU and the CPU side draw from. Swap is sampled too: swap growing during a run means the model did not fit.
# Runs on the host (the container's /proc/meminfo would show the same numbers, but the host needs no image for this).
# The GPU columns are "-" when nvidia-smi answers nothing, so a box without it still gets the memory columns.
#
# Usage: memwatch.sh [logfile] [interval-seconds]     stop with Ctrl-C or SIGTERM; the peak is appended to the log and printed.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
. "$HERE/lib.sh"

LOG="${1:-$SPARK_DATA/logs/memwatch-$(date +%Y%m%d-%H%M%S).log}"
INTERVAL="${2:-2}"
mkdir -p "$(dirname "$LOG")"

peak_used=0; peak_used_at=""; peak_swap=0; samples=0
gib() { awk -v k="$1" 'BEGIN { printf "%.1f", k / 1048576 }'; }
report() {
  local line
  local gpeaks
  gpeaks=$(awk -F'\t' 'NR>1 && $6!="-" && $6!="" {if($6+0>t)t=$6+0; if($7+0>w)w=$7+0} END{if(t=="")print "-", "-"; else printf "%d %.0f\n", t, w}' "$LOG" 2>/dev/null || echo "- -")
  line="# peak used $(gib "$peak_used") GiB at $peak_used_at; peak swap used $(gib "$peak_swap") GiB; peak GPU temp ${gpeaks% *} C; peak GPU power ${gpeaks#* } W; $samples samples every ${INTERVAL}s"
  printf '%s\n' "$line" >> "$LOG"
  printf '%s\n' "$line" >&2
}
trap 'exit 0' INT TERM  # the EXIT trap reports once
trap 'report' EXIT

printf '# timestamp\tused_kib\tavailable_kib\tswap_used_kib\ttotal_kib\tgpu_temp_c\tgpu_power_w\n' >> "$LOG"
while true; do
  read -r total avail swap_used < <(awk '
    /^MemTotal:/ {t=$2} /^MemAvailable:/ {a=$2} /^SwapTotal:/ {st=$2} /^SwapFree:/ {sf=$2}
    END {print t, a, st-sf}' /proc/meminfo)
  used=$((total - avail))
  now="$(date +%Y-%m-%dT%H:%M:%S)"
  gstats=$(nvidia-smi --query-gpu=temperature.gpu,power.draw --format=csv,noheader,nounits 2>/dev/null | head -1 | tr -d ',' || true)
  gtemp=${gstats%% *}; gpow=${gstats#* }; [ -n "$gstats" ] && [ "$gtemp" != "$gstats" ] || { gtemp=-; gpow=-; }
  printf '%s\t%d\t%d\t%d\t%d\t%s\t%s\n' "$now" "$used" "$avail" "$swap_used" "$total" "$gtemp" "$gpow" >> "$LOG"
  if [ "$used" -gt "$peak_used" ]; then peak_used=$used; peak_used_at=$now; fi
  if [ "$swap_used" -gt "$peak_swap" ]; then peak_swap=$swap_used; fi
  samples=$((samples + 1))
  sleep "$INTERVAL" &
  wait $! || true
done
