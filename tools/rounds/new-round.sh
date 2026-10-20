#!/usr/bin/env bash
# Set up a round folder from the shared template (script-supervisor skill, CHORE_039).
#   tools/rounds/new-round.sh test/<YY-MM-DD-HHMM-name> <name> "<Title>"
# Copies the runner scripts and the two rating pages into the round folder with the round name filled in. Existing
# files in the round folder are never overwritten.
set -eu
R="$1"; NAME="$2"; TITLE="$3"
T="$(cd "$(dirname "$0")" && pwd)/template"
[ -d "$R" ] || { echo "no round folder $R" >&2; exit 1; }
cd "$R"
mkdir -p keyframes prompts/scene-1 prompts/scene-2 scenes/scene-1 scenes/scene-2 frames/NG page-1 page-2
for f in chain.sh draw.sh ext-standalone.sh extend.py graph.py upload.sh strip.py addcard.py addouttake.py cancel.sh rotate.sh size.txt; do
  [ -e "$f" ] || sed "s/__ROUND__/$NAME/g" "$T/$f" > "$f"
done
chmod +x ./*.sh
c="$NAME"
[ -e page-1/index.html ] || sed "s/__TITLE__/$TITLE/g; s/__ROUND__/$NAME/g; s/__COLLF__/${c}f/; s/__SUB__/__SUB__/" "$T/page-front.html" > page-1/index.html
[ -e page-2/index.html ] || sed "s/__TITLE__/$TITLE/g; s/__ROUND__/$NAME/g; s/__COLLB__/${c}b/" "$T/page-back.html" > page-2/index.html
(cd prompts && for n in 1 2 3; do ln -sfn scene-1/prompt-$n.txt S$n.txt; ln -sfn scene-2/prompt-$n.txt S$n-b.txt; done)
echo "round $NAME ready in $R — fill __SUB__/__INTRO__ in page-1 and page-2 before publishing"
