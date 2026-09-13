#!/usr/bin/env bash
# Re-fetch every reference in docs/references/ (CHORE_002). Text only; no weights. Needs curl, python3 and the
# ComfyUI image built by spark/comfyui/install.sh (for the node sources and the GPL LICENSE that goes with them).
set -euo pipefail
cd "$(dirname "$0")"
IMAGE="${COMFYUI_IMAGE:-minimax-spark/comfyui:v0.35.1}"
UA="Mozilla/5.0 (minimax docs/references fetch.sh)"

get() { # get <url> <out> [Accept]
  local code
  code=$(curl -sSL -A "$UA" ${3:+-H "Accept: $3"} -o "$2" -w '%{http_code}' "$1")
  if [ "$code" != "200" ]; then echo "  !! $code $1" >&2; rm -f "$2"; return 1; fi
  printf '  %7d %s\n' "$(wc -c < "$2")" "$2"
}
md() { get "$1" "$2" "text/markdown"; }

mkdir -p raw api-reference comfy-docs prompt-guides model-config community blog comfyui/templates comfyui/examples

echo "# MiniMax (Hugging Face + GitHub)"
HF=https://huggingface.co/MiniMaxAI/MiniMax-H3/raw/main
GH=https://raw.githubusercontent.com/MiniMax-AI/MiniMax-H3/main
get "$HF/LICENSE"                                   raw/LICENSE_MiniMax-H3.txt
get "$HF/README.md"                                 raw/model-card_MiniMaxAI_MiniMax-H3.md
get "https://huggingface.co/Comfy-Org/MiniMax-H3/raw/main/README.md" raw/model-card_Comfy-Org_MiniMax-H3.md
get "$GH/README.md"                                 raw/github_MiniMax-AI_MiniMax-H3_README.md
get "$GH/.claude/skills/h3-prompt-writing/SKILL.md"            prompt-guides/h3-prompt-writing_SKILL.md
get "$GH/.claude/skills/h3-prompt-writing/references/base-en.txt" prompt-guides/VIDEO_PROMPT_WRITING_GUIDE_base_en.txt
get "$GH/.claude/skills/h3-prompt-writing/references/ref-en.txt"  prompt-guides/VIDEO_PROMPT_WRITING_GUIDE_ref_en.txt
for f in FL2VA/model_index.json FL2VA/transformer/config.json FL2VA/text_encoder/config.json FL2VA/video_vae/config.json \
         FL2VA/audio_vae/config.json FL2VA/audio_vae/metadata.json Ref2VA/model_index.json Ref2VA/transformer/config.json; do
  get "$HF/$f" "model-config/${f//\//_}"
done

echo "# MiniMax platform docs (Mintlify: every page has a .md twin)"
MM=https://platform.minimax.io/docs
get "$MM/llms.txt" raw/minimax-api_llms.txt
for p in guides/video-generation guides/local-deploy-h3 guides/local-deploy guides/video-prompt release-notes/models \
         api-reference/video-generation-v2-create api-reference/video-generation-v2-query api-reference/video-generation-v2-list \
         api-reference/video-generation-v2-delete api-reference/video-generation-v2-h3-context-ir api-reference/video-generation-v2-regeneration; do
  md "$MM/$p.md" "api-reference/minimax-api_$(basename "$p").md"
done

echo "# ComfyUI docs"
CD=https://docs.comfy.org
get "$CD/llms.txt" raw/comfy-docs_llms.txt
for p in minimax-h3 minimax-h3-native minimax-h3-multiframe minimax-h3-fun-controlnet minimax-h3-prompt-guide; do
  md "$CD/tutorials/video/minimax/$p.md" "comfy-docs/$p.md"
done

echo "# Comfy-Org workflow templates (the official local H3 workflows) and the PRs that added the nodes"
WT=https://raw.githubusercontent.com/Comfy-Org/workflow_templates/main
for t in video_minimax_h3_t2v video_minimax_h3_i2v video_minimax_h3_i2v_continuation video_minimax_h3_r2v \
         video_minimax_h3_multiframe_reference video_minimax_h3_fun_controlnet_union; do
  get "$WT/templates/$t.json" "comfyui/templates/$t.json"
done
get "$WT/blueprints/image_to_video_minimax_h3.json" comfyui/templates/image_to_video_minimax_h3.json
for n in 15224 15439 15375; do
  curl -sS -A "$UA" -o "comfyui/PR-$n.json" "https://api.github.com/repos/Comfy-Org/ComfyUI/pulls/$n"
  python3 - "$n" <<'PY'
import json, sys
n = sys.argv[1]
with open("comfyui/PR-" + n + ".json") as f:
    p = json.load(f)
title = p.get("title") or ""
body = p.get("body") or ""
merged = p.get("merged_at") or ""
with open("comfyui/PR-" + n + ".md", "w") as f:
    f.write("# ComfyUI PR #" + n + " \u2014 " + title + "\n\nhttps://github.com/Comfy-Org/ComfyUI/pull/" + n + " \u00b7 merged " + merged + "\n\n" + body + "\n")
print("  PR #" + n + ": " + title)
PY
  rm -f "comfyui/PR-$n.json"
done
get https://github.com/user-attachments/files/30957076/droz_MiniMaxH3_BasicMaskedExtension_v1.4.json comfyui/examples/PR15375_droz_MiniMaxH3_BasicMaskedExtension_v1.4.json
get https://github.com/user-attachments/files/31106912/droz_MiniMaxH3_PerRowMasking_Example_v2.json  comfyui/examples/PR15375_droz_MiniMaxH3_PerRowMasking_Example_v2.json
get https://github.com/user-attachments/files/30954773/video_minimax_h3_r2v_addguides_v1.json        comfyui/examples/PR15439_video_minimax_h3_r2v_addguides_v1.json

echo "# ComfyUI sources from the image ($IMAGE) — the implementation that actually runs on the Spark"
c=$(docker create "$IMAGE")
mkdir -p comfyui/comfy_extras comfyui/comfy/ldm/minimax comfyui/comfy/text_encoders
docker cp "$c:/comfy/ComfyUI/comfy_extras/nodes_minimax_h3.py" comfyui/comfy_extras/
docker cp "$c:/comfy/ComfyUI/comfy/ldm/minimax/." comfyui/comfy/ldm/minimax/
docker cp "$c:/comfy/ComfyUI/comfy/text_encoders/minimax.py" comfyui/comfy/text_encoders/
docker cp "$c:/comfy/ComfyUI/LICENSE" comfyui/LICENSE
docker rm "$c" > /dev/null
echo "  copied nodes_minimax_h3.py, comfy/ldm/minimax/*, text_encoders/minimax.py, LICENSE"

echo "# Community and framework docs"
get https://raw.githubusercontent.com/joeynyc/MiniMax-H3-DGX-Spark/main/README.md community/joeynyc_MiniMax-H3-DGX-Spark_README.md
md  https://lmsysorg.mintlify.app/cookbook/diffusion/MiniMax/MiniMax-H3.md         community/sglang_cookbook_MiniMax-H3.md

echo "# The announcement post (HTML kept; text extracted beside it)"
get https://www.minimax.io/blog/minimax-h3 blog/minimax-h3-blog.html
python3 - <<'PY'
import re
from html.parser import HTMLParser
class P(HTMLParser):
    def __init__(self): super().__init__(); self.out = []; self.skip = 0
    def handle_starttag(self, t, a):
        if t in ("script", "style", "noscript", "svg"): self.skip += 1
        if t in ("p", "h1", "h2", "h3", "h4", "li", "br", "tr", "div"): self.out.append("\n")
        if t in ("h1", "h2", "h3", "h4"): self.out.append("#" * int(t[1]) + " ")
    def handle_endtag(self, t):
        if t in ("script", "style", "noscript", "svg"): self.skip -= 1
    def handle_data(self, d):
        if self.skip == 0: self.out.append(d)
p = P(); p.feed(open("blog/minimax-h3-blog.html", encoding="utf8", errors="ignore").read())
text = re.sub(r"\n\s*\n+", "\n\n", "".join(p.out)).strip()
open("blog/minimax-h3-blog.md", "w").write("<!-- Text extracted from https://www.minimax.io/blog/minimax-h3 by docs/references/fetch.sh; the original HTML is beside this file. -->\n\n" + text)
print(f"  {len(text)} chars of text")
PY
echo "done: $(date -u +%Y-%m-%d) — update the date in README.md"
