/**
 * Pure helpers for the raw network log written during a capture run. The log
 * is STORY_004's raw material and lives under the gitignored recon/out/.
 */

const NOISE_HOSTS: RegExp[] = [
  /(^|\.)google(tagmanager|-analytics|ads|adservices|syndication)?\.com$/,
  /(^|\.)googleapis\.com$/,
  /(^|\.)gstatic\.com$/,
  /(^|\.)doubleclick\.net$/,
  /(^|\.)facebook\.(com|net)$/,
  /(^|\.)twitter\.com$/,
  /(^|\.)ads-twitter\.com$/,
  /(^|\.)t\.co$/,
  /(^|\.)bing\.(com|net)$/,
  /(^|\.)redditstatic\.com$/,
  /(^|\.)reddit\.com$/,
  /^data\.hailuo\.ai$/, // meerkat-reporter telemetry
  /(^|\.)sensorsdata\.cn$/,
  /(^|\.)guance\.com$/, // RUM telemetry (rum-openway.guance.com)
];

/** True for analytics, ads and telemetry hosts that carry nothing about the product. */
export function isNoise(url: string): boolean {
  let host: string;
  try {
    host = new URL(url).host;
  } catch {
    return true;
  }
  return NOISE_HOSTS.some((re) => re.test(host));
}

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const LONG_ID = /(?<=\/)\d{6,}(?=\.[a-z0-9]+$|\/|$)/g;
const HEX_ID = /(?<=\/)[0-9a-f]{24,}(?=\.[a-z0-9]+$|\/|$)/gi;

/** Applies the placeholder rules to a bare path (also used to re-sanitise paths stored by an earlier rule set). */
export function placeholderIds(path: string): string {
  return path.replace(UUID, ":uuid").replace(HEX_ID, ":hex").replace(LONG_ID, ":id");
}

/** The path with UUIDs, long numeric ids and long hex ids replaced by placeholders; no query, no hash. */
export function sanitizePath(url: string): string {
  let path: string;
  try {
    path = new URL(url).pathname;
  } catch {
    return "";
  }
  return placeholderIds(path);
}

export type NetworkEvent = {
  kind: "request" | "response";
  at: string;
  method: string;
  host: string;
  path: string;
  status?: number;
  contentType?: string;
  body?: unknown;
  /** STORY_027: a POST / PUT / PATCH / DELETE request's JSON body, redacted (behaviour-plan.ts › redactBody). */
  requestBody?: unknown;
};
