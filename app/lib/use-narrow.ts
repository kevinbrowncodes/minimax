"use client";
import { useEffect, useState } from "react";

/** True below the sidebar breakpoint (900 px, tokens.md › breakpoints). SSR and jsdom default to false. */
export function useNarrow(query = "(max-width: 899px)"): boolean {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const media = window.matchMedia(query);
    const update = (): void => {
      setNarrow(media.matches);
    };
    update();
    media.addEventListener("change", update);
    return () => {
      media.removeEventListener("change", update);
    };
  }, [query]);
  return narrow;
}
