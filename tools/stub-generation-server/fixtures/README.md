# Stub fixtures

The only videos allowed in git (`.gitignore` excepts `tools/**/fixtures/*.mp4|*.webm`). Tiny, synthetic, generated on the Spark on 2026-09-12 with the box's ffmpeg 6.1.1 (`ffmpeg -version`), from the repo's `tools/stub-generation-server/fixtures/` directory:

```bash
# 2 s test pattern with a 440 Hz tone, 320x180 at 24 fps — H.264 baseline + AAC, what the real server produces
ffmpeg -y -f lavfi -i "testsrc2=size=320x180:rate=24" -f lavfi -i "sine=frequency=440:sample_rate=32000" -t 2 \
  -c:v libx264 -preset veryslow -crf 30 -pix_fmt yuv420p -profile:v baseline -level 3.0 -c:a aac -b:a 48k -ac 2 \
  -movflags +faststart -shortest fixture.mp4
# the same content as VP9 + Opus, for browsers without an H.264 decoder (Playwright's Chromium)
ffmpeg -y -f lavfi -i "testsrc2=size=320x180:rate=24" -f lavfi -i "sine=frequency=440:sample_rate=32000" -t 2 \
  -c:v libvpx-vp9 -b:v 150k -pix_fmt yuv420p -c:a libopus -b:a 48k -ac 2 -shortest fixture.webm
# poster: the frame at 1 s
ffmpeg -y -ss 1 -i fixture.mp4 -frames:v 1 fixture-poster.png
# a 512x512 image to upload as a reference in specs
ffmpeg -y -f lavfi -i "testsrc2=size=512x512:rate=1" -frames:v 1 fixture-reference.png
```

`manifest.json` (duration, size, codecs per file) was written by `ffprobe` at the same time; the stub reads it at startup for the `result` it reports, and reads each file's byte size from the file itself. Which of `fixture.mp4` / `fixture.webm` the stub serves by default is settled by STORY_010's codec probe (`STUB_FIXTURE=mp4|webm`).
