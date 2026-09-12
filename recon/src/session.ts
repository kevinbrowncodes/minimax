/**
 * Decides whether the recon browser is signed in to the reference.
 *
 * Pure on purpose. Three signals: the page's final URL, whether the home has
 * rendered (the "New task" sidebar item is visible), and whether a control
 * reading exactly "Sign in" is visible. Observed 2026-09-12 (logged out): the
 * home shows "Sign in" in the sidebar and top right. Its absence on a
 * RENDERED reference page is read as signed in.
 *
 * The render signal exists because the first login attempt (2026-09-12) read
 * "signed in" off a page that was still loading — on the reference origin,
 * nothing rendered yet, so no "Sign in" control — and closed the browser
 * before the owner had signed in. A page that has not rendered is unknown.
 */

export const REFERENCE_ORIGIN = "https://agent.minimax.io";

export type SessionSignals = {
  /** The page's final URL after load (may be off-origin mid-OAuth). */
  url: string;
  /** Whether the home has rendered: the "New task" sidebar item is visible. */
  homeRendered: boolean;
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
  if (!signals.homeRendered) return "unknown";
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

/**
 * The login loop only trusts "signed in" once it has held for this many
 * consecutive polls, so a transient render gap cannot end the login early.
 */
export const CONFIRMATIONS_REQUIRED = 3;

/** Feeds one reading into a run counter; returns the new run length for signed-in, else 0. */
export function countConfirmation(previousRun: number, state: SessionState): number {
  return state === "signed-in" ? previousRun + 1 : 0;
}
