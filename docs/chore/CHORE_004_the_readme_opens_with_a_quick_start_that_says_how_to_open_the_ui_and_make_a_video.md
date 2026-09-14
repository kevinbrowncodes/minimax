# CHORE_004 — The README opens with a quick start that says how to open the UI and make a video

**Status:** Done (2026-09-14)
**Created:** 2026-09-14 (owner's request)

## Summary

The README explains what the project is and how each part is built, but never says the one thing a person needs first: **the URL to open, and what to click**. The owner asked for a quick start. This chore adds a **Quick Start** section directly under the intro — the LAN URL, the steps to make a video, the steps to extend one, when the GPU half has to be running, what a run costs in time and memory, and a symptom → cause → fix table — and replaces two statements that are no longer true.

## Why

Every fact needed to use the thing was spread across Running the UI, Running the Model, `spark/README.md` and three tickets. The owner is the person opening the browser; the README's first screen should be enough for that. The two stale statements (the `greenfield … nothing below is decided yet` status line from 2026-09-12, and `Features: TBD`) said the opposite of what the repo now does, directly above where the quick start belongs.

## Changes

- [x] `README.md`: new **Quick Start** section after the intro — the UI's URL (`http://spark-1.local:3000`, the Spark's mDNS name, with `http://192.168.1.33:3000` as the fallback for devices that do not resolve `.local`), making a video, extending one, the model's run/stop/verify commands, measured times and memory, a troubleshooting table, and where the deeper sections are.
- [x] `README.md`: the 2026-09-12 `greenfield` status line replaced with the current one (all four epics done; what runs).
- [x] `README.md`: **Features** — the TBD replaced with what the UI actually has, each pointing at the story that built it.

## Testing

- **Unit / integration / e2e: not applicable** — documentation only; no runtime code, no test, no gate step changed. The facts asserted were verified on the Spark this session rather than recalled ([CLAUDE.md → §3 item 8](../../CLAUDE.md#3-how-features-are-built-important)): the LAN address and interface (`ip -4 -o addr`), the hostname and mDNS (`hostnamectl`, `systemctl is-active avahi-daemon`, `avahi-resolve -n spark-1.local`, and an HTTP 200 from the UI on that name), the published ports and restart policies (`docker ps`, `docker inspect`), the three container names, and the commands' own usage headers. Times and memory come from STORY_016's Done note and STORY_005/006's measurements.
