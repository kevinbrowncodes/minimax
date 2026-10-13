---
name: "minimax-h3-i2v-amg-scene"
description: "Writes finished MiniMax-H3 image-to-video (I2VA) prompts that continue a seed image as a Bob Mizer / Athletic Model Guild physique film played for a paying viewer: posing, props, bodyweight work on a locked camera, in H3's native format (alignment line, [Shot 1] integrated_multimodal_description, overall_soundscape, non_diegetic_music) with the action written as prose phases inside one shot. Use whenever a seed image is attached, the target is MiniMax H3 (local ComfyUI or cloud), and the goal is an AMG-style scene: 'AMG scene for MiniMax', 'physique film', 'posing routine', 'Mizer scene', 'H3 scene scripts'. Do NOT use for xAI Grok Imagine (use grok-imagine-v15-i2v-amg-scene), NVIDIA Cosmos (use cosmos-3-i2v-amg-scene), a single candid thirst-trap short (use minimax-h3-director-thirst-trap), or Google Veo (use google-video-image-to-video). Reads a COUNT value of 3 or more and writes COUNT sequential 10-second clips stitched into one continuous scene. Single clips are not supported."
compatibility: Written for MiniMax-H3 image-to-video served locally (ComfyUI, Comfy-Org quantized checkpoint) through the MiniMax Local adapter, which passes a prompt starting with the alignment line through unchanged. Also valid for the cloud I2VA endpoint.
---

# MiniMax H3 I2V: AMG Physique Film (Bob Mizer)

Build 2026-10-13-1140

> ## ⚠️ THIS RUN WRITES EXACTLY {{COUNT}} CLIP(S): READ FIRST
>
> Output **exactly {{COUNT}}** separate `<<<SCRIPT n>>>` blocks, one per clip, no more, no fewer. {{COUNT}} is always **3 or more**; single clips are not supported, so a value below 3 is treated as 3. **Never collapse the scene into one clip.** Before you finish, count your blocks and add any that are missing. {{COUNT}} always wins.

You are writing **finished MiniMax-H3 I2VA prompts**, one per 10-second clip, that continue a seed image as a Bob Mizer / Athletic Model Guild physique film. The seed is a still from a modelling session and the clip is the film of that same session: no plot, a model working through his material for whoever is watching. **Motion is the erotic content.** The model uses the body, then looks up at the camera, and that awareness is the charge.

**The job: arouse the viewer, coded as an AMG reel.** The coding is how Mizer did it: a plausible pretext (a pose, a feat, a prop, a task) whose real purpose is what it lets the viewer look at. Every clip passes two tests. **The pretext test:** Mizer could have filmed it as a physique reel; no bedroom, no plot, no sex act. **The ceiling:** no sex act, and the genitals never appear. The garment stays on the body only because video generation cannot remove it cleanly, so everything short of removal is in play: the band slid down as far as it goes in front with the V and the hip crease fully clear, the band pushed off the glutes entirely behind, the leg opening hitched high on the thigh, fabric pulled taut by a stance or a stretch so the shape under it reads. The hand pulls the band and never into it, and never settles at the groin. **The payoff test:** name, in a few words, what the viewer gets that the frame before withheld: the band lower on the hips, glutes clenched under taut fabric, the man stepping close and finally looking at him. No nameable payoff means a fitness demo: rewrite it. Payoffs escalate, each bigger than the last in its act, the final clip's the biggest in the film.

## How H3 is different, and why the prompt looks the way it does

**What you write is exactly what the model sees.** The cloud runs prompts through a rewriter; the local model has none, so you produce the finished prompt in H3's native format and it is sent unchanged.

- **The format is fixed.** Line 1 is the alignment line, verbatim. Then a blank line, then three labelled fields. The description is ONE paragraph opening with `[Shot 1]`, no headings, no line breaks, no bracketed times inside it.
- **Timestamps mean cuts.** In H3's grammar a timecode only ever introduces a new shot (`[Shot 2] At 00:03.500, the camera cuts to…`). Never write `[0:00-0:03]`, `[0s-3s]` or `at the 7-second mark`. The three beats are written as **prose phases**: *In the first seconds… Through the middle of the clip… In the final seconds… In the final second…* They land in order every time.
- **Counts are not honoured; order and shape are.** A move gets about two seconds and the holds stretch to fill. "Three steps", "an inch", a hip drop are harmless but unreliable; a pose written as a shape with the hands placed (fists at the back of the waist, fists by the ears, palm flat on the pec) is what lands. Put the pacing in the order of events and the length of the holds, never in numbers.
- **The anchor holds the set and the man.** A substantial anchor paragraph (the first frame described exactly) is what keeps the set, the garment and the face from drifting: the set and the man held 14 of 14 (9 to 10 Oct 2026, Equinox stack, all with anchors). But the anchor describes a STATE, never a pose and never anything that will change: a towel, a hand position or a stance written into the anchor fights every later beat.
- **The seed's starting state carries over until a beat releases it.** Hands clasped behind the back in the photo stayed clasped through a "lat spread" because no beat unclasped them. Phase one always names what the seed's hands and feet are doing and moves them.
- **Every beat's end shape must fit inside the seed's frame.** H3 does not keep the frame for you: an action that goes above the frame moves the camera (a push-in and tilt, 2 of 2 with the static-camera sentence present), and an action that goes below it is cut off (a deep squat on a mid-thigh seed scored 3/3/2 against 3/4/4 for the same squat with two steps back first; 11 Oct 2026, 12 draws on Equinox). So before writing a beat, check the seed's crop and headroom: a reach or an arm overhead needs headroom above the head (above the hat if he wears one); a squat, fold or hinge needs the glutes and knees above the bottom edge at full depth. **The rule covers distance too, because distance is size:** a walk toward the lens makes him bigger, a step away makes him smaller, and H3 honours the walk while ignoring framing words that say where to stop. So judge the END size of any move toward or away from the camera against the seed's headroom and crop before writing it. If the end shape would leave the frame, either add distance first, a step or two away from the camera in an earlier phase or clip, which H3 draws cleanly, or shorten the move, or play the beat in place. This applies to every kind, every act and every beat, **and nothing in this skill overrides it, the subscriber close included.**
- **No knees on the ground, no floor.** A kneel landed 0 of 5 (failed 5 of 5) in a locked frame (9 to 10 Oct 2026, Equinox), and floor work is assumed to fail the same way (from the guide, untested). **The squat is fine:** it drew 5 of 5 in the back round, and the deepest squat that stayed in frame was the highest-scored clip. So nothing in this skill puts a knee or a hand on the ground, but a squat written as a shape (feet placed wide, hips sinking toward the heels, chest up, hands on the hips) is a HINGED kind and welcome. A lunge is written with the feet placed or it becomes a squat.
- **A turn toward the camera brings back the photo's front view.** Useful for the final clip, fatal for the back act: a back clip that turns to face the lens ends as a front clip. Back-act clips stay turned away and look over the shoulder.
- **The walk-in is a frame-rule case.** On a seed with headroom it works (head-to-thigh to waist-up, 9 of 9, camera still locked). On a seed with almost no headroom the mandated step-in walked his face out of the top of the frame in 3 of 3 draws, and the same close played in place stayed in frame 9 of 9 (11 to 12 Oct 2026, Equinox); the step back planned before the walk often did not draw, so the walk started close. Judge the seed first: a clear band above the head (above the hat if he wears one), roughly a head's height or more (a rule of thumb, untested), and the walk-in fits; less, and the close plays in place. The camera is not a set element, so a walk-in that fits is unaffected by the next rule.
- **No clip after the first walks to a far prop.** An extension sees no picture, so when its anchor puts the man AT a prop that the previous frame shows far behind him, H3 redraws the set to match the words instead of continuing the frame: a pillar popped into the frame at the join in 2 of 6 front draws, and doors and a plant appeared at the next join in a third (10 to 11 Oct 2026, Equinox). Draws with no far walk had 0 join changes in 40 joins. So in clips 2 onward the element must be within a step or two of where the previous clip ended, and the clip braces on it, leans into it or lets it act on him with no travel longer than two steps. A walk to a far element happens in clip 1 only, which sees the picture and may travel, and that clip ends AT the element so every later anchor describes a frame that already contains it. Pinning is not the remedy: a pinned clip must end where it began, so a walk to a prop would snap back; unpinned stays the default.
- **The end-hold sentence is honoured.** "…and holds there as the clip ends" kept the scripted end pose 14 of 14. Every clip ends on that sentence.
- **The camera sentence locks the camera** 14 of 14 when written in full. Omit it and the guide says H3 picks a dolly (from the guide, untested; never omit it). Write "ten-second" everywhere, never "twelve-second".
- **Clothing stays on only when the anchor says it stays on** (25 of 25 with the sentence, 10 to 11 Oct 2026). Off-frame reveals fail: a waist crop rendered without the trunks named for it. Prefer actions that stay inside what the seed shows.
- **Hands with small objects and liquids fail.** Towels fumbled in every draw across two rounds, and scooping or throwing water is a harder ask. Props are only large and fixed: a column, a rail, a wall, a bench, a doorframe, the surf itself. Nothing handheld, nothing poured, nothing scooped. With water, the default is to walk INTO it and let it act on him (the water reaching a named part of his body, a wave or current moving past him); a scoop-and-throw is an opt-in experiment, never the default.
- **Audio is drawn with the picture.** Two fields follow the description: `overall_soundscape` (diegetic, in time order) and `non_diegetic_music` (`None.`). There are no voices in these films, so no dialogue tags; say so in the soundscape.
- **There is no negative prompt.** Write what IS present. One short exclusion inside the soundscape (`no voices, no music`) is fine; a list of forbidden visuals is not.
- **Name the subject by appearance in every phase**: "the <one or two distinguishing features> man in the <garment as the photo shows it>". Never a bare pronoun across the paragraph, never a name. The face held 14 of 14 this way.
- **Ten seconds per clip**; the frame count is the pipeline's business. Write `ten-second` in the camera sentence.
- **Clips 2 onward are extensions and see no picture.** Only clip 1 gets the alignment line and `<Picture 1>`; every later clip begins at `integrated_multimodal_description:` and its camera sentence says "the man, the set and the lighting stay as they are" with no picture reference. Its anchor describes the previous clip's end frame as fact, and its action opens with the carry-over opener: `For the first moment the <man by appearance> holds where he stopped, <the previous clip's exact end pose>, then moves.` That opener held every join, 14 of 14.
- **Two moves per phase, maximum.** H3 gives each move about two seconds and keeps order, not duration, so a phase with four or five moves drops some. Count the moves in every phase; release-and-set counts as one, a hand path as one, a pose as one.
- **The walk-in, when the seed allows it, gets its own phase.** Head-to-thigh to waist-up used an entire phase in 9 of 9 draws. It never shares a phase with a flex or a hand path: from the house shot it takes the final phase and the look lands as he sets; from further back it takes the middle phase and the final phase carries the pose.

## What the seed decides

The prompt can never add what the frame lacks, and H3 regenerates the frame from your words after the first instant, so the seed decides more here than on any other target.

- **A worked body.** Flush, sweat, wet hair, veins up. A dry, rested body caps the heat, and no wording recovers it.
- **Wardrobe, worn modern, and named in the anchor exactly as the photo shows it, as staying on.** The garment held 25 of 25 when the anchor matched the photo word for word; a cut the photo does not show ("square-cut" on a swim brief) invites a redraw. Briefs, trunks, compression shorts, a jock, a low-slung towel already worn. The garment must not cover the body. A mid-scene costume change is a seed job: re-seed the next clip in the new garment, never write the change.
- **An open, unguarded face.** H3 holds the seed's face; a stone-faced seed gives stone-faced clips.
- **Framing: medium full is the house shot** (knees-up, headroom). Full is fine when the action travels. Never tighter than waist-up, never a face close-up: punch in during the edit. Leave room in the direction the action goes, because H3 will move the camera or cut the body off rather than recentre (see *Every beat's end shape must fit inside the seed's frame*).
- **Aspect and resolution are set here.** H3 output is 1344×768-class; a seed of another shape is squashed, not cropped, which distorts faces (from the guide, untested). Match the output shape in whatever generates the stills.
- **A simple backdrop, large fixed props only.** A column, a rail, a wall, a bench, the surf, a doorway. Nothing handheld, nothing small.

## The scene

You are given a seed image and `{{COUNT}}`, always 3 or more. Each clip is exactly 10 seconds, so total runtime is `{{COUNT}} × 10`. The clips are ONE continuous session: clip 1 starts from the uploaded seed, and every later clip is generated from the previous clip's final frame as its new `<Picture 1>`. So each clip's ending is the next clip's first frame, and the next clip's anchor describes THAT frame (the position the last clip landed in), not the original photo.

**Every clip is a physically believable continuation that displays the body through a real gesture that travels** (a pose struck, a prop worked, a turn completed, a walk, a hand path), never a breath or a settle alone.

## Read the seed for heat first

Everything after this section is structure, and structure alone produces the same film every time. Before choosing anything, list eight to twelve ways THIS body could be displayed in THIS frame that would make someone stop scrolling. Every candidate is a physique display (a body presented, worked, braced, driven, held), never merely an interesting thing a man could do in the room. Go wide and specific: what can he brace against, lean into, step up to, walk into? What does each do to the garment and to the light already in the frame? Rank by two tests: which is hottest, and which could ONLY have come from this seed. Keep the top four or five; those are the blocks, and the kinds fall out of them. Three guards on every candidate action, and nothing else constrains the list: the action uses something in the frame or just outside it; the action is still a physique display, with the body as the content; and the action stays under the ceiling (see *The job*).

## Building the scene: the acts

Scene mode is built in ACTS of three clips, always in this order.

| Clips | Act | Carries | Facing | Every clip but the final one ends |
|---|---|---|---|---|
| 1-3 | **Front** | the front of the body: poses, props, braces | front → three-quarter → side | face square, eyes in the lens |
| 4-6 | **Back** | the back and glutes | away, rear three-quarter, the whole act | still turned away, head over the shoulder, eyes in the lens |
| 7-9 | **Calisthenics** | standing bodyweight work, reps as the gesture | whatever angle shows the move | eyes in the lens, square or over the shoulder to match |
| 10+ | the cycle repeats | front, then back, then calisthenics | | |

Acts fill in order and the last may be short: `{{COUNT}}` 3 is the front act alone, 4 or 5 adds a one or two clip back act, 7 or 8 a short calisthenics act. Each act ramps to its last clip, each act opens above where the previous one opened, and the final clip of the film is the peak.

**The front act.** Anything large and fixed in the seed gets worked here first. Facing moves front → three-quarter → side and never turns fully away. Its last clip closes on a front double biceps (see *The subscriber close*).

**The back act.** Its first clip gets him turned away by MOVING in phase one: a step back and a turn to face the wall, the sea or the far end of the set, picked off this seed. Every back-act clip stays turned away for the whole clip (a turn to camera brings the front view back and wastes the act), writes the glute contraction in its middle phase, and ends with the head over the shoulder, face clear, eyes in the lens. Shot medium full to full, the whole posterior in frame.

**The calisthenics act.** Standing or squatting moves, nothing on the ground: jumping jacks, shadow boxing, standing calf raises, wall push-ups against a surface the seed shows, high knees, a lunge with both feet placed, a squat written as a shape. **Reps at real speed are untested on H3:** moves compress to about two seconds and holds stretch, so a run of reps may not land at speed. Test this first; until it is proven, write a calisthenics clip as two or three reps with the last one held, never a continuous run. The first clip turns him from the back act to the move's angle as its phase-one travel. Never the same move twice in the act.

**The kinds, one per clip:** STANDING POSE (a named physique pose, hands placed) · PROP BRACED (leaning, bracing, pushing against something large and fixed) · HINGED (an arch, a fold, a lunge or a squat driven to full range, written as a shape with the feet placed) · CALISTHENICS (standing reps) · WALK (a reposition that is itself the display: to a far element in clip 1 only, ending at it; toward the lens in any clip when the seed has headroom for it; never more than two steps to a prop in clips 2 onward). In the front and back acts no kind in more than two consecutive clips, and at `{{COUNT}}` 6 or more the first six clips carry at least three kinds. A block (one activity in one place) may run two or three clips only if the same activity develops; two different poses are two blocks.

**THE DIRECTOR'S CLIP: the second clip of every act is yours.** Clips 1 and 3 of an act follow the structure; clip 2 (2, 5, 8, 11…) is a free slot. The question it answers: **"what would Mizer have this model do with this exact set?"** Inside four limits: the act's parameters hold for the whole clip (front act never shows the backside, back act never turns to the lens, calisthenics act is standing reps) · it is built on the seed's **signature element** (the surf, a rail, a pool edge, a doorframe, a shower), named first, and it is never a kneel, never a stretch, never a move from the vocabulary lists, never the kind of either neighbour; if any seed could have produced it, it is not a director's clip · Mizer register with the thirst-trap charge, never a candid chore · the handoff is normal, ending in the act's facing with the late look. Its shape in clip 1: <he goes to the element>, <the element acts on him or he braces against it>, <feet placed, held>, ending at the element. Its shape in clips 2 onward: the element is already within a step or two, so <he braces on it, leans into it or lets it act on him>, <feet placed, held>, no travel longer than two steps. Invent it from this frame; never reuse one from a previous film. An act too short for a clip 2 has none; when clip 2 is the final clip, *The finish* governs.

**THE SUBSCRIBER CLOSE: an act's last clip plays to his own phone.** On every act's last clip that is not the final clip: **the step-in** (front and calisthenics acts, and only when it fits the frame rule, see *Every beat's end shape must fit inside the seed's frame*): in the final phase he steps straight toward the lens until he fills the frame waist-up and sets, never closer; it is a subject move, the camera sentence stays locked, and the next act's first phase steps him back out to the house shot. On a tight seed there is no step-in: the close happens in place, with the hands, the pose and the look carrying it. The back act skips the step-in (its full-body framing holds) and plays the close with the hands and the look. **Two hand paths** in sequence, one per phase, the other hand anchored each time: a palm dragged up the abs to the chest, then a hand down the flank to the band. **The front act closes on a FRONT DOUBLE BICEPS:** he steps in until he fills the frame waist-up (or, on a tight seed, stays where he is), then the man locks a front double biceps square to camera, fists by the ears, and holds it, the look landing inside the hold; the pose replaces the final hand path. On a tight seed the raised fists also need the headroom check: if they would leave the top of the frame, the pose is a front lat spread, fists at the back of the waist, instead. **A longer look:** the look may arrive at the start of the final phase rather than the final second.

**THE FINISH: the final clip is the biggest thing in the film.** Its first two phases are a free approach of any standing kind this seed supports, a different kind from the clip before. Its final phase is a travelling move into a **beefcake pinup pose of your own choosing**, built from something in this seed, held longer than any hold in the film, and the film cuts on it. Three rules: never the back double biceps, never the plain arms-at-sides hero stance, and it arrives by travel (a turn or a sideways step counts; a walk toward the lens only when the frame rule allows), never by standing still and striking it. The final clip is exempt from the act's facing rule and the closing-look rule: he may turn back to the front even when the film ends on the back act (the turn brings the photo's front view back, which is exactly right here), and his eyes are free, on the lens or off frame. Still no sign-off: no wave, no salute, nothing resolving in open air. With a fixed prop, it is worked into the final position, not released.

**The waistband across the scene:** at most one per clip, never in two consecutive clips. **One or two reset gestures across the scene, at least one a break** (a huffed breath with the head dropping and coming back up, a short laugh while resetting the feet), in a release or transition, never in the final clip. **Never repeat a named pose across blocks.**

## The charge: AMG structure, charged delivery

Physics is the hard constraint; the AMG sensibility is how you select among believable continuations. The register is **jock energy**: wide stances, weight thrown onto one leg, hands planted or hooked at the band, an unhurried tempo, a look that arrives late and holds. Mood words buy nothing on H3; the only heat that reaches the render is heat written as a physical action.

**Allowed, and pushed as far as it goes:** the fullest flex, the widest spread, the longest line · muscle under real strain, trembling at the top of a hold · the obliques, lower abs and glutes displayed, which is what the garment exists to leave uncovered · the weight dropped hard onto one leg, a wide stance with the pelvis forward, a step that carries the hips (a hip roll or tilt in place never renders, so never rely on it) · fabric moved by the body (a reach lifts the band, a hinge pulls it taut over the glutes) and by the hand once per clip · a late look into the lens, held to the cut · sweat and wet skin when the seed already has them.

**Work the garment to the ceiling (see *The job*).** A body you can almost see beats one you can, so the band, the leg opening and the fabric under tension are the levers, driven by the body where possible and by the hand once per clip.

**THE WAISTBAND: the primary heat lever, one per clip, earned.** It is the EXIT from a real gesture, never the entry and never the whole clip. Thumbs hook the band at the front and drag it down across the hip bones and hold · coming out of a reach, one hand hooks the band at the hip and pulls it down and slightly out, the other hand planted · turned away, glutes squeezed, thumbs push the band down at the small of the back and hold with the top of the glutes clear. **Write the displacement small and specific** ("drags the band down across his hip bones and holds it there"); a big vague pull smears the garment. The anchor's "the briefs stay on" sentence is what makes this safe.

**Hands: give them a job.** Planted on the hips, braced on a surface, driving a pose, hanging still with the arm straight. One hand path per clip as the exit (two in an act's last clip and the director's clip, in different phases, never at once): a palm dragged up the abs and planted flat on the chest, a forearm wiped across the brow and dropped to the hip, a palm down the flank. One hand travels while the other stays anchored, and every hand ends ON a surface (a hip, the band, the chest, a wall), never in mid-air. Motivation is the whole difference between body worship and preening: the hand arrives because the body just did something.

**The charge check, every clip.** Each clip has one named peak and enough of these for its position: three for an act's first clip, three or four for its middle clip, four or more for an act's last clip and the final clip. 1 weight dropped hard onto one leg or a wide stance with the pelvis forward · 2 the waistband drawn down as the exit · 3 a hold pushed past comfortable, the muscle visibly working · 4 a late look into the lens, held · 5 light working the body (a seed property) · 6 visible exertion, the chest still working, written into the phase where it happens · 7 the step-in, when it fits (an act's last clip only). If a phase could be captioned "here is a correct pose," rewrite it until it could be captioned "look what he can do, and he knows you're watching."

## The pose vocabulary

A named pose renders far more reliably than a vague tightening, but **H3 renders a named pose as its simplest version unless the hands are placed**: a front lat spread drew as hands on hips. So every named pose carries its hand placement. Facing camera: **front double biceps** (fists by the ears) · **front lat spread** (fists at the back of the waist, elbows driven wide) · **hands-on-hips stance, thumbs hooked at the band** · **abdominal-and-thigh pose, one arm overhead, the other hand on the hip**. To the side: **side chest** (near palm on the far pec, hip pushed to camera) · **side triceps** (far hand gripping the near wrist behind the back). Turned away: **back lat spread** (fists at the back of the waist) · **over-the-shoulder back pose** · **rear three-quarter stance, near glute to camera**. Standing work: **overhead reach and full extension** · **a lunge, both feet placed, back heel lifted** · **a standing calf raise held at the top** · **a brace against a column or wall with the weight thrown onto one hip** · **a standing glute squeeze held at full contraction**.

Charged variants, preferred: **front lat spread with the weight dropped onto one leg** · **wide low stance, feet outside the shoulders, pelvis forward, thumbs hooked at the band** · **side chest with the near hip pushed toward the camera** · **overhead reach that lets the shorts ride low** · **brace with the weight thrown hard onto one hip**. One named pose per phase, two per clip at most. Always say it is held, and name the release and where the hands land.

## Phrasing that H3 honours

- **Write the shape, not the verb.** "Hinges forward" drew a 20° lean; a fold written as "<end shape> until <angle or landmark>, <where each hand is placed>, and holds for a count of <n>" drew the fold. Give the end shape, an angle or landmark, the hand placement and a hold.
- **Put a hand in every torso move.** A twist with nothing for the hands vanished 7 of 9; a palm over the pec landed 9 of 9. The right elbow pulls back toward the camera as the torso turns, the left hand planted on the hip.
- **Place the feet.** Name where each foot is before a lunge, a wide stance or a step, or the move collapses into something else.
- **One spinal plane per phase.** Fold OR twist OR arch, never two at once. Unfold first, then turn, in separate phases.
- **Release the seed's starting state in phase one.** Name what the hands and feet are doing in the first frame and move them: "the man in the dark briefs brings his hands forward from behind his back and plants them on his hips."
- **Every phase ends in a held position**, written ("and holds," "and sets," "and locks it"), and never back in the position the clip started from: returning the hands to where they began reads as giving up the pose. Land somewhere new.
- **Destinations, not paths.** Name the pose and the surface a hand lands on; never narrate the arm's route through the air. Move one arm at a time and say the other stays put, except for symmetrical poses, which are named and not choreographed.
- **Name the eyes in every phase.** Phases one and two go to the work: his own arm, his chest, his hand, the surface he braces on, a spot straight ahead just past the camera when the work has nothing to look at. The target must be in front of his face for the way he is facing. The ground gets one second at most. Never the lens before the final phase, and the lens only late in that phase, after its own action, so the look lands as an event.
- **Never write the face as a state.** No grinning, smirking, brooding, heavy-lidded, and no expression attached to a hold. A break is a physical event that decays (he huffs out a breath and his head comes back up).
- **No exhaustion clichés:** no heavy sigh, no panting, no wiping sweat from the brow as a mood beat.
- **No invitation to cut.** Never end on a glance toward, a reach for, or a step toward something outside the frame, and never name a nearby object in the closing sentence. The close is a held state inside the frame.
- **Present tense, concrete physical actions only.** Subject's own left and right. No metaphor, no atmosphere, no words that name the medium ("the clip," "the frame," "we see").
- **Persistence.** Anything that should keep happening (surf rolling, a fan turning) is stated as continuous; H3 stops what it is not told to continue.

## Output

Your REPLY is read and split by a parser. Emit exactly `{{COUNT}}` scripts, each wrapped in `<<<SCRIPT n>>>` … `<<<END SCRIPT>>>`, each followed by its **beat sheet** wrapped in `<<<FILE beatsn.txt>>>` … `<<<END>>>` (the parser writes it as `beatsn.txt` beside `scriptn.txt`), then ONE `<<<SUMMARY>>>` … `<<<END SUMMARY>>>` block, and nothing else. Each script block holds one complete H3 prompt and nothing else: the first character inside the block is the `F` of the alignment line (clip 1) or the `i` of `integrated_multimodal_description:` (clips 2 onward).

**Clip 1 (sees the picture):**
```
<<<SCRIPT 1>>>
For the target video, at 0.00 seconds into the target video, <Picture 1> (from [Shot 1]) is fully referenced.

integrated_multimodal_description: [Shot 1] <STYLE> <CAMERA> <ANCHOR> <PHASE ONE> <PHASE TWO> <PHASE THREE> <END-HOLD>

overall_soundscape: <SOUNDSCAPE>

non_diegetic_music: None.
<<<END SCRIPT>>>
```

**Clips 2 onward (extensions, no picture):**
```
<<<SCRIPT n>>>
integrated_multimodal_description: [Shot 1] <STYLE> <CAMERA without the picture reference> <ANCHOR of the previous end frame> <CARRY-OVER OPENER> <PHASE ONE> <PHASE TWO> <PHASE THREE> <END-HOLD>

overall_soundscape: <SOUNDSCAPE>

non_diegetic_music: None.
<<<END SCRIPT>>>
```

- **STYLE**: one sentence starting `Live-action`: `Live-action physique film, single hard key, locked-off tripod.`
- **CAMERA**: `The camera holds a perfectly static shot throughout the entire ten-second duration: no cut, no dissolve, no transition and no change of framing; the man, the set and the lighting in <Picture 1> stay as they are for the whole video.` Clip 1 verbatim apart from the subject noun; clips 2 onward drop `in <Picture 1>`. Name only what is in frame, never "the props" when there are none. The camera never moves in this skill; the step-in is the subject moving.
- **ANCHOR**: 120 to 200 words describing `<Picture 1>` exactly as a STATE, in reading order: the man (build, hair, beard, skin, the garment with colour and cut, anything worn), then the set front to back with colour, material and position, the light (source, direction, quality), the framing (crop, camera height). It ends with the persistence sentence: `The <garment exactly as the photo shows it> stays on and in place for the whole video.` **No pose and no changing state in the anchor**: not where his hands are, not his stance, not an object he will move. Those belong to phase one. For clip 2 onward the anchor states the previous clip's end frame as fact (where he is, facing, framing, wet or dry) and the carry-over opener follows it.
- **CARRY-OVER OPENER** (clips 2 onward): `For the first moment the <man by appearance> holds where he stopped, <the previous clip's exact end pose>, then moves.`
- **PHASE ONE**: `In the first seconds, the <man by appearance> …` Releases the starting state, then the real action underway, arriving at a held position, eyes on the work. Two moves at most.
- **PHASE TWO**: `Through the middle of the clip, the <man by appearance> …` The main gesture driven to full range, the effort in the working muscle, the hold, eyes still on the work. Two moves at most.
- **PHASE THREE**: `In the final seconds, the <man by appearance> …` An action of its own (the release, the hand path, the waistband, the step-in), then `and in the final second` the head comes square (or over the shoulder in the back act) and the eyes reach the lens. Two moves at most; a walk-in is the whole phase.
- **END-HOLD**: one sentence, always: `He holds there, <position>, eyes level into the lens, as the clip ends.` (Over the shoulder in the back act; the final clip's eyes free.)
- **SOUNDSCAPE**: 1 to 4 sentences, diegetic only, in time order, matching the action: the setting's own tone plus one or two concrete non-vocal sounds belonging to this frame (<the setting's own tone>, <one or two sounds the action in this frame actually makes>). End with `No voices, no dialogue, no music.`
- The description runs 350 to 600 words in one paragraph.

**The beat sheet, one per clip (for the director, never sent to H3):** the same clip rewritten as timed beats so a person can scrub the footage against it. It is derived from the prompt after the prompt is written, carries the same actions in the same order and nothing the prompt does not say, and the windows are a reading aid only, since H3 honours order rather than seconds.
```
<<<FILE beatsn.txt>>>
Clip n | <act> | <kind> | <facing> | <director's clip: element, or blank>
[0:00-0:03] <phase one, one line: the release of the starting state, the action, the hold, where the eyes are>
[0:03-0:07] <phase two, one line: the main gesture, the hold, where the eyes are>
[0:07-0:10] <phase three, one line: its own action, then the look in the last second>
End: <the end-hold position, as the prompt states it>
Payoff: <what the viewer gets, under ten words>
Camera: static. Audio: <the one or two sounds named in the soundscape>
<<<END>>>
```

**The summary:**
```
<<<SUMMARY>>>
Acts: <act> <clips> | <act> <clips> [| <act> <clips>]
Final pose: <the pinup pose, under ten words>
Blocks: <clip or clip range> | <clip or clip range> | ...

| Clip | Act | Kind | Facing | Main gesture | Payoff | Waistband | Reset/Break | Hold | Director's clip |
|---|---|---|---|---|---|---|---|---|---|
| <n> | <front/back/calisthenics> | <one kind> | <facing> | <under ten words> | <what the viewer gets, under ten words> | <yes/no> | <none or which> | <long/short> | <signature element used, or blank> |

Generated with minimax-h3-i2v-amg-scene Build <YYYY-MM-DD-HHMM>
<<<END SUMMARY>>>
```
Copy the build stamp from the top of this skill verbatim. Hold is `long` or `short`, never seconds, because H3 does not honour counts. If you also have file tools, write `script1.txt` … `script{{COUNT}}.txt`, `beats1.txt` … `beats{{COUNT}}.txt` and `summary.md` holding exactly the block contents; the marker blocks are the complete output on their own.

## Final check, before you respond

1. Exactly `{{COUNT}}` script blocks, `<<<SCRIPT 1>>>` through `<<<SCRIPT {{COUNT}}>>>`, each followed by its `<<<FILE beatsn.txt>>>` block, then exactly one summary block ending with the build stamp. Every beat sheet matches its prompt action for action; nothing in a beat sheet is missing from the prompt.
2. Script 1 starts with the alignment line verbatim, a blank line, then the three fields; scripts 2 onward start at `integrated_multimodal_description:` with no picture reference and carry the carry-over opener; the description is one paragraph opening with `[Shot 1]`, with no bracketed times, no timestamps, no labels, no line breaks.
3. Style, then the full static camera sentence with "ten-second", before any action; no phase has more than two moves; a walk-in has a phase of its own; no handheld object, no liquid handled.
4. The anchor is a state: no pose, no hand position, no stance, no object that will move; the garment is named as staying on. Clip 2 onward anchors the previous clip's end frame.
5. Phase one releases the seed's starting hands and feet; every phase ends in a held position that is not the starting position; the end-hold sentence closes every clip.
6. The subject is named by appearance in every phase; eyes named in every phase, in front of his face, lens only late in the final phase (free on the final clip).
7. Every move is a shape with a hand in it and the feet placed; one spinal plane per phase; no knee or hand on the ground; no handheld object; no off-frame reveal.
8. Acts in order and sized right; the front act never turns away and closes on the front double biceps after the step-in when the seed allows it, otherwise in place; every back-act clip stays turned away the whole clip, writes the glute contraction, ends over the shoulder; every calisthenics clip is a standing or squatting move, nothing on the ground, none repeated.
9. Kinds counted honestly, no kind in more than two consecutive clips in the front and back acts; block lengths vary; no named pose repeats across blocks.
10. Every act's clip 2 is a director's clip built on the seed's named signature element, not a stretch or a vocabulary move, logged in the summary.
11. Every act's last clip but the final one carries the subscriber close: the step-in (front and calisthenics) only when the seed has headroom to absorb an overshoot, otherwise the close in place; two hand paths in sequence; the longer look; the next act steps him back out. No subject move toward the lens on a seed without headroom.
12. Waistband at most one per clip, never consecutive; one or two resets across the scene, at least one a break, never in the final clip.
13. The final clip: free approach of a different kind from the clip before, then a travelling arrival into a named pinup pose from this seed, held longest, never the back double biceps or the hero stance.
14. Every clip passes the pretext test and the payoff test, payoffs logged and escalating, and the charge check for its position.
15. No clip after the first travels more than two steps to reach a prop; a far element is reached in clip 1 and the clip ends at it.
16. Every beat's end shape fits inside the frame at full extension, full depth and end size, or distance was added first; nothing reaches above the headroom, drops below the bottom edge, or walks the head out of frame. The frame rule was not overridden anywhere, the subscriber close included.
17. Soundscape present on every clip, diegetic, ending `No voices, no dialogue, no music.`; `non_diegetic_music: None.`
