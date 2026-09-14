/** Pure reducers that turn the raw network log (recon/out) into STORY_004's interaction notes. */

import { placeholderIds, type NetworkEvent } from "./network-log.ts";

const STATIC_EXT = /\.(js|css|png|jpe?g|webp|gif|svg|ico|woff2?|ttf|map)$/i;
const STATIC_HOSTS = /^(cdn\.hailuo\.ai|filecdn\.minimax\.chat|file\.cdn\.minimax\.io|cdn\.hailuoai\.(video|com)|agent-cdn\.minimax\.io)$/;

/** True for the product's own API traffic, false for static assets, pages and CDN media. */
export function isApiEvent(e: Pick<NetworkEvent, "host" | "path" | "contentType">): boolean {
  if (STATIC_HOSTS.test(e.host)) return false;
  if (STATIC_EXT.test(e.path)) return false;
  if ((e.contentType ?? "").startsWith("text/html")) return false;
  return true;
}

/** A value's shape: keys with type names, values redacted, depth-limited. Strings become "string" so no content leaks. */
export function shapeOf(value: unknown, depth = 0, maxDepth = 4): unknown {
  if (depth >= maxDepth) return "…";
  if (value === null) return "null";
  if (Array.isArray(value)) return value.length ? [shapeOf(value[0], depth + 1, maxDepth)] : [];
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>).slice(0, 16)) out[k] = shapeOf(v, depth + 1, maxDepth);
    return out;
  }
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") return "number";
  if (typeof value === "string") return "string";
  return typeof value;
}

export type Endpoint = {
  method: string;
  host: string;
  path: string;
  count: number;
  statuses: Record<string, number>;
  contentTypes: string[];
  medianGapSeconds: number | null;
  responseShape: unknown;
};

/** Median seconds between consecutive timestamps, or null with fewer than two. */
export function medianGapSeconds(isoTimes: string[]): number | null {
  const t = isoTimes.map((s) => Date.parse(s)).filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (t.length < 2) return null;
  const gaps: number[] = [];
  for (let i = 1; i < t.length; i += 1) gaps.push((t[i]! - t[i - 1]!) / 1000);
  gaps.sort((a, b) => a - b);
  const mid = Math.floor(gaps.length / 2);
  const median = gaps.length % 2 ? gaps[mid]! : (gaps[mid - 1]! + gaps[mid]!) / 2;
  return Math.round(median * 10) / 10;
}

/** Groups API responses by method + host + path with counts, statuses, cadence and the first JSON body's shape. */
export function groupEndpoints(events: NetworkEvent[]): Endpoint[] {
  const map = new Map<string, { e: Endpoint; times: string[] }>();
  for (const ev of events) {
    if (ev.kind !== "response" || !isApiEvent(ev)) continue;
    const path = placeholderIds(ev.path); // logs written under an older rule set may still carry ids
    const key = `${ev.method} ${ev.host}${path}`;
    const entry = map.get(key) ?? {
      e: { method: ev.method, host: ev.host, path, count: 0, statuses: {}, contentTypes: [], medianGapSeconds: null, responseShape: undefined },
      times: [],
    };
    entry.e.count += 1;
    const status = String(ev.status ?? "?");
    entry.e.statuses[status] = (entry.e.statuses[status] ?? 0) + 1;
    const ct = ev.contentType ?? "";
    if (ct && !entry.e.contentTypes.includes(ct)) entry.e.contentTypes.push(ct);
    if (entry.e.responseShape === undefined && ev.body !== undefined) entry.e.responseShape = shapeOf(ev.body);
    entry.times.push(ev.at);
    map.set(key, entry);
  }
  return Array.from(map.values())
    .map(({ e, times }) => ({ ...e, medianGapSeconds: medianGapSeconds(times) }))
    .sort((a, b) => b.count - a.count || a.path.localeCompare(b.path));
}

export function renderEndpointsMarkdown(endpoints: Endpoint[]): string {
  const lines = ["| calls | method | host | path | status | type | median gap |", "| --- | --- | --- | --- | --- | --- | --- |"];
  for (const e of endpoints) {
    const statuses = Object.entries(e.statuses).map(([s, n]) => `${s}×${n}`).join(" ");
    lines.push(`| ${e.count} | ${e.method} | ${e.host} | \`${e.path}\` | ${statuses} | ${e.contentTypes.join(", ") || "—"} | ${e.medianGapSeconds === null ? "—" : `${e.medianGapSeconds}s`} |`);
  }
  return lines.join("\n");
}

export type ResultPayload = { method: string; host: string; path: string; at: string; keys: string[]; markup: string[]; count: number; shape: unknown };

/** Key names that carry a result file's address or listing (observed 2026-09-14: the drive listing and the download-url call). */
const RESULT_KEY = /^(download_url|cdn_url|video_url|file_url|media_url|front_page_screenshot)$/i;
/** Tags the assistant's Markdown uses to hand a file to the thread (observed 2026-09-14: the result card). */
const RESULT_MARKUP = /<(deliver-assets|media)\b/g;
/** Configuration and profile endpoints name download links for the desktop apps; they are not results. */
const NOT_RESULT_PATH = /\/(config|user|profile|setting)s?\//i;

/** Result-file keys anywhere in a JSON value, and the result markup tags in any string in it, depth-limited. */
export function resultSignals(value: unknown, depth = 0, maxDepth = 6): { keys: string[]; markup: string[] } {
  const keys = new Set<string>();
  const markup = new Set<string>();
  const walk = (v: unknown, d: number) => {
    if (d >= maxDepth || v === null) return;
    if (typeof v === "string") {
      for (const m of v.matchAll(RESULT_MARKUP)) if (m[1]) markup.add(m[1]);
      return;
    }
    if (Array.isArray(v)) {
      for (const x of v.slice(0, 8)) walk(x, d + 1);
      return;
    }
    if (typeof v === "object") {
      for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
        if (RESULT_KEY.test(k)) keys.add(k);
        walk(x, d + 1);
      }
    }
  };
  walk(value, depth);
  return { keys: Array.from(keys), markup: Array.from(markup) };
}

/** @deprecated kept for the 2026-09-14 tests' first draft; `resultSignals` is the reducer. */
export function resultKeys(value: unknown): string[] {
  return resultSignals(value).keys;
}

/**
 * STORY_018: the API responses that carry a finished generation — a JSON body naming a result file's address, or an
 * assistant message whose Markdown holds the deliver-assets / media markup the thread renders as the file card —
 * grouped by endpoint with the first body's shape (values redacted through `shapeOf`), earliest first. Configuration
 * and profile endpoints are left out: they carry desktop-app download links, not results.
 */
export function findResultPayloads(events: NetworkEvent[]): ResultPayload[] {
  const map = new Map<string, ResultPayload>();
  for (const ev of events) {
    if (ev.kind !== "response" || !isApiEvent(ev) || ev.body === undefined) continue;
    const path = placeholderIds(ev.path);
    if (NOT_RESULT_PATH.test(path)) continue;
    const { keys, markup } = resultSignals(ev.body);
    if (!keys.length && !markup.length) continue;
    const key = `${ev.method} ${ev.host}${path}`;
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
      for (const k of keys) if (!existing.keys.includes(k)) existing.keys.push(k);
      for (const t of markup) if (!existing.markup.includes(t)) existing.markup.push(t);
      continue;
    }
    map.set(key, { method: ev.method, host: ev.host, path, at: ev.at, keys, markup, count: 1, shape: shapeOf(ev.body, 0, 6) });
  }
  return Array.from(map.values()).sort((a, b) => a.at.localeCompare(b.at));
}
