# Round tooling

The scripts each round folder under `test/` runs on the Spark, kept here once (CHORE_039) instead of copied from round to round.

- `template/` — the runner (chain.sh with the join check, draw.sh, ext-standalone.sh, extend.py, graph.py, upload.sh, rotate.sh, cancel.sh), the page helpers (addcard.py, addouttake.py), strip.py, size.txt, and the two blind rating pages. `__ROUND__`, `__TITLE__`, `__COLLF__`/`__COLLB__`, `__SUB__`, `__INTRO__` are filled per round.
- `new-round.sh test/<round> <name> "<Title>"` — sets up a round folder from the template; never overwrites existing files.

How a round is run and watched is the `script-supervisor` skill (`.claude/skills/script-supervisor/`). Round folders, videos and models stay untracked.
