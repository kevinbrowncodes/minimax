import { dismissAnnouncement, openReferenceRemote, readSessionSignals } from "./browser.ts";
import { REFERENCE_URL } from "./config.ts";
import { CONFIRMATIONS_REQUIRED, classifySession, countConfirmation, type SessionState } from "./session.ts";

const TIMEOUT_MS = 15 * 60_000;
const POLL_MS = 2_000;
const PORT = Number(process.env["RECON_DEBUG_PORT"] ?? "9222");

/**
 * The Spark has no display (CHORE_005), so the owner signs in through Chromium's own remote-debugging screencast:
 * this script opens the reference in the persistent profile, headless, with the DevTools port published on the LAN;
 * the owner opens chrome://inspect on any Chrome, adds 192.168.1.33:9222 (the IP: Chromium refuses other Host headers),
 * presses "inspect" and signs in with GitHub
 * inside that window. Like recon:login, this script never types, never reads a cookie, and only polls the session
 * classifier until it reads signed in for several consecutive polls, then closes the browser so the profile is
 * written to disk. The port is open only while this script runs.
 */
async function main(): Promise<number> {
  console.log(`Opening ${REFERENCE_URL} headless in the recon profile, with Chromium's DevTools on port ${String(PORT)}.`);
  console.log("On your Mac, in Chrome: chrome://inspect/#devices → Configure… → add  192.168.1.33:" + String(PORT) + "  (the IP, not the name: Chromium refuses other Host headers) → under Remote Target press  inspect  on the agent.minimax.io page.");
  console.log("Sign in there with GitHub. This script never reads what you type. Waiting up to 15 minutes…");

  const { context, page, relay } = await openReferenceRemote(PORT);
  const deadline = Date.now() + TIMEOUT_MS;
  let state: SessionState = "unknown";
  let run = 0;
  let lastReported: SessionState | undefined;
  try {
    while (Date.now() < deadline) {
      try {
        await dismissAnnouncement(page);
        state = classifySession(await readSessionSignals(page));
      } catch {
        state = "unknown"; // mid-navigation; try again on the next tick
      }
      if (state !== lastReported) {
        console.log(`  … session reads as ${state}${state === "signed-in" ? ", confirming" : ""}`);
        lastReported = state;
      }
      run = countConfirmation(run, state);
      if (run >= CONFIRMATIONS_REQUIRED) break;
      await page.waitForTimeout(POLL_MS).catch(() => undefined);
    }
    if (run >= CONFIRMATIONS_REQUIRED) {
      // Give the site a moment to finish writing its session before the profile is flushed.
      await page.waitForTimeout(3_000).catch(() => undefined);
    }
  } finally {
    relay.close();
    await context.close();
  }

  if (run >= CONFIRMATIONS_REQUIRED) {
    console.log("Signed in. The session is saved in recon/.profile/ (gitignored). The DevTools port is closed.");
    return 0;
  }
  console.log(`Timed out after 15 minutes without reading as signed in (last state: ${state}).`);
  console.log("Run recon/login.sh again when you are ready to sign in.");
  return 1;
}

main().then(
  (code) => {
    process.exitCode = code;
  },
  (error: unknown) => {
    console.error("recon:login-remote failed:", error instanceof Error ? error.message : String(error));
    process.exitCode = 2;
  },
);
