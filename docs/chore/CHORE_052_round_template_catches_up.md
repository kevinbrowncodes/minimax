# CHORE_052 — Round template catches up

**Status:** Done (owner's go, 2026-10-24)

## Summary

`tools/rounds/template/` picks up two fixes that were added by hand to the rock round and never made it back into the template:
- `extend.py` passes `audioFreeSeconds` (env `AUDIO_FREE_SECONDS`, default 0.3) to every extension. This is the BUG_014 switch on trial.
- `rotate.sh` honours `s2-only.flag`, so a round can draw scene 2 only.

The rounds README lists the switches a running round reads.

## Why

`new-round.sh` copied the template without either fix, so the hunk round needed both patched in by hand (2026-10-24). A round set up without them would run with the audio gap and couldn't run scene 2 alone.

## Changes

- [x] `tools/rounds/template/extend.py`: `audioFreeSeconds` in the continuation.
- [x] `tools/rounds/template/rotate.sh`: the `s2-only.flag` switch.
- [x] `tools/rounds/README.md`: the switches.

## Testing

- **Unit / integration / e2e:** not applicable. These are round scripts that run on the Spark outside the app; none of them is part of the TypeScript gate. Checked with `python3 -m py_compile` and `bash -n`. The rock and hunk rounds ran the same lines live (rock scene 2 drew 13 takes with `s2-only.flag` and the audio switch). The pre-push hook still runs the full gate.
