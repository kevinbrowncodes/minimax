# CHORE_013 — The anchor carries nothing that changes

**Status:** Approved (2026-09-25 08:55 EDT, by the tool — "Approve — write the chore and patch the skill")
**Skill:** `agents/skills/minimax-h3-director-thirst-trap-chain/SKILL.md`
**Created:** 2026-09-25

## Summary

The chain director's rule 2 tells the scene anchor to describe "the person by appearance (build, hair, face, **every clothing item** and piece of jewelry with colour and where it sits)". The anchor is then pasted **word for word into every segment**. When a garment comes off partway through the video, every later segment carries a sentence saying the subject is still wearing it, and that sentence outweighs the one beat that takes it off.

The rule's own reasoning already contains the fix — *"an anchor that describes the first pose fights every later one"* — but it applies that logic only to **pose**. It is equally true of **state**: clothing, a prop that gets moved, a door that gets opened.

## Why

The towel chain (`test/26-09-24-1400_towel/`, 2026-09-25). The anchor said:

> "He wears one sage-green bath towel wrapped round his hips and tucked into itself at his left hip, its folded edge low across his waist and its hem at mid-thigh…"

That went into all six segments. Segment 2's single sentence told the towel to drop. ~250 words of anchor, repeated five more times, against one sentence of beat.

The model split the difference exactly as the arithmetic predicts: the towel opened at the front so the penis was visible, but stayed hanging on him through the quarter turn and the back arch — covering the buttocks that segments 4 and 5 exist to show. The owner reported it against take `20260919`; three finished minutes and 18 drawn segments carry the defect.

A second miss in the same prompts, from the same root cause of leaving something implied: the owner asked for "his big cock" and **no size word appears anywhere in any of the six prompts**. HMPenis's own author (SPIKE_001 § Findings 4b) says to use the word "Large" explicitly. An unstated attribute is a defaulted attribute.

**Not fixed by deleting the anchor.** The skill's own measurement: the set held in **9 of 10** draws with a full anchor paragraph and **2 of 5** without it. A thin anchor is how the room and the person drift across the joins. The anchor stays; what may go in it narrows.

## Changes

- [x] Rule 2 heading and body: "no pose in it" becomes "no pose and no changing state in it"; clothing moves out of the anchor's list and into the beats, with the reason stated the way it already is for pose
- [x] A new sub-point: once a state changes, every later segment **opens by asserting the new state as fact** ("The towel is gone from his body: it lies in a crumpled heap on the tile, well clear of his feet, and nothing covers him at any point") — an inference carried forward from an earlier segment does not survive the anchor's repetition
- [x] A line on where a dropped object **lands**: name the floor and the clearance ("on the tile, well clear of his feet"), never "over his feet", which reads as still touching him
- [x] The Checklist gains: *nothing in the anchor changes during the video*
- [x] The single-clip rules gain: an attribute the user asked for must appear **as a word in the prompt** — an unstated attribute is a defaulted one

## Testing

- **Unit / integration / e2e — none.** The skill is a prompt-authoring document; it contains no runtime code and nothing in the app, the adapter or the graph builder changes. Said explicitly, as CLAUDE.md §3d requires.
- **Manual verification (the Spark, in the Done note with the date and the seed):** the corrected prompts drawn on seed `20260919` — the same seed as the take the owner reported — against the v1 minute on that seed, both on the feedback page. The check is whether the towel leaves his body in segment 2 and stays off through segments 4 and 5, and whether the stated size reads. Segments drawn 2026-09-25 from 08:35 on C7 (Eros Max TURBO int8, 8 steps, + HMPenis v1.0 @0.5 — strength deliberately unchanged, so the wording is the only variable).
