import { describe, expect, it } from "vitest";
import { classifySession, exitCodeFor } from "./session.js";

describe("classifySession", () => {
  it("reads a visible Sign in control on the reference as signed out", () => {
    expect(classifySession({ url: "https://agent.minimax.io/", signInControlVisible: true })).toBe("signed-out");
  });

  it("reads the reference with no Sign in control as signed in", () => {
    expect(classifySession({ url: "https://agent.minimax.io/", signInControlVisible: false })).toBe("signed-in");
  });

  it("still counts the reference when the URL carries a path", () => {
    expect(classifySession({ url: "https://agent.minimax.io/some/task", signInControlVisible: false })).toBe("signed-in");
    expect(classifySession({ url: "https://agent.minimax.io/some/task", signInControlVisible: true })).toBe("signed-out");
  });

  it("cannot tell on another origin, such as github.com mid-OAuth", () => {
    expect(classifySession({ url: "https://github.com/login/oauth/authorize", signInControlVisible: false })).toBe("unknown");
    expect(classifySession({ url: "https://www.minimax.io/", signInControlVisible: true })).toBe("unknown");
  });

  it("cannot tell from an unparsable URL", () => {
    expect(classifySession({ url: "about:blank", signInControlVisible: false })).toBe("unknown");
    expect(classifySession({ url: "", signInControlVisible: false })).toBe("unknown");
  });
});

describe("exitCodeFor", () => {
  it("maps the three states to 0, 1 and 2", () => {
    expect(exitCodeFor("signed-in")).toBe(0);
    expect(exitCodeFor("signed-out")).toBe(1);
    expect(exitCodeFor("unknown")).toBe(2);
  });
});
