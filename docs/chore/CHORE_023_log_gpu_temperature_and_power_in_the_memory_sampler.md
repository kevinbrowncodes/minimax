# CHORE_023 — Log GPU temperature and power in the memory sampler

**Status:** Done (approved 2026-10-13 by the multiple-choice tool; committed the same session)
**Created:** 2026-10-13

## Summary

`spark/comfyui/memwatch.sh` gains two columns, `gpu_temp_c` and `gpu_power_w`, sampled from `nvidia-smi` alongside the memory figures, and its closing line reports their peaks next to the memory peak.

## Why

- On 2026-10-13 at about 16:34 EDT the Spark lost power three and a half minutes into a take, during model initialization. The logs ruled out a clean shutdown, a power-button press, a kernel panic, an out-of-memory kill and a thermal warning, and the sampler showed 28 GiB still available. What could not be ruled in or out was a firmware over-temperature cut, because nothing we run records the GPU's temperature or power draw.
- The sampler already runs beside every segment of every round (`draw.sh`, `ext-standalone.sh`), so two more columns there cost nothing and give the next incident a temperature and power trace up to the last five seconds.

## Changes

- [x] `spark/comfyui/memwatch.sh` — two columns from `nvidia-smi --query-gpu=temperature.gpu,power.draw`, `-` when it answers nothing; the report line keeps `peak used N GiB` unchanged (the runners parse it) and appends `peak GPU temp N C; peak GPU power N W`.

## Testing

- **Unit / integration / e2e:** not applicable — a host-side shell sampler outside the app and the TypeScript gate; nothing in the test suites calls it. Verified by hand: `bash -n` passes, a 7-second run writes the seven columns and the peaks line, and the existing `peak used` regex in the runners still matches.
