#!/usr/bin/env python3
# SPIKE_001's night: build one ComfyUI API graph for the NSFW container from the SFW template (spark/comfyui/h3_t2v_prompt.json)
# plus a LoRA chain, and POST it straight to ComfyUI (the adapter's second upstream is STORY_064, not tonight). Prints the prompt_id.
#   graph.py --label C1-P1 --prompt-file prompts/P1.txt --image <uploaded name> --width 768 --height 1024 --seconds 5 --seed N
#            [--steps 20] [--sampler res_multistep] [--scheduler simple] [--unet <file>] [--lora file:strength ...] [--url http://127.0.0.1:8189]
import argparse, json, sys, urllib.request, os
p = argparse.ArgumentParser()
p.add_argument("--label", required=True); p.add_argument("--prompt-file", required=True); p.add_argument("--image", required=True)
p.add_argument("--width", type=int, required=True); p.add_argument("--height", type=int, required=True); p.add_argument("--seconds", type=int, default=5)
p.add_argument("--seed", type=int, required=True); p.add_argument("--steps", type=int, default=20)
p.add_argument("--sampler", default="res_multistep"); p.add_argument("--scheduler", default="simple")
p.add_argument("--unet", default=None); p.add_argument("--lora", action="append", default=[])
p.add_argument("--url", default="http://127.0.0.1:8189"); p.add_argument("--dump", default=None); p.add_argument("--no-post", action="store_true")
a = p.parse_args()

here = os.path.dirname(os.path.abspath(__file__))
g = json.load(open(os.path.join(here, "../../spark/comfyui/h3_t2v_prompt.json")))
g.pop("_comment", None)
n = a.seconds * 24
length = max(n, 5); length = length + (((5 - length % 17) % 17) + 17) % 17   # the model's 17k+5 grid (h3.sh)
prompt = open(a.prompt_file, encoding="utf-8").read().strip()
if a.unet: g["unet"]["inputs"]["unet_name"] = a.unet
g["cond"]["inputs"].update({"prompt": prompt, "width": a.width, "height": a.height, "length": length})
g["noise"]["inputs"]["noise_seed"] = a.seed
g["sampler"]["inputs"]["sampler_name"] = a.sampler
g["sigmas"]["inputs"].update({"scheduler": a.scheduler, "steps": a.steps})
g["video"]["inputs"]["fps"] = 24
prefix = f"video/nsfw-{a.label}-{a.seed}"
g["save"]["inputs"]["filename_prefix"] = prefix
# the first frame (the owner's photo, uploaded once to the container's input/)
g["first_frame"] = {"class_type": "LoadImage", "inputs": {"image": a.image}}
g["cond"]["inputs"]["first_frame"] = ["first_frame", 0]
# the poster and the shot-change measure, as the adapter's buildGraph adds them
g["poster_frame"] = {"class_type": "ImageFromBatch", "inputs": {"image": ["decode_video", 0], "batch_index": 0, "length": 1}}
g["poster"] = {"class_type": "SaveImage", "inputs": {"images": ["poster_frame", 0], "filename_prefix": prefix + "_poster"}}
g["changes"] = {"class_type": "MiniMaxLocalFrameChanges", "inputs": {"images": ["decode_video", 0]}}
# the LoRA chain: every node that took the checkpoint takes the chain's last node instead
prev = "unet"
for i, spec in enumerate(a.lora, 1):
    name, _, strength = spec.rpartition(":")
    g[f"lora_{i}"] = {"class_type": "LoraLoaderModelOnly", "inputs": {"model": [prev, 0], "lora_name": name, "strength_model": float(strength)}}
    prev = f"lora_{i}"
if prev != "unet":
    for k, node in g.items():
        if k.startswith("lora_"): continue
        for key, val in node["inputs"].items():
            if isinstance(val, list) and len(val) == 2 and val[0] == "unet": node["inputs"][key] = [prev, 0]
if a.dump: json.dump(g, open(a.dump, "w"), indent=1)
if a.no_post: print("dry-run"); sys.exit(0)
req = urllib.request.Request(a.url + "/prompt", data=json.dumps({"prompt": g, "client_id": "spike001"}).encode(), headers={"content-type": "application/json"}, method="POST")
try:
    r = json.load(urllib.request.urlopen(req, timeout=60))
except urllib.error.HTTPError as e:
    print(e.read().decode()[:2000], file=sys.stderr); sys.exit(1)
if r.get("node_errors"): print(json.dumps(r)[:2000], file=sys.stderr); sys.exit(1)
print(r["prompt_id"])
