#!/usr/bin/env bash
# SPIKE_001's night: put the owner's photo into the NSFW container's input/ once (ComfyUI's /upload/image) and record the name
# LoadImage will use. Run after run.sh --nsfw; idempotent (overwrite).
set -euo pipefail
cd "$(dirname "$0")"
PHOTO="keyframes/scene-1.png"
[ -f "$PHOTO" ] || { echo "no photo at $PHOTO" >&2; exit 1; }
name=$(curl -fsS -F "image=@$PHOTO" -F overwrite=true -F subfolder=__ROUND__ http://127.0.0.1:8189/upload/image | python3 -c "import json,sys; d=json.load(sys.stdin); print((d.get('subfolder','')+'/' if d.get('subfolder') else '')+d['name'])")
echo "$name" > image.txt
echo "uploaded as $name"
