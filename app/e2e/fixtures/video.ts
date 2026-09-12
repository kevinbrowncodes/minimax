import { expect, type Locator } from "@playwright/test";

/** HAVE_CURRENT_DATA — the element has decoded the current frame. */
const HAVE_CURRENT_DATA = 2;

/**
 * A playable result is asserted through the video element's readiness, never its pixels (CLAUDE.md §6b):
 * readyState ≥ HAVE_CURRENT_DATA (or the canplay event within the timeout), and the element plays the result route.
 */
export async function expectPlayable(video: Locator, resultPath: string, timeout = 15_000): Promise<void> {
  await expect(video).toBeVisible();
  const ready = await video.evaluate(
    (el: HTMLVideoElement, args: { min: number; timeout: number }) =>
      new Promise<number>((resolve) => {
        if (el.readyState >= args.min) {
          resolve(el.readyState);
          return;
        }
        const timer = setTimeout(() => {
          resolve(el.readyState);
        }, args.timeout);
        el.addEventListener(
          "canplay",
          () => {
            clearTimeout(timer);
            resolve(el.readyState);
          },
          { once: true },
        );
      }),
    { min: HAVE_CURRENT_DATA, timeout },
  );
  expect(ready, "video element never reached HAVE_CURRENT_DATA").toBeGreaterThanOrEqual(HAVE_CURRENT_DATA);
  const src = await video.evaluate((el: HTMLVideoElement) => el.currentSrc || el.src);
  expect(src).toContain(resultPath);
}
