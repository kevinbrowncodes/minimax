// Runs once when the Next.js server starts (STORY_007). The check lives in a Node-only module loaded behind the
// NEXT_RUNTIME guard, the pattern Next documents, so the Edge bundle never sees process.exit.
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { assertConfigOrExit } = await import("./lib/startup-check");
    assertConfigOrExit();
  }
}
