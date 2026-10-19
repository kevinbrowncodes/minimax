---
name: promo-frames
description: Pulls the best promo stills from a finished OnlyGainsTV film (the owner's final cut in a round folder under test/) for Instagram, X, YouTube and the other off-site posts. Waits for the file to finish copying, screens out anything a platform would punish (nude frames, waistband pulls, a hand at the front of the garment), saves the shortlist at full resolution to the round's promo/ folder in film order, makes square waist-up YouTube thumbnails in promo/yt/, and ends with an scp line for the Mac. Use when the owner hands over a final video and asks for promo frames, stills, a thumbnail, a cover frame, or "the best frames".
metadata:
  build: 2026-10-19-1900
  ticket: CHORE_039
---

# Promo frames from a finished film

The owner hands over the final cut, usually `test/<round>/<round> <Title>.mp4`. You hand back 6 to 10 stills he can post off the site, ranked, at full resolution, in `test/<round>/promo/`.

The first run (the vines film, 2026-10-19) is the reference for shape: 8 frames, all from scene 1, numbered in film order.

## Ground rules

- **Host `ffmpeg` and `ffprobe` only.** They are already on the Spark. Install nothing.
- **Working files go in the session scratchpad.** Only the chosen frames land in the round folder. `test/` is untracked; never stage anything from it.
- **Look at every frame you keep.** A frame is chosen by reading it, never by its timestamp alone.
- **Quote paths.** Final cuts carry spaces and an emoji in the name.

## Step 1: wait for the whole file

The cut arrives by copy from the Mac and is often still growing when the owner gives you the path. A stable size is not proof: on the vines film the size held still for 10 s at 13 MB of 159 MB.

The proof is a clean full decode. Run it as a background command (its own `bash -c`, so the `exit` ends the loop and not your shell) and wait for the notification, with a ceiling of about 27 minutes:

```bash
bash -c 'F="$1"; i=0
until [ -z "$(ffmpeg -v error -i "$F" -f null - 2>&1 | head -3)" ]; do
  i=$((i+1)); [ $i -ge 110 ] && { echo "still partial at $(stat -c %s "$F") bytes"; exit 1; }
  sleep 15
done; echo "complete: $(stat -c %s "$F") bytes"' _ "<path>"
```

If the first look fails with "partial file" or "Invalid NAL unit size", tell the owner the copy is still running and that you are waiting for it.

## Step 2: read what the film does

- `ffprobe` for duration, resolution and frame rate.
- The round's `shot-list.md` and `scenes/scene-N/shot-N.txt`: which scene is clothed, where each beat peaks, where the waistband moves.
- A 1 fps timestamped contact sheet of the whole cut:

```bash
ffmpeg -v error -y -i "$F" -vf "fps=1,scale=320:-1,drawtext=text='%{pts\:hms}':x=4:y=4:fontsize=18:fontcolor=yellow:box=1:boxcolor=black,tile=8x8" -frames:v 1 "$S/contact.png"
```

Read it and find the scene boundary (the cut is usually scene 1, then scene 2), and the seconds where the waistband is pulled.

**The boundary may be a crossfade**, not a cut: on the vines film the 1 fps sheet showed 30 s clothed and 31 s nude, and only the 4 fps sheet showed the blended frame at 30.75 s. Find the last clean clothed frame on a 4 fps sheet of the second either side, and treat every blended frame as part of the nude scene.

## Step 3: the promo screen

Promo is judged by the platforms' rules, not the site's.

**Out, always:**

- Any nude frame. In practice that is all of scene 2 and anything after the garment comes off.
- Waistband pulls, from the first thumb hooked in the band until it is back.
- A hand at the front of the garment: a palm or fingers on or over the pouch, or thumbs hooked in the band at the front.

**In, by the owner's pick on the vines film:** hands on the hips with the fingertips at the side of the band, and a hand resting on the outer or upper thigh. Those frames (6.75, 14.50 and 23.50 s there) were kept and he called the set "really good".
- Motion blur, a half blink, the mouth open mid-movement, warped or extra fingers, a camera move in progress.

**Prefer:** the eyes in the lens, a pose at its peak, a clean silhouette against the set, and the frame the shot's payoff names.

## Step 4: candidates

1. A 4 fps contact sheet for each safe window, timestamped, at most 8x4 frames per sheet:

```bash
ffmpeg -v error -y -ss $A -to $B -i "$F" -vf "fps=4,scale=400:-1,drawtext=text='%{eif\:t+$A\:d}.%{eif\:mod((t+$A)*100\,100)\:d\:2}':x=4:y=4:fontsize=22:fontcolor=yellow:box=1:boxcolor=black,tile=8x4" -frames:v 1 "$S/w-$A.png"
```

2. Pick 10 to 12 candidates, one per distinct pose. Near-duplicates share one slot.
3. Export each at full resolution, seeking before the input. Write `T` zero-padded (`05.25`, not `5.25`) so the files sort in film order:

```bash
for T in 00.25 05.25 19.75; do ffmpeg -v error -y -ss $T -i "$F" -frames:v 1 "$S/f/t$T.png"; done
```

4. A review sheet of the candidates, then the likely hero frame at full size. Drop anything that fails the screen up close.

```bash
ffmpeg -v error -y -pattern_type glob -i "$S/f/t*.png" -vf "scale=640:-1,tile=4x3" -frames:v 1 "$S/review.png"
```

## Step 5: the shortlist

Save 6 to 10 frames to `<round>/promo/` as **JPEG** (owner, 2026-10-19), converted from the full-resolution PNG candidates with `ffmpeg -nostdin -v error -y -i <candidate>.png -q:v 2 <name>.jpg` (about 300 KB each), named `NN-<seconds>s-<pose-in-words>.jpg`, **numbered in the order they occur in the film**: `01` is the earliest. Seconds are zero-padded to two digits before the point (`05.25s`), so the names sort by time in any file browser. The ranking lives in the report, not the names: the hero is marked there. Give each a use:

| Use | What it is |
|---|---|
| Hero | the strongest look in the film, eyes in the lens |
| Cover | the most Weber-like still, often the keyframe pose |
| Scroll-stopper | a bold pose that reads at thumbnail size |
| Carousel | a quiet frame that rewards the swipe |
| Physique | the pose at its peak |
| Backup | the alternative to the hero |

## Step 5b: square YouTube thumbnails in promo/yt/

For every frame in the shortlist, make a square YouTube version in `<round>/promo/yt/`, named like its source with `-yt.jpg` (owner, 2026-10-19).

- **Waist up, the garment never in frame.** YouTube's thumbnail policy treats a thumbnail that centres the groin as sexual content, whatever the video is. Crop from the top of the frame down to just above the waistband; no strip of band at the bottom edge.
- **Square, 1080 x 1080, JPG under 2 MB** (`-q:v 2` lands near 130 KB). The side of the crop is the distance from the top of the frame to just above the band; centre it on his face and torso, keep the whole face inside, and scale up with lanczos.
- **Place each crop by reading it.** Tile the shortlist with a 10 x 10 grid (`drawgrid=w=192:h=108` on 1920 x 1080) to read the band's height and his centre line, crop, then look at every square: a face cut at the edge or a sliver of band means recrop.
- **No text, no retouching.** The frame is the film's.
- In a `while read` loop, give ffmpeg `-nostdin`, or it eats the list and skips every other frame.

```bash
ffmpeg -nostdin -v error -y -i "$f" -vf "crop=$SIDE:$SIDE:$X:0,scale=1080:1080:flags=lanczos" -q:v 2 "yt/${f%.jpg}-yt.jpg"
```

## Step 6: the report

- A table in film order: number, time, the frame in words, its use, with the hero marked in bold.
- What was left out and why (the seconds of the nude scene, the waistband pulls, any frame dropped up close).
- **The reach note:** when the garment shows an outline (light briefs, wet fabric), say plainly that it can limit reach on Instagram.
- **Offer crops by the multiple-choice tool**, never as a trailing question: 4:5 crops above the waistband (recommended when the outline shows), 4:5 full body, or leave as is.
- **The Mac line.** The owner's Mac reaches the Spark through the Host `dgx-spark-2025` in its `~/.ssh/config` (his `connect` / `spark` shell functions are built on it; a shell function cannot be used by `scp`, the Host can):

```bash
scp -r dgx-spark-2025:"<absolute path to promo>" ~/Downloads/<round-name>-promo
```

  If he says that Host no longer works, fall back to the address read that session (`whoami`, `hostname -I`), never from memory: `scp -r <user>@<address>:"<path>" …`.

## Never

- A frame from the nude scene in `promo/`, whatever the owner's audience.
- Pixel-level edits: no retouching, no upscaling, no brightness changes. The frame is the film's.
- Deleting or overwriting anything in the round folder except an earlier `promo/` you made for that film.
