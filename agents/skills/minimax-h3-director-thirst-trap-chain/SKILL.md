---
name: minimax-h3-director-thirst-trap-chain
description: Directs a whole thirst-trap video from one attached photo as a chain of several ten-second segments — one continuous candid action across them, each segment a finished MiniMax-H3 prompt in the model's base format, the first written from the photo and each next one continuing the held state the previous segment ended in — ready for the MiniMax Local composer's Send all. Use when the user attaches a photo and asks for a longer thirst-trap video, a multi-segment or 20–60-second clip, "N segments" or "N scripts", or a chain for MiniMax; for a single ten-second clip use the thirst-trap director instead.
compatibility: Portable to any agent that can read local files and view the attached image; no tools, network access or runtime required. Written for MiniMax-H3 served locally (ComfyUI) through the MiniMax Local adapter, which sends a base-format segment unchanged and continues a clip from its last 1.6 seconds (a 39-frame overlap).
metadata:
  author: kevinbrowncodes
  version: "0.1"
  minimax-short-name: Chain director
  minimax-clip-seconds: "10"
  minimax-segments-default: "3"
  minimax-model: MiniMax-H3 (open weights, Comfy-Org quantized)
  minimax-checkpoint: minimax_h3_fl2va_int8_convrot
  minimax-text-encoder: qwen3vl_32b_minimax_h3_nvfp4_awq
  minimax-comfyui: "0.35.1"
  minimax-adapter: "1.5.0"
  minimax-verified-on: "draft — not yet generated on the model (STORY_053 verifies)"
  minimax-source-guide: MiniMax Video Prompt Writing Guide (base, T2VA/I2VA/FL2VA/L2VA), references/base-en.md
---

# MiniMax H3 director — thirst trap, chained

Turn one attached image into **one continuous action told in N ten-second segments**, each a finished MiniMax-H3 prompt, so that the segments generate one after another as one video: the first from the photo, each next one continuing from the frozen last moment of the one before. Everything the single-clip thirst-trap director says about the register, the physics, the camera, the sound and the format holds here; this file adds the chain's rules and the exact shape of each segment.

## How many segments

The user's notes say how many ("four segments", "6 scripts"). With no number, write **3**. Never fewer than 2 (that is the single-clip director's job), never more than 6.

## The chain's rules

1. **One story, N beats.** Decide the whole action first — a candid sequence that a real person could do in N × 10 seconds without leaving the frame — then cut it into N segments at natural pauses. Each segment is one continuous motion that **ends in a held state** (the subject still for a beat), because the next segment starts from exactly that frozen frame.
2. **One scene anchor, no pose in it, repeated in every segment.** Write the anchor once — the set, the light, the framing, the person by appearance (build, hair, face, every clothing item and piece of jewelry with colour and where it sits) — with **no posture, no gesture, no gaze** in it; the pose changes from segment to segment, and an anchor that describes the first pose fights every later one. Paste that same anchor, word for word, into every segment's description. It is what keeps the set and the person identical across the joins.
3. **Segment 1 is the single-clip director's prompt exactly**: line 1 the instruction line verbatim, `ten-second` in the camera sentence, the anchor, the first beat from the photo's own posture, a hold at the end.
4. **Segments 2 to N are extensions, and the model sees no picture for them.** Each one **starts at `integrated_multimodal_description:`** — no instruction line, no `<Picture 1>`, no "the attached image", no "from the photo" — and describes what is already in frame at its start as fact: the anchor, then the exact held state the previous segment ended in.
5. **An extension is twelve seconds, and its first one and a half seconds are already decided.** The model generates 294 frames (12.25 s) for a +10 s extension and the first 39 of them (1.6 s) are the previous segment's last frames. So the camera sentence of segments 2–N says `throughout the entire twelve-second duration`, and the first beat is: *the [subject by appearance] holds the [previous hold] for the first moment, then …* — the action resumes from the hold, without a reset, a cut, or a teleport.
6. **Continuity is written, not assumed.** Where the previous segment left a hand, a foot, the weight, the gaze, the chair, the object — the next segment names it in its first sentence after the camera. Objects moved in an earlier segment stay where they were left.
7. **The camera is declared again in every segment**, the same way each time: static unless the notes ask for a move.
8. **Every segment carries both sound fields.** The soundscape continues (the same room tone, the same absences).
9. **The last segment's hold is the video's ending**: still, eyes to the lens, nothing new starting.

## Output

Output **only** the N prompts, in order, separated by **one blank line**, with nothing before, between or after them — no numbering, no headings, no commentary, no markdown fences. Each description is one paragraph of **400–550 words** (the same length rule as the single-clip director: count it; expand the anchor and the beats before you output); every description opens with `[Shot 1]`, the style sentence and the camera sentence; segments 2–N open the action from the previous hold.

```text
For the target video, at 0.00 seconds into the target video, <Picture 1> (from [Shot 1]) is fully referenced.

integrated_multimodal_description: [Shot 1] {{STYLE_SENTENCE}} The camera holds a perfectly static shot throughout the entire ten-second duration: no cut, no dissolve, no transition and no change of framing; the person, the set, the props and the lighting in <Picture 1> stay as they are for the whole video. {{SCENE_ANCHOR}} {{HOOK}} {{SETUP}} {{CLIMAX}} {{HOLD}}

overall_soundscape: {{SOUNDSCAPE}}

non_diegetic_music: {{MUSIC}}

integrated_multimodal_description: [Shot 1] {{STYLE_SENTENCE}} The camera holds a perfectly static shot throughout the entire twelve-second duration: no cut, no dissolve, no transition and no change of framing; the person, the set, the props and the lighting already in frame at the start stay exactly as they are for the whole video. {{SCENE_ANCHOR}} {{FROM_THE_HOLD}} {{SETUP}} {{CLIMAX}} {{HOLD}}

overall_soundscape: {{SOUNDSCAPE}}

non_diegetic_music: {{MUSIC}}
```

- **FROM_THE_HOLD** — *For the first moment the [subject by appearance] holds [the previous segment's exact ending posture, hands, gaze], then …* — the first new movement grows out of that held state.
- Everything else — STYLE_SENTENCE, SCENE_ANCHOR (150–250 words, no pose), HOOK, SETUP, CLIMAX, HOLD, SOUNDSCAPE, MUSIC — as the single-clip director defines them below.

## Checklist (verify before you output)

- N segments, separated by one blank line, nothing else in the output.
- Segment 1 begins with the instruction line verbatim and says `ten-second`; segments 2–N begin with `integrated_multimodal_description:`, say `twelve-second`, and never mention a picture or an attached image.
- The same anchor, with no pose in it, appears in every segment.
- Each segment ends in a held state; each next segment's first beat names that held state and continues from it.
- Each description is one paragraph, 400–550 words, no labels, no line breaks, no timestamps; `[Shot 1]`, style and camera first; the subject named by appearance in every beat.
- Both sound fields on every segment.

---



# The single-clip director's rules (they apply to every segment)

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

## Length — the rule that is missed first

**The description field is 400–600 words. Not fewer.** A shorter description is the single most common miss: a first draft tends to land at 200–250 words with a thin scene anchor, and on our box a thin anchor is what lets the set drift. Before you output, count the words of the description. If it is under 400, do not output — expand, in this order: the **scene anchor** to its full 150–250 words (every object with colour, material and position; the light's source, direction and quality; the framing; every clothing item and every piece of jewelry, with the hand or wrist it is on; what the action will reveal outside the frame), then the three timeline beats with concrete, physical detail (which hand, which foot, what the weight does, what the fabric does, what the face does). Spend words on the set and the body, never on adjectives of mood. The model card's own example runs ≈ 700 words; 400–600 is the floor and ceiling here because the adapter's prompt limit is 6,000 characters.

## How MiniMax differs from Veo (these change how you write)

1. **The model is natively multi-shot.** Any stretch of the clip the prompt leaves under-described, it fills the way its training data does: with a cut to a new shot. So the prompt declares one shot up front, describes the frame in full, and keeps the timeline dense: **400–600 words** in the description field (see Length above).
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

Output **only** the prompt below. Line 1 verbatim. The description is **one paragraph** of 400–600 words with no labels, headings, line breaks or timestamps inside it; one blank line between the fields.

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
- The description is one paragraph, **400–600 words — counted**, no labels, no line breaks, no timestamps, no bracketed times.
- `[Shot 1]` opens it; style then camera come before any action; the single-shot declaration is present.
- Everything visible in the image is named with colour/material/position; clothing and jewelry piece by piece; the light; the framing.
- Anything the action reveals outside the frame is described.
- The subject is identified by appearance each time they are mentioned.
- The timeline reads first seconds → middle → final seconds → hold; the hold is inside the frame with no object named.
- Both sound fields are present; `non_diegetic_music` is `None.` unless asked.

## Known behaviour on our box

- A camera move is flagged by MiniMax Local's shot-change check at the move's time (the check assumes a static camera). Expected; not a reason to retry.
- The set held in 9 of 10 draws with a full anchor paragraph and this format (2026-09-14/15); 2 of 5 without. One draw in ten still wandered — the task page's Retry redraws it with a new seed.
