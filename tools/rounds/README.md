# Round tooling

The scripts each round folder under `test/` runs on the Spark, kept here once (CHORE_039) instead of copied from round to round.

- `template/` — the runner (chain.sh with the join check, draw.sh, ext-standalone.sh, extend.py, graph.py, upload.sh, rotate.sh, cancel.sh), the page helpers (addcard.py, addouttake.py), strip.py, size.txt, and the two blind rating pages. `__ROUND__`, `__TITLE__`, `__COLLF__`/`__COLLB__`, `__SUB__`, `__INTRO__` are filled per round.
- `new-round.sh test/<round> <name> "<Title>"` — sets up a round folder from the template; never overwrites existing files.

How a round is run and watched is the `script-supervisor` skill (`.claude/skills/script-supervisor/`). Round folders, videos and models stay untracked.

Switches a running round reads: `touch STOP` ends after the take in progress; `s2-aligned.flag` (with `keyframes/scene-2.png`) adds scene 2 and alternates; `s2-only.flag` draws scene 2 only. `AUDIO_FREE_SECONDS` (default 0.3, BUG_014) is passed by extend.py to every extension.

`retry.sh <K|B> <seed> <2|3> "<why>"` (CHORE_063) — redraw a failed shot 2 or 3 on a new seed, up to twice, instead of scrapping the take; rotate.sh resumes it first.

`patch-blend.sh <upscaled> <original> <out> <x> "<t:y ...>" [w] [h]` (CHORE_061) — keeps an upscaled take but shows the original through a small moving, feathered patch (the upscaler draws the hole as a stitched slit; the original draws it naturally). Read the hole's path off 0.25–0.5 s grid frames first.
