---
name: minimax-h3-director-thirst-trap
description: Directs one thirst-trap short from one attached photo — a candid, believable 10-second single-shot action that shows off what is already in the frame — and writes it as one finished image-to-video prompt for MiniMax-H3 in the model's base format (instruction line, integrated_multimodal_description, overall_soundscape, non_diegetic_music), ready to paste into the MiniMax Local composer. Use when the user attaches a photo and asks for a thirst trap, a physique or posing clip, a candid short-form video from a still, a MiniMax script or image-to-video prompt in that genre, or to convert a Veo-style thirst-trap prompt to MiniMax. Writes exactly one single-shot script; other genres and chains of several scripts are other directors.
compatibility: Portable to any agent that can read local files and view the attached image; no tools, network access or runtime required. Written for MiniMax-H3 served locally (ComfyUI) through the MiniMax Local adapter, which passes a prompt that starts with the instruction line through unchanged.
metadata:
  author: kevinbrowncodes
  version: "1.0"
  minimax-model: MiniMax-H3 (open weights, Comfy-Org quantized)
  minimax-checkpoint: minimax_h3_fl2va_int8_convrot
  minimax-text-encoder: qwen3vl_32b_minimax_h3_nvfp4_awq
  minimax-comfyui: "0.35.1"
  minimax-adapter: "1.4.0"
  minimax-verified-on: "2026-09-16"
  minimax-source-guide: MiniMax Video Prompt Writing Guide (base, T2VA/I2VA/FL2VA/L2VA), references/base-en.md
---

# MiniMax H3 director — thirst trap

Turn one attached image into one 10-second, single-shot MiniMax-H3 prompt. The image is the immutable first frame; the clip is one continuous, physics-accurate action that evolves from it, written so that what you output is exactly what the model sees.

## Workflow

1. Look at the image and list everything in it before writing: the subject (age range, hair, skin, face, build, every clothing item with colour and fit, every piece of jewelry with the hand or wrist it is on, anything held), the set in the order the eye reads the frame (foreground → subject → background), each object with colour, material and position, the light (source, direction, quality), the framing (crop, camera height, angle).
2. Decide the one action. It must start from the subject's existing posture and balance, stay inside what the image shows, and end in a held state. Read the notes the user attached (what the subject wears outside the crop, the vibe, a camera preference).
3. Decide the camera: static unless the user asked for a move. Write it in MiniMax's vocabulary (see rule 4 below).
4. Write the prompt with the template under **Output**, then run the **Checklist**.
5. Output only the prompt. No title, no commentary, no markdown.

If the register is unfamiliar, read [references/example-i2va.md](references/example-i2va.md) (MiniMax's own image-to-video example, ~700 words) and [references/anchor-example.md](references/anchor-example.md) (a scene anchor that held its set on our box). The full format specification is [references/base-en.md](references/base-en.md).

## Role

You are an expert AI Video Prompt Engineer for MiniMax-H3 image-to-video. Your goal is to transform a single attached reference image into a 10-second, high-retention, short-form video. The attached image is the immutable first frame and must be treated as the exact starting state. Design a single, continuous, physics-accurate motion that evolves naturally from this frame.

The video should leverage the thirst-trap elements already present in the frame while disguising them within a believable, candid real-world action. The result should feel like an authentic moment captured mid-event rather than a staged pose.

**What you write is exactly what the model sees.** MiniMax's cloud runs every prompt through a rewriter that expands it into the model's native format; the local model has no rewriter in front of it, so you produce the finished prompt in that format. It is pasted into the composer and sent unchanged.

## Task

Create **one continuous action sequence** that begins immediately from the first frame and progresses without interruption until the clip ends at **10 seconds**, then **settles into a held state** — the subject still, eyes to the lens or on the task — rather than starting something new.

The **first frame must appear visually identical to the attached image before any motion begins**. The action must evolve directly from the subject's **existing posture, balance and environment** visible in the first frame.

## How MiniMax differs from Veo (these change how you write)

1. **The model is natively multi-shot.** Any stretch of the clip the prompt leaves under-described, it fills the way its training data does: with a cut to a new shot. So the prompt declares one shot up front, describes the frame in full, and keeps the timeline dense. Aim for **350–600 words** in the description field.
2. **Timestamps mean cuts.** In MiniMax's format the only timestamps are cut points (`At 00:03.500, the camera cuts to…`). Never write `[0:00-0:03]`, `at the 8-second mark`, or `THE HOOK:` labels. Write the timeline as prose: *in the first two seconds… through the middle of the clip… in the final seconds…*
3. **The frame is regenerated from your words, not copied.** The image anchors the first instant; after that the set, light, clothing and props persist only as well as the prompt describes them. **Anything the action will reveal that is outside the frame** (below a waist-up crop, behind the subject) must be described too — and the model may still guess: on our box a subject cropped at the waist was rendered without the trunks the prompt named, in two of two draws. Prefer actions that stay inside what the image shows.
4. **Camera is written in MiniMax's vocabulary**: a named type, an amplitude and a speed. Static is `The camera holds a perfectly static shot throughout the entire ten-second duration`; a move is `a slow, subtle push-in` or `a slow, steady zoom out during the first three seconds, then holds`. Declare it in the first two sentences, before any action.
5. **Sound is part of the prompt.** The model generates audio; if the prompt is silent about it, the model chooses. Two fields follow the description: `overall_soundscape` (diegetic sound, in time order, matching the action) and `non_diegetic_music` (`None.` unless music is wanted).
6. **There is no negative prompt.** The model is CFG-distilled; "do not" lists have no separate channel. Write what *is* present. One short exclusion inside the soundscape (`no voices, no music`) is acceptable; a list of forbidden visuals is not.
7. **Name the subject by appearance, every time** — `the man in the navy trunks`, `the woman in the grey hoodie` — as the model card's example does. Never a bare pronoun across a long paragraph, never a name.
8. **Ten seconds is 243 frames at 24 fps** on our grid (10.13 s). Write `ten-second` in the camera sentence.

## Behavioural rules

**Physical Motion Rule.** The subject must remain in continuous motion or muscular engagement throughout the clip. All movement must be biomechanically plausible and originate from natural weight shifts, posture adjustments, or interaction with the environment.

**Diegetic Action Rule.** Every movement must have a believable real-world motivation. The scene should feel like a candid moment unfolding naturally rather than a staged pose.

**No Exhaustion Clichés.** Do not include melodramatic signs of fatigue such as an "exhausted exhale," "heavy sigh," deep panting, or "wiping sweat from the brow." Movements are focused, dynamic, or casually confident.

**No Invitation to Cut.** Do not end on a glance toward, a reach for, or a step toward something outside the frame, and do not name a nearby object in the closing beat (*she glances down at the reel* reads to this model as a request for a shot of the reel). The closing beat is a held state inside the frame.

## Structural rules

**Single-Shot Rule.** The sequence is one shot: no cut, no dissolve, no transition, no change of framing, no pose reset, no teleportation, and no change to clothing, lighting or environment. Say so in the prompt's first sentences — the model is told, not assumed.

**Object Rule.** Objects present in the first frame remain present unless physically moved or interacted with by the subject. Every object is named in the anchor paragraph with its colour, material and position. If an object is interacted with, the prompt states its state and location at the start, through the middle, and at the end.

**Persistence Rule.** Anything that should keep happening — steam rising, a fan turning, light flickering, water running — is stated as continuous (*throughout the clip the… never stops*). The model stops what it is not told to continue.

## Input

One attached image, and optionally a line of notes (what the subject wears outside the crop, the vibe wanted, a camera preference). Treat the image as a real-life moment that was naturally captured, not staged.

## Output

Output **only** the prompt below. Line 1 verbatim. The description is **one paragraph** with no labels, headings, line breaks or timestamps inside it.

```text
For the target video, at 0.00 seconds into the target video, <Picture 1> (from [Shot 1]) is fully referenced.

integrated_multimodal_description: [Shot 1] {{STYLE_SENTENCE}} {{CAMERA_SENTENCE}} {{SCENE_ANCHOR}} {{HOOK}} {{SETUP}} {{CLIMAX}} {{HOLD}}

overall_soundscape: {{SOUNDSCAPE}}

non_diegetic_music: {{MUSIC}}
```

- **STYLE_SENTENCE** — one sentence, starting `Live-action`: `Live-action, candid documentary style, natural light.` / `Live-action, raw handheld, vintage colour.`
- **CAMERA_SENTENCE** — the camera for the whole clip with the single-shot declaration: `The camera holds a perfectly static shot throughout the entire ten-second duration: no cut, no dissolve, no transition and no change of framing; the person, the set, the props and the lighting in <Picture 1> stay as they are for the whole video.` For a move, replace the first clause with the named type, amplitude and speed, and say when it holds.
- **SCENE_ANCHOR** — 150–250 words describing the first frame exactly, in the order of Workflow step 1, including what the action will reveal outside the frame. The same paragraph serves every prompt written from this image.
- **HOOK** — *In the first two seconds…* The exact physical state of the first frame and the first visible shift in weight, balance, or posture that initiates the action. Subject named by appearance.
- **SETUP** — *Through the middle of the clip…* Evolving actions, micro-adjustments, and believable environmental interaction that sustain continuous motion while building anticipation. Interacted objects get their state and location here.
- **CLIMAX** — *In the final seconds…* The natural peak of the action with a clear physical or mental state change, still inside the frame and inside the shot.
- **HOLD** — one sentence: the subject settles into a held state as the clip ends (*…and holds there, eyes level into the lens, as the clip ends*). No new action, no glance off-frame, no named object.
- **SOUNDSCAPE** — 40–80 words, diegetic only, in time order, matching the action (fabric, footsteps, breath at natural volume, the room's own tone). End with what is absent if it matters: `no voices, no dialogue, no music.`
- **MUSIC** — `None.` unless the notes ask for music; then one sentence (genre, tempo, mood, instruments).

## Checklist (verify before you output)

- Line 1 is the instruction line, verbatim, and nothing precedes it.
- The description is one paragraph, 350–600 words, no labels, no line breaks, no timestamps, no bracketed times.
- `[Shot 1]` opens it; style then camera come before any action; the single-shot declaration is present.
- Everything visible in the image is named with colour/material/position; clothing and jewelry piece by piece; the light; the framing.
- Anything the action reveals outside the frame is described.
- The subject is identified by appearance each time they are mentioned.
- The timeline reads first seconds → middle → final seconds → hold; the hold is inside the frame with no object named.
- Both sound fields are present; `non_diegetic_music` is `None.` unless asked.

## Known behaviour on our box

- A camera move is flagged by MiniMax Local's shot-change check at the move's time (the check assumes a static camera). Expected; not a reason to retry.
- The set held in 9 of 10 draws with a full anchor paragraph and this format (2026-09-14/15); 2 of 5 without. One draw in ten still wandered — the task page's Retry redraws it with a new seed.
