#!/usr/bin/env bash
# spark/comfyui/memwatch.sh — sample used unified memory every N seconds from /proc/meminfo; print the peak on exit.
#
# nvidia-smi reports no memory column on the Spark, so "used" here is MemTotal - MemAvailable, which is what both the
# GPU and the CPU side draw from. Swap is sampled too: swap growing during a run means the model did not fit.
# Runs on the host (the container's /proc/meminfo would show the same numbers, but the host needs no image for this).
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
  line="# peak used $(gib "$peak_used") GiB at $peak_used_at; peak swap used $(gib "$peak_swap") GiB; $samples samples every ${INTERVAL}s"
  printf '%s\n' "$line" >> "$LOG"
  printf '%s\n' "$line" >&2
}
trap 'exit 0' INT TERM  # the EXIT trap reports once
trap 'report' EXIT

printf '# timestamp\tused_kib\tavailable_kib\tswap_used_kib\ttotal_kib\n' >> "$LOG"
while true; do
  read -r total avail swap_used < <(awk '
    /^MemTotal:/ {t=$2} /^MemAvailable:/ {a=$2} /^SwapTotal:/ {st=$2} /^SwapFree:/ {sf=$2}
    END {print t, a, st-sf}' /proc/meminfo)
  used=$((total - avail))
  now="$(date +%Y-%m-%dT%H:%M:%S)"
  printf '%s\t%d\t%d\t%d\t%d\n' "$now" "$used" "$avail" "$swap_used" "$total" >> "$LOG"
  if [ "$used" -gt "$peak_used" ]; then peak_used=$used; peak_used_at=$now; fi
  if [ "$swap_used" -gt "$peak_swap" ]; then peak_swap=$swap_used; fi
  samples=$((samples + 1))
  sleep "$INTERVAL" &
  wait $! || true
done
