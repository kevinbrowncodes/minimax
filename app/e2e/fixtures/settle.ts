import type { Page } from "@playwright/test";

/** Wait until nothing is animating and two frames have painted, so nothing is measured mid-transition (CLAUDE.md §6 rule 9). */
export async function settled(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await Promise.all(document.getAnimations().map((animation) => animation.finished.catch(() => undefined)));
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          resolve();
        });
      });
    });
  });
}
