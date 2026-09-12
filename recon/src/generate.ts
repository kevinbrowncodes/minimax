import { appendFileSync, copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Locator, Page } from "playwright";
import { frameState, frameToKeep, isResultControl, looksFailed, looksOutOfCredits, smallestDuration, type CaptureModel } from "./generate-plan.ts";
import { sanitizePath } from "./network-log.ts";

/**
 * STORY_002 part 2: spends the owner-approved generations on the reference to
 * capture the submitted, generating, done, download, Assets and cancelled
 * states. Everything it sees on the task page is dumped to recon/out for
 * STORY_004. It stops before the second generation if the first diverged.
 */

export type GenerateDeps = {
  page: Page;
  rawDir: string;
  docsDir: string;
  shot: (state: string, note?: string) => Promise<void>;
  step: (state: string, run: () => Promise<void>) => Promise<boolean>;
  gotoHome: () => Promise<void>;
  enterVideoMode: () => Promise<void>;
  clearComposer: () => Promise<boolean>;
  editor: () => Locator;
  paramsButton: () => Locator;
  modelButton: () => Locator;
  model: CaptureModel;
};

const PROMPTS = [
  "A small paper boat drifting across a rain puddle in soft morning light, gentle ripples, camera slowly pushing in.",
  "A single candle on a wooden table, the flame swaying in a light draft, warm light on the grain, slow tilt up.",
];

const POLL_MS = 10_000;
const MAX_WAIT_MS = 20 * 60_000;

function log(deps: GenerateDeps, line: string): void {
  console.log(`  ${line}`);
  appendFileSync(path.join(deps.rawDir, "generate-log.txt"), `${new Date().toISOString()} ${line}\n`);
}

async function dumpControls(deps: GenerateDeps, label: string): Promise<string> {
  const { page } = deps;
  const dump = await page
    .evaluate(() => {
      const vis = (e: Element) => {
        const r = e.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      };
      const controls = Array.from(document.querySelectorAll("button, a, [role=button], [role=tab], video, audio, progress, [role=progressbar]"))
        .filter(vis)
        .map((e) => {
          const r = e.getBoundingClientRect();
          const t = (e.getAttribute("aria-label") || e.getAttribute("title") || e.textContent || "").trim().replace(/\s+/g, " ").slice(0, 60);
          const extra = e.tagName === "VIDEO" ? ` src-host=${(() => { try { return new URL((e as HTMLVideoElement).currentSrc || (e as HTMLVideoElement).src || "").host; } catch { return "?"; } })()} ready=${(e as HTMLVideoElement).readyState}` : "";
          return `${e.tagName.toLowerCase()}${e.getAttribute("role") ? `[${e.getAttribute("role")}]` : ""} "${t}" @${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}${extra}`;
        });
      const main = (document.querySelector("main") ?? document.body) as HTMLElement;
      return { path: location.pathname, controls, text: main.innerText.replace(/\s+/g, " ").slice(0, 1500) };
    })
    .catch(() => ({ path: "", controls: [] as string[], text: "" }));
  writeFileSync(path.join(deps.rawDir, `task-${label}.json`), `${JSON.stringify(dump, null, 2)}\n`);
  return dump.text;
}

async function selectModel(deps: GenerateDeps): Promise<void> {
  const { page } = deps;
  if (deps.model === "h3") return; // the reference's default
  await deps.modelButton().click({ timeout: 10_000 });
  await page.waitForTimeout(600);
  await page.getByText(/^hailuo-2\.3$/i).first().click({ timeout: 5_000 });
  await page.waitForTimeout(800);
  const label = await deps.modelButton().getAttribute("aria-label").catch(() => null);
  log(deps, `model set: ${label ?? "(no aria-label)"}`);
  if (!/hailuo/i.test(label ?? "")) throw new Error(`model did not take: ${label}`);
}

async function setCheapParams(deps: GenerateDeps): Promise<void> {
  const { page } = deps;
  await deps.paramsButton().click({ timeout: 10_000 });
  await page.waitForTimeout(600);
  await page.getByRole("radio", { name: /^16:9$/ }).click({ timeout: 5_000 }).catch(() => undefined);
  await page.getByRole("radio", { name: /^768P$/i }).click({ timeout: 5_000 }).catch(() => undefined);
  const labels = await page.getByRole("radio").allInnerTexts().catch(() => [] as string[]);
  const duration = smallestDuration(labels);
  if (!duration) throw new Error(`no duration radios found among: ${labels.join(", ")}`);
  await page.getByRole("radio", { name: new RegExp(`^${duration}$`) }).click({ timeout: 5_000 });
  await page.waitForTimeout(300);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
  const label = await deps.paramsButton().getAttribute("aria-label").catch(() => null);
  log(deps, `parameters set: ${label ?? "(no aria-label)"} (smallest duration available: ${duration})`);
  if (!/768P/i.test(label ?? "") || !label?.includes(duration)) throw new Error(`parameters did not take: ${label}`);
}

async function submit(deps: GenerateDeps, prompt: string): Promise<{ startedAt: number; taskPath: string }> {
  const { page } = deps;
  await deps.gotoHome();
  await deps.enterVideoMode();
  if (!(await deps.clearComposer())) throw new Error("composer not empty before submit");
  await deps.enterVideoMode();
  await selectModel(deps);
  await setCheapParams(deps);
  await deps.editor().click({ timeout: 10_000 });
  await page.keyboard.press("End");
  await page.keyboard.type(prompt, { delay: 5 });
  await page.waitForTimeout(800);
  const send = page.getByRole("button", { name: /send message/i }).first();
  await send.waitFor({ state: "visible", timeout: 5_000 });
  const startedAt = Date.now();
  await send.click({ timeout: 10_000 });
  log(deps, "Send clicked");
  await page.waitForURL((u) => new URL(u).pathname !== "/", { timeout: 30_000 }).catch(() => log(deps, "URL did not change within 30 s after Send"));
  await page.waitForTimeout(1_500);
  const taskPath = sanitizePath(page.url());
  log(deps, `task path pattern: ${taskPath}`);
  return { startedAt, taskPath };
}

async function findVideo(page: Page): Promise<Locator | null> {
  const videos = page.locator("video");
  const count = await videos.count();
  for (let i = 0; i < count; i += 1) {
    const v = videos.nth(i);
    const src = await v.evaluate((el) => (el as HTMLVideoElement).currentSrc || (el as HTMLVideoElement).src || el.querySelector("source")?.getAttribute("src") || "").catch(() => "");
    if (src) return v;
  }
  return null;
}

async function waitForResult(deps: GenerateDeps, label: string, startedAt: number): Promise<{ outcome: "done" | "failed" | "timeout"; elapsedSeconds: number }> {
  const { page } = deps;
  const framesDir = path.join(deps.rawDir, "frames");
  mkdirSync(framesDir, { recursive: true });
  const kept: number[] = [];
  let tick = 0;
  for (;;) {
    const elapsed = Math.round((Date.now() - startedAt) / 1000);
    await page.screenshot({ path: path.join(framesDir, `${label}-${String(elapsed).padStart(4, "0")}s.png`) }).catch(() => undefined);
    const text = await dumpControls(deps, `${label}-${String(elapsed).padStart(4, "0")}s`);
    const video = await findVideo(page);
    if (video) {
      log(deps, `video element with a source appeared after ${elapsed} s`);
      return { outcome: "done", elapsedSeconds: elapsed };
    }
    if (looksFailed(text)) {
      const credits = looksOutOfCredits(text);
      log(deps, `failure wording seen after ${elapsed} s${credits ? " — a credits problem" : ""}`);
      if (credits) {
        await deps.shot("task-rejected-insufficient-credits", `the agent reports the provider refused the H3 job for lack of credits, ${elapsed} s after Send`);
        return { outcome: "failed", elapsedSeconds: elapsed };
      }
      if (elapsed < 30 && (await tryRetryOnce(deps))) {
        log(deps, "clicked Retry once; continuing to wait");
        await page.waitForTimeout(POLL_MS);
        continue;
      }
      return { outcome: "failed", elapsedSeconds: elapsed };
    }
    const mark = frameToKeep(elapsed, kept);
    if (mark !== null) {
      kept.push(mark);
      await deps.shot(frameState(mark), `${label}, ${elapsed} s after Send`);
    }
    if (Date.now() - startedAt > MAX_WAIT_MS) return { outcome: "timeout", elapsedSeconds: elapsed };
    tick += 1;
    if (tick % 6 === 0) log(deps, `still generating after ${elapsed} s`);
    await page.waitForTimeout(POLL_MS);
  }
}

let retried = false;

/** The task page offers a Retry on a failed request; press it once, so a transient failure does not end the run. */
async function tryRetryOnce(deps: GenerateDeps): Promise<boolean> {
  if (retried) return false;
  const retry = deps.page.getByRole("button", { name: /^retry$/i }).first();
  if (!(await retry.isVisible().catch(() => false))) return false;
  retried = true;
  await deps.shot("task-request-failed", "the task page right after a failed request, before Retry");
  await retry.click({ timeout: 5_000 }).catch(() => undefined);
  return true;
}

async function captureResultControls(deps: GenerateDeps): Promise<void> {
  const { page } = deps;
  const video = await findVideo(page);
  if (video) {
    const box = await video.boundingBox().catch(() => null);
    log(deps, `video box: ${box ? `${Math.round(box.width)}x${Math.round(box.height)} at ${Math.round(box.x)},${Math.round(box.y)}` : "none"}`);
    await video.hover({ timeout: 5_000 }).catch(() => undefined);
    await page.waitForTimeout(800);
    await deps.shot("result-hover", "pointer over the result video");
    const src = await video.evaluate((el) => (el as HTMLVideoElement).currentSrc || (el as HTMLVideoElement).src || "").catch(() => "");
    try {
      const host = new URL(src).host;
      log(deps, `video source host: ${host}`);
      const response = await page.request.get(src).catch(() => null);
      if (response?.ok()) {
        const body = await response.body();
        writeFileSync(path.join(deps.rawDir, "result-1.mp4"), body);
        log(deps, `result saved to recon/out (${Math.round(body.byteLength / 1024)} KB, ${response.headers()["content-type"] ?? "?"})`);
      }
    } catch {
      log(deps, "video source could not be parsed or fetched");
    }
  }
  const downloads = page.getByRole("button", { name: /download/i }).or(page.locator("a[download]")).or(page.getByRole("link", { name: /download/i }));
  const count = await downloads.count();
  for (let i = 0; i < count; i += 1) {
    const box = await downloads.nth(i).boundingBox().catch(() => null);
    if (isResultControl(box)) {
      await downloads.nth(i).hover({ timeout: 3_000 }).catch(() => undefined);
      await page.waitForTimeout(500);
      await deps.shot("result-download", "a download control below the header, hovered");
      log(deps, `download control found at y=${Math.round(box?.y ?? 0)}`);
      return;
    }
  }
  log(deps, "no download control found below the header; result-download not captured");
}

async function tryCancel(deps: GenerateDeps): Promise<boolean> {
  const { page } = deps;
  const named = page.getByRole("button", { name: /stop|cancel|abort|terminate/i }).first();
  if (await named.isVisible().catch(() => false)) {
    const name = await named.getAttribute("aria-label").catch(() => null);
    log(deps, `cancel control: "${name ?? (await named.textContent().catch(() => ""))?.trim()}"`);
    await named.click({ timeout: 5_000 });
    return true;
  }
  log(deps, "no control named stop/cancel/abort found");
  return false;
}

export async function runGenerations(deps: GenerateDeps, approved: number): Promise<void> {
  mkdirSync(deps.rawDir, { recursive: true });
  log(deps, `part 2 start: ${approved} generation(s) approved, model ${deps.model}`);

  let firstOk = false;
  await deps.step("task-submitted", async () => {
    const { startedAt, taskPath } = await submit(deps, PROMPTS[0] ?? "");
    await deps.shot("task-submitted", `right after Send; path pattern ${taskPath}`);
    const result = await waitForResult(deps, "gen1", startedAt);
    log(deps, `generation 1: ${result.outcome} after ${result.elapsedSeconds} s`);
    if (result.outcome === "done") {
      await page_settle(deps.page);
      await deps.shot("task-done", `result visible ${result.elapsedSeconds} s after Send`);
      await captureResultControls(deps);
      firstOk = true;
    } else {
      await deps.shot(result.outcome === "failed" ? "task-failed" : "task-timeout", `${result.outcome} after ${result.elapsedSeconds} s`);
    }
  });

  await deps.step("assets-one-video", async () => {
    await deps.page.goto("https://agent.minimax.io/assets", { waitUntil: "domcontentloaded", timeout: 60_000 });
    await deps.page.waitForTimeout(2_500);
    await deps.page.getByRole("button", { name: /^videos$/i }).first().click({ timeout: 10_000 }).catch(() => undefined);
    await deps.page.waitForTimeout(1_500);
    await deps.shot("assets-one-video", "Assets with the Videos filter after generation 1");
    await dumpControls(deps, "assets-after-gen1");
  });

  await deps.step("home-with-recents", async () => {
    await deps.gotoHome();
    await deps.shot("home-with-recents", "sidebar Recents after generation 1");
  });

  if (approved < 2) return;
  if (!firstOk) {
    log(deps, "first generation did not finish cleanly; not spending the second");
    return;
  }

  await deps.step("task-cancelled", async () => {
    const { startedAt } = await submit(deps, PROMPTS[1] ?? "");
    await deps.page.waitForTimeout(8_000);
    await deps.shot("task-generating-before-cancel", `${Math.round((Date.now() - startedAt) / 1000)} s after Send`);
    await dumpControls(deps, "gen2-before-cancel");
    const cancelled = await tryCancel(deps);
    await deps.page.waitForTimeout(3_000);
    await deps.shot(cancelled ? "task-cancelled" : "task-no-cancel-control", cancelled ? "after clicking the cancel control" : "no cancel control was found; the job was left running");
    await dumpControls(deps, "gen2-after-cancel");
    if (!cancelled) {
      const result = await waitForResult(deps, "gen2", startedAt);
      log(deps, `generation 2 (uncancelled): ${result.outcome} after ${result.elapsedSeconds} s`);
    }
  });
}

async function page_settle(page: Page): Promise<void> {
  await page.waitForTimeout(1_500);
}
