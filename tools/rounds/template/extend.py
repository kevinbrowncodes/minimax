#!/usr/bin/env python3
# SPIKE_001's night: one +10 s extension on the NSFW container, built by THE ADAPTER'S OWN buildGraph (spark/adapter/src/mapping.ts,
# run inside the minimax-adapter container — the shipped artefact, not a hand copy), then the LoRA chain rewired in, then POSTed
# straight to ComfyUI on 8189. STORY_017's masked continuation (overlap 39) with STORY_061's end anchor on.
#   extend.py --label CH2 --source video/nsfw-CH1-<seed>_00001_.mp4 --frames 243 --prompt-file prompts/CH2.txt --seed N
#             [--lora file:strength ...] [--unet file] [--steps 20] [--sampler res_multistep] [--scheduler simple] [--seconds 10] [--url …]
import argparse, json, subprocess, sys, os, urllib.request
p = argparse.ArgumentParser()
p.add_argument("--label", required=True); p.add_argument("--source", required=True); p.add_argument("--frames", type=int, required=True)
p.add_argument("--prompt-file", required=True); p.add_argument("--seed", type=int, required=True); p.add_argument("--seconds", type=int, default=10)
p.add_argument("--overlap", type=int, default=90); p.add_argument("--no-anchor", action="store_true")
p.add_argument("--lora", action="append", default=[]); p.add_argument("--unet", default=None)
p.add_argument("--steps", type=int, default=20); p.add_argument("--sampler", default="res_multistep"); p.add_argument("--scheduler", default="simple")
p.add_argument("--standalone", action="store_true"); p.add_argument("--url", default="http://127.0.0.1:8189"); p.add_argument("--dump", default=None); p.add_argument("--no-post", action="store_true")
a = p.parse_args()
here = os.path.dirname(os.path.abspath(__file__))
template = json.load(open(os.path.join(here, "../../spark/comfyui/h3_t2v_prompt.json")))
prompt = open(a.prompt_file, encoding="utf-8").read().strip()
prefix = f"video/nsfw-{a.label}-{a.seed}"
payload = {
    "template": template,
    "request": {"prompt": prompt, "ratio": "16:9", "resolution": "768P", "durationSeconds": a.seconds, "model": "minimax-h3", "continueFrom": "spike", "overlapFrames": a.overlap},
    "images": [],
    "options": {"seed": a.seed, "filenamePrefix": prefix,
                "continuation": {"file": a.source, "frames": a.frames, "overlapFrames": a.overlap, "prompt": prompt, "anchorEnd": not a.no_anchor, "audioFreeSeconds": float(os.environ.get("AUDIO_FREE_SECONDS", "0.3"))}},
}
js = '''const { buildGraph } = await import("/adapter/src/mapping.ts");
let s = ""; for await (const c of process.stdin) s += c;
const { template, request, images, options } = JSON.parse(s);
process.stdout.write(JSON.stringify(buildGraph(template, request, images, options)));'''
r = subprocess.run(["docker", "exec", "-i", "minimax-adapter", "node", "--input-type=module", "-e", js], input=json.dumps(payload).encode(), capture_output=True)
if r.returncode != 0: print("buildGraph failed:", r.stderr.decode()[:1500], file=sys.stderr); sys.exit(1)
g = json.loads(r.stdout.decode())
if a.unet: g["unet"]["inputs"]["unet_name"] = a.unet
g["sampler"]["inputs"]["sampler_name"] = a.sampler
g["sigmas"]["inputs"].update({"scheduler": a.scheduler, "steps": a.steps})
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
if a.standalone:
    # Each segment emits ONLY its own new frames (new_frames already drops the 39-frame overlap, new_audio the 1.625 s).
    # The join to one long file is what made peak memory climb with total length; the files concat losslessly instead.
    # EVERY consumer must be rewired before the joined nodes are dropped: the video, the shot-change check and the
    # poster all read joined_frames, and deleting it under them fails validation (2026-09-25: this cost a whole night).
    # STORY_067: joined_audio is now our join node (crossfade + level match), and new_audio is cut FROM it, so the audio
    # join node stays: only the frames are swapped, and the video's sound becomes new_audio (the matched new part).
    swap = {"joined_frames": "new_frames"}
    for k, node in g.items():
        if k in swap: continue
        for key, val in node["inputs"].items():
            if isinstance(val, list) and len(val) == 2 and val[0] in swap:
                node["inputs"][key] = [swap[val[0]], val[1]]
    for dead in swap:
        g.pop(dead, None)
    g["video"]["inputs"]["audio"] = ["new_audio", 0]
    # The blend itself happens in the last 0.30 s BEFORE the join, which in standalone mode is the previous file's sound.
    # Save that blended window so chain30.sh can put it in place of the previous file's last 0.30 s (sample-exact).
    S_s = round(a.frames / 24 * 1000) / 1000
    g["join_preroll"] = {"class_type": "TrimAudioDuration", "inputs": {"audio": ["joined_audio", 0], "start_index": round(S_s - 0.30, 3), "duration": 0.30}}
    g["join_preroll_save"] = {"class_type": "SaveAudio", "inputs": {"audio": ["join_preroll", 0], "filename_prefix": f"audio/nsfw-{a.label}-{a.seed}_preroll"}}
    # And this segment's own sound, lossless: the mp4's AAC track starts on an encoder edge, and splicing the lossless
    # preroll onto it clicked at the second join (~20.75 s, 2026-10-02). chain30.sh uses this flac instead of the mp4's.
    g["new_audio_save"] = {"class_type": "SaveAudio", "inputs": {"audio": ["new_audio", 0], "filename_prefix": f"audio/nsfw-{a.label}-{a.seed}_new"}}
    # nothing may still point at a node that is gone
    dangling = [(k, key, val[0]) for k, node in g.items() for key, val in node["inputs"].items()
                if isinstance(val, list) and len(val) == 2 and isinstance(val[0], str) and val[0] not in g]
    if dangling:
        print("dangling references after rewiring:", dangling, file=sys.stderr); sys.exit(1)
if a.dump: json.dump(g, open(a.dump, "w"), indent=1)
if a.no_post: print("dry-run", len(g), "nodes", g["cond"]["inputs"]["length"], "frames"); sys.exit(0)
req = urllib.request.Request(a.url + "/prompt", data=json.dumps({"prompt": g, "client_id": "spike001"}).encode(), headers={"content-type": "application/json"}, method="POST")
try:
    res = json.load(urllib.request.urlopen(req, timeout=60))
except urllib.error.HTTPError as e:
    print(e.read().decode()[:2000], file=sys.stderr); sys.exit(1)
if res.get("node_errors"): print(json.dumps(res)[:2000], file=sys.stderr); sys.exit(1)
print(res["prompt_id"])
