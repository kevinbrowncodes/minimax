# CHORE_039 — Promo frames from a finished film

**Status:** Done (approved 2026-10-19 by the multiple-choice tool; committed the same session)
**Created:** 2026-10-19

## Summary

A project skill, `.claude/skills/promo-frames/SKILL.md`, that turns a finished film (the owner's final cut in a round folder under `test/`) into a shortlist of promo stills, the way the vines film was done by hand on 2026-10-19: 8 frames from scene 1 in `promo/`, the owner's verdict "these are really good".

## Why

The procedure has several steps that are easy to get wrong when done from memory, and two of them bit on the first run:

- The final cut arrives by copy from the Mac and is still growing when the owner hands over the path. A size check that waited 10 s passed while the file was 13 MB of 159 MB; only a clean full decode proved it complete.
- Promo means the platforms' rules, not the site's: the nude scene, the waistband pulls and a hand at the front of the garment are out, and the owner should hear that the outline through light briefs can limit reach on Instagram.

Written down once, every later film gets the same screen.

## Changes

- [x] `.claude/skills/promo-frames/SKILL.md`, Build stamp, covering:
  - Wait for the file: poll until `ffmpeg -v error -i <file> -f null -` prints nothing (a full clean decode), with a ceiling; never trust a stable size alone.
  - Host `ffmpeg`/`ffprobe` only (already on the Spark); nothing installed. Working files in the session scratchpad; only the chosen frames land in the round folder.
  - Read the round's `shot-list.md` and `scenes/` for what each shot does, then a 1 fps timestamped contact sheet of the whole cut to find the scene boundary and the beats.
  - The promo screen: scene 1 only (or whatever is clothed); out are nude frames, waistband pulls, a hand at the front of the garment, motion blur, half blinks, an open mouth mid-word, warped hands, a camera move in progress.
  - A 4 fps contact sheet per safe window, then 10 to 12 candidates exported at full resolution with `-ss` before `-i`, and a review sheet; look at the hero frame at full size.
  - The shortlist: 6 to 10 frames copied to `<round>/promo/` saved as JPEG (owner, 2026-10-19) and named `NN-<seconds>s-<pose>.jpg`, numbered in the order they occur in the film (owner, 2026-10-19), each with its use (hero, cover, scroll-stopper, carousel, backup); the hero is marked in the report.
  - Square YouTube thumbnails (owner, 2026-10-19): every shortlisted frame also as a 1080 x 1080 JPG in `<round>/promo/yt/`, cropped waist up so the garment is never in frame, each square looked at before it is kept.
  - The report: a table of the frames, what was left out and why, the reach caveat when the garment shows an outline, the offer of 4:5 crops (by the multiple-choice tool), and the `scp` line for the Mac through the owner's `~/.ssh/config` Host `dgx-spark-2025` (his `connect`/`spark` functions wrap it; scp cannot call a shell function), falling back to the address read that session (`hostname -I`), never from memory.
- [x] `README.md` › Project Structure: `.claude/skills/` lists the new skill.

## Testing

- **Unit / integration / e2e:** not applicable — a skill read by the assistant; no runtime code, nothing the app or the tests read. The pre-push hook still runs the full gate on the push.
- **Manual verification:** run the skill on the vines film (`test/26-10-19-1600-vines/`) and confirm it reproduces a shortlist matching the hand-picked 8 (same hero frame at 19.75 s, none from 31 s on).

## Done note

Manual verification, 2026-10-19: a fresh agent ran the skill from its text alone on the vines film, writing to the scratchpad. It found the same hero (19.75 s), kept nothing past 27 s, excluded the crossfade frame at 30.75 s, and every command ran verbatim. Its five findings were folded in before the commit: the hero timestamp removed from the reference (it anchored the reader), the hand-at-the-front rule given its threshold from the owner's kept frames, zero-padded candidate names so sheets sort by time, the decode loop wrapped in `bash -c`, and the crossfade warning. The owner's later asks landed in the same chore: film-order numbering, JPEG output, and the square YouTube thumbnails in `promo/yt/` (8 made for the vines film, each looked at; 3 recropped).
