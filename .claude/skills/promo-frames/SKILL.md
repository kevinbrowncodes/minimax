---
name: promo-frames
description: Pulls the best stills from a finished OnlyGainsTV film (the owner's final cut in a round folder under test/). promo/ is the shortlist for his website, across the whole film, nude scene included; promo/yt/ holds square YouTube thumbnails cropped to meet YouTube's community guidelines. Waits for the file to finish copying, saves both sets as JPEG in film order, and ends with an scp line for the Mac. Use when the owner hands over a final video and asks for promo frames, stills, thumbnails, a cover frame, or "the best frames".
metadata:
  build: 2026-10-20-1130
  tickets: CHORE_039, CHORE_040, CHORE_041, CHORE_042, CHORE_045
---

# Promo frames from a finished film

The owner hands over the final cut, usually `test/<round>/<round> <Title>.mp4`. You hand back two sets:

| Folder | For | Rule |
|---|---|---|
| `promo/` | **his website** | the best frames of the whole film, nude scene, waistband pulls and the squat included |
| `promo/yt/` | **YouTube** | a square per website frame, cropped to meet YouTube's community guidelines |

The vines film (2026-10-19) is the reference for shape: 15 website frames across both scenes and 14 squares, with the squat skipped because no compliant crop of it was worth posting.

## Ground rules

- **Host `ffmpeg` and `ffprobe` only.** They are already on the Spark. Install nothing.
- **Working files go in the session scratchpad.** Only the chosen frames land in the round folder. `test/` is untracked; never stage anything from it.
- **Look at every frame you keep.** A frame is chosen by reading it, never by its timestamp alone.
- **Quote paths.** Final cuts carry spaces and an emoji in the name.
- **Give ffmpeg `-nostdin` inside any `while read` loop**, or it eats the list and skips every other frame.
- **Never write a positional shell variable in this file** (a dollar sign followed by a digit or `@`). Claude Code replaces it with the words typed after the skill's name, so a loop arrives broken. Pass values as named variables.

## Step 1: wait for the whole file

The cut arrives by copy from the Mac and is often still growing when the owner gives you the path. A stable size is not proof: on the vines film the size held still for 10 s at 13 MB of 159 MB.

The proof is a clean full decode. Run it as a background command (its own `bash -c`, so the `exit` ends the loop and not your shell) and wait for the notification, with a ceiling of about 27 minutes. The path goes in through the `FILM` variable:

```bash
FILM="<path>" bash -c 'i=0
until [ -z "$(ffmpeg -v error -i "$FILM" -f null - 2>&1 | head -3)" ]; do
  i=$((i+1)); [ $i -ge 110 ] && { echo "still partial at $(stat -c %s "$FILM") bytes"; exit 1; }
  sleep 15
done; echo "complete: $(stat -c %s "$FILM") bytes"'
```

If the first look fails with "partial file" or "Invalid NAL unit size", tell the owner the copy is still running and that you are waiting for it.

## Step 2: read what the film does

- `ffprobe` for duration, resolution and frame rate.
- The round's `shot-list.md` and `scenes/scene-N/shot-N.txt`: where each beat peaks, where the waistband moves, what each scene's payoff is.
- A 1 fps timestamped contact sheet of the whole cut:

```bash
ffmpeg -v error -y -i "$F" -vf "fps=1,scale=320:-1,drawtext=text='%{pts\:hms}':x=4:y=4:fontsize=18:fontcolor=yellow:box=1:boxcolor=black,tile=8x8" -frames:v 1 "$S/contact.png"
```

**The scene boundary may be a crossfade**, not a cut: on the vines film the 1 fps sheet showed 30 s clothed and 31 s nude, and only the 4 fps sheet showed the blended frame at 30.75 s. Blended frames are never kept.

## Step 3: the website screen

Every scene is in. The owner's site is the audience, so the payoffs are the point: the band drawn down, the glimpse, the look over the shoulder, the frontal finish.

**Out, only for craft:**

- A blended crossfade frame.
- Motion blur, a half blink, the mouth open mid-movement, warped or extra fingers, a camera move in progress.
- A head cut off by the frame edge, unless that frame is the only one of its pose.

**Prefer:** the eyes in the lens, a pose at its peak, a clean silhouette against the set, and the frame each shot's payoff names. Cover both scenes.

## Step 4: candidates

1. A 4 fps contact sheet for each window of the film, timestamped, at most 8x4 frames per sheet:

```bash
ffmpeg -nostdin -v error -y -ss $A -to $B -i "$F" -vf "fps=4,scale=400:-1,drawtext=text='%{eif\:t+$A\:d}.%{eif\:mod((t+$A)*100\,100)\:d\:2}':x=4:y=4:fontsize=22:fontcolor=yellow:box=1:boxcolor=black,tile=8x4" -frames:v 1 "$S/w-$A.png"
```

2. Pick 12 to 18 candidates, one per distinct pose. Near-duplicates share one slot.
3. Export each at full resolution, seeking before the input. Write `T` zero-padded (`05.25`, not `5.25`) so the files sort in film order:

```bash
for T in 00.25 05.25 19.75; do ffmpeg -nostdin -v error -y -ss $T -i "$F" -frames:v 1 "$S/f/t$T.png"; done
```

4. A review sheet of the candidates, then the likely hero frame at full size. Drop anything that fails the screen up close.

```bash
ffmpeg -nostdin -v error -y -pattern_type glob -i "$S/f/t*.png" -vf "scale=640:-1,tile=4x3" -frames:v 1 "$S/review.png"
```

## Step 5: the website shortlist in promo/

Save 10 to 16 frames to `<round>/promo/` as **JPEG**, converted from the PNG candidates (`ffmpeg -nostdin -v error -y -i <candidate>.png -q:v 2 <name>.jpg`, about 300 KB each). Name them `NN-<seconds>s-<pose-in-words>.jpg`, **numbered in the order they occur in the film**: `01` is the earliest. Seconds are zero-padded (`05.25s`) so the names sort by time in any file browser. The ranking lives in the report: the hero is marked there.

Give each a use:

| Use | What it is |
|---|---|
| Hero | the strongest look in the film, eyes in the lens |
| Cover | the most Weber-like still, often the keyframe pose |
| Payoff | a scene's reveal: the band drawn down, the glimpse, the frontal finish |
| Scroll-stopper | a bold pose that reads at thumbnail size |
| Gallery | a quiet frame that rewards the swipe |
| Physique | the pose at its peak |
| Backup | the alternative to the hero |

### Six favorites

Mark exactly **6** website frames by appending `-favorite` before `.jpg` (`06-19.75s-hand-on-chest-the-look-favorite.jpg`). The film-order number stays first, so the folder still sorts by time.

- Judge for the owner's site audience, not for craft alone: the frames a paying viewer would stop on.
- Cover both scenes and each scene's payoff (the band drawn down, the glimpse, the look back, the frontal finish).
- No two favorites of the same pose. The hero is always one of them.
- The `yt/` set has its own five favorites (Step 6).

On the vines film the six were 09.50, 19.75, 36.25, 40.50, 50.00 and 60.50 s.

## Step 6: YouTube squares in promo/yt/

For every website frame that can be cropped compliant, a square in `<round>/promo/yt/`, named like its source with `-yt.jpg`.

**YouTube's thumbnail policy treats a thumbnail that centres the groin or the buttocks as sexual content, whatever the video is.** So:

- **Front frames:** crop from the top of the frame to just above the waistband (or, nude, above the navel's lower edge). No garment pouch, no strip of band at the bottom edge.
- **Back frames:** crop from the top of the frame to just above the glutes.
- **No compliant crop worth posting** (a squat, a bend, a frame where cropping above the hips leaves only the back of a head): no square. Name it in the report.
- **Square, 1080 x 1080, JPG under 2 MB** (`-q:v 2` lands near 130 KB). The crop's side is the distance from the top of the frame to the cut line; centre it on his face and torso, keep the whole face inside, scale up with lanczos.
- **Place each crop by reading it.** Tile the shortlist with a 10 x 10 grid (`drawgrid=w=192:h=108:t=3:c=red@0.8` on 1920 x 1080) to read the cut line and his centre line, crop, then look at every square: a face cut at the edge, a sliver of band or the top of the glutes means recrop.
- **No text, no retouching.** The frame is the film's.

```bash
ffmpeg -nostdin -v error -y -i "$f" -vf "crop=$SIDE:$SIDE:$X:0,scale=1080:1080:flags=lanczos" -q:v 2 "yt/${f%.jpg}-yt.jpg"
```

### Five YouTube favorites

Mark exactly **5** squares by appending `-favorite` before `.jpg` (`06-19.75s-hand-on-chest-the-look-yt-favorite.jpg`). They are a community-post carousel (YouTube takes up to 5 images per post), so pick for YouTube's feed, not the site:

- Lead with the hero.
- Vary the mood: a quiet cover, the physique shot.
- Include a back frame that teases the second half without showing anything.
- End on the closing look.
- Five different poses. A website favorite is not automatically a YouTube favorite.

On the vines film they were 01, 06, 09, 12 and 15, posted hero first: 06, 01, 09, 12, 15.

YouTube's standard video thumbnail is 16:9 (1280 x 720). The squares are for Shorts, community posts and channel art; say so if the owner may be using them on a long-form upload.

## Step 7: the report

- A table in film order: number, time, the frame in words, its use, whether it has a YouTube square, with the hero in bold and the six favorites marked.
- One line per favorite on why it is one.
- The five YouTube favorites in posting order, one line each, and a note to check YouTube's 5-image limit on the upload screen.
- What was left out and why (blended frames, frames dropped up close), and which frames got no square.
- **The Mac line.** The owner's Mac reaches the Spark through the Host `dgx-spark-2025` in its `~/.ssh/config` (his `connect` / `spark` shell functions are built on it; a shell function cannot be used by `scp`, the Host can):

```bash
scp -r dgx-spark-2025:"<absolute path to promo>" ~/Downloads/<round-name>-promo
```

  If he says that Host no longer works, fall back to the address read that session (`whoami`, `hostname -I`), never from memory: `scp -r <user>@<address>:"<path>" …`.

## Never

- A square in `promo/yt/` that shows the garment pouch, the glutes or genitals.
- Pixel-level edits: no retouching, no brightness changes, no text. Cropping and scaling only.
- Deleting or overwriting anything in the round folder except an earlier `promo/` you made for that film.
