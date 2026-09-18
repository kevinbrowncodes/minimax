# BACKLOG_011 — Retrying one segment of a chain re-chains the rest

**Status:** Promoted (2026-09-18 06:15 EDT) — the owner chose the first remedy; it is [STORY_056](../story/STORY_056_retry_rechains_the_rest.md), which stays Proposed until he approves the draft. The second remedy (a cut at a join fails the segment) is withdrawn with the choice; the third (the strip's rows showing each segment's outcome) stays here, open. Found on the second chain of the night (STORY_053's Addendum 2)
**Created:** 2026-09-18

## Summary

A chain's segments go out as extensions of one another (STORY_044 / STORY_053). When the shot-change check flags a cut at a join — as it did at frame 243 of `7b2636b9`, the second segment of the straight-through chain of 2026-09-18 (the extension reset the framing to a frontal desk-level shot; the seam measure read a mean diff of 80 against the footage's largest 6.4) — the task page's **Retry** redraws that one segment with a new seed as a fresh extension of its source, but the segment queued behind it (`c09bc6fa`, segment 3) is already an extension of the **bad** draw and runs on it. The redraw hangs loose: segment 3 has to be re-sent by hand as an extension of the new segment 2 (the composer in extend mode with segment 3's text), and the history shows two chains where the owner meant one.

## User impact

The one-in-ten join that cuts costs the owner three hand steps and 67 min of GPU on a segment he will throw away; the "attach, Send, read, Send all" promise of the chain director ends at the first bad seam.

## Rough scope

- ~~On a chain segment's page, **Retry** offers *Retry this segment and re-chain the rest*: cancel (or leave, if already done) the segments after it, redraw this one, and queue the later segments again as extensions of the redraw — their prompts are in history.~~ → STORY_056.
- ~~Or, cheaper: the queue runner refuses to start a waiting extension whose source finished **with a cut at its join**, and says so in Scheduled (*waiting for a clean draw of segment 2*), so a Retry of the source re-attaches the line automatically.~~ Withdrawn 2026-09-18: the owner chose the first remedy.
- The strip's rows could show each segment's outcome after Send all (done / cut at the join / waiting).

## Dependencies

STORY_020's Retry and shot-change check; STORY_043's line (an extension waits for its source); STORY_044 / STORY_053's chains; BUG_009's poll rule.

## Open questions

- Should a cut at a join fail the segment outright (status *failed* with the cut as the reason) rather than *done* with a notice? That would let the line's existing "a failed source" rule do the work.
- Does the owner want the automatic redraw (one seed, then stop) or only the manual one?

## Priority

Medium — it is the first thing he will hit on the day a chain cuts, and the night's two chains cut once in six joins.
