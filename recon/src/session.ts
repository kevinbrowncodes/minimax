/**
 * Decides whether the recon browser is signed in to the reference.
 *
 * Pure on purpose: the only two signals are the page's final URL and whether a
 * control reading exactly "Sign in" is visible. Observed 2026-09-12 (logged
 * out): the home page shows that control in the sidebar and the top-right
 * corner. Its absence on the reference origin is read as signed in — inferred
 * from the logged-out capture only; STORY_002 confirms and tightens this once
 * an authenticated run shows what actually replaces the control.
 */

export const REFERENCE_ORIGIN = "https://agent.minimax.io";

export type SessionSignals = {
  /** The page's final URL after load (may be off-origin mid-OAuth). */
  url: string;
  /** Whether an element whose text is exactly "Sign in" is visible. */
  signInControlVisible: boolean;
};

export type SessionState = "signed-in" | "signed-out" | "unknown";

export function classifySession(signals: SessionSignals): SessionState {
  let origin: string;
  try {
    origin = new URL(signals.url).origin;
  } catch {
    return "unknown";
  }
  if (origin !== REFERENCE_ORIGIN) return "unknown";
  return signals.signInControlVisible ? "signed-out" : "signed-in";
}

const EXIT_CODES: Record<SessionState, number> = {
  "signed-in": 0,
  "signed-out": 1,
  unknown: 2,
};

export function exitCodeFor(state: SessionState): number {
  return EXIT_CODES[state];
}
