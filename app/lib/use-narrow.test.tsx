import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useNarrow } from "./use-narrow";

type Listener = (event: MediaQueryListEvent) => void;

function mockMatchMedia(matches: boolean): { fire: (matches: boolean) => void } {
  const listeners = new Set<Listener>();
  const media = {
    matches,
    media: "(max-width: 899px)",
    addEventListener: (_: "change", listener: Listener) => listeners.add(listener),
    removeEventListener: (_: "change", listener: Listener) => listeners.delete(listener),
  };
  vi.stubGlobal("matchMedia", () => media);
  return {
    fire: (next: boolean) => {
      media.matches = next;
      const event: Pick<MediaQueryListEvent, "matches"> = { matches: next };
      for (const l of listeners) l(event as MediaQueryListEvent);
    },
  };
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("useNarrow", () => {
  it("reads matchMedia on mount and follows change events", () => {
    const { fire } = mockMatchMedia(false);
    const { result } = renderHook(() => useNarrow());
    expect(result.current).toBe(false);
    act(() => {
      fire(true);
    });
    expect(result.current).toBe(true);
  });

  it("stays false where matchMedia does not exist (SSR, old jsdom)", () => {
    vi.stubGlobal("matchMedia", undefined);
    const { result } = renderHook(() => useNarrow());
    expect(result.current).toBe(false);
  });
});
