// Runs once when the Next.js server starts (STORY_007). The check lives in a Node-only module loaded behind the
// NEXT_RUNTIME guard, the pattern Next documents, so the Edge bundle never sees process.exit. STORY_042: the same
// hook starts the queue's ticker — the runner every QUEUE_TICK_MS (default 30 s; 0 disables it, as the gate's
// Playwright server does), so a queued request goes at its time with no browser open.
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { assertConfigOrExit } = await import("./lib/startup-check");
    assertConfigOrExit();
    const { startQueueTicker } = await import("./lib/queue-ticker");
    const { submitDue } = await import("./lib/queue-runner");
    const raw = process.env.QUEUE_TICK_MS;
    startQueueTicker({ intervalMs: raw === undefined || raw === "" ? 30_000 : Number(raw), run: () => submitDue() });
  }
}
