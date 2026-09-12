import { describe, expect, it } from "vitest";
import { CONFIRMATIONS_REQUIRED, classifySession, countConfirmation, exitCodeFor } from "./session.js";

const home = "https://agent.minimax.io/";

describe("classifySession", () => {
  it("reads a rendered reference page with a visible Sign in control as signed out", () => {
    expect(classifySession({ url: home, homeRendered: true, signInControlVisible: true })).toBe("signed-out");
  });

  it("reads a rendered reference page with no Sign in control as signed in", () => {
    expect(classifySession({ url: home, homeRendered: true, signInControlVisible: false })).toBe("signed-in");
  });

  it("cannot tell from a reference page that has not rendered, even with no Sign in control", () => {
    // The first login attempt read this loading state as signed in and closed the browser early.
    expect(classifySession({ url: home, homeRendered: false, signInControlVisible: false })).toBe("unknown");
    expect(classifySession({ url: home, homeRendered: false, signInControlVisible: true })).toBe("unknown");
  });

  it("still counts the reference when the URL carries a path", () => {
    const task = "https://agent.minimax.io/some/task";
    expect(classifySession({ url: task, homeRendered: true, signInControlVisible: false })).toBe("signed-in");
    expect(classifySession({ url: task, homeRendered: true, signInControlVisible: true })).toBe("signed-out");
  });

  it("cannot tell on another origin, such as github.com mid-OAuth", () => {
    expect(classifySession({ url: "https://github.com/login/oauth/authorize", homeRendered: true, signInControlVisible: false })).toBe("unknown");
    expect(classifySession({ url: "https://www.minimax.io/", homeRendered: true, signInControlVisible: true })).toBe("unknown");
  });

  it("cannot tell from an unparsable URL", () => {
    expect(classifySession({ url: "about:blank", homeRendered: false, signInControlVisible: false })).toBe("unknown");
    expect(classifySession({ url: "", homeRendered: true, signInControlVisible: false })).toBe("unknown");
  });
});

describe("countConfirmation", () => {
  it("grows only on consecutive signed-in readings and resets on anything else", () => {
    let run = 0;
    run = countConfirmation(run, "signed-in");
    run = countConfirmation(run, "signed-in");
    expect(run).toBe(2);
    run = countConfirmation(run, "unknown");
    expect(run).toBe(0);
    run = countConfirmation(run, "signed-in");
    expect(run).toBe(1);
    run = countConfirmation(run, "signed-out");
    expect(run).toBe(0);
  });

  it("needs more than one confirmation, so a single render gap cannot end the login", () => {
    expect(CONFIRMATIONS_REQUIRED).toBeGreaterThan(1);
    expect(countConfirmation(0, "signed-in")).toBeLessThan(CONFIRMATIONS_REQUIRED);
  });
});

describe("exitCodeFor", () => {
  it("maps the three states to 0, 1 and 2", () => {
    expect(exitCodeFor("signed-in")).toBe(0);
    expect(exitCodeFor("signed-out")).toBe(1);
    expect(exitCodeFor("unknown")).toBe(2);
  });
});
