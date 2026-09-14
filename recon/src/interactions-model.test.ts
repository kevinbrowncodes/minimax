import { describe, expect, it } from "vitest";
import type { NetworkEvent } from "./network-log.ts";
import { findResultPayloads, groupEndpoints, isApiEvent, medianGapSeconds, renderEndpointsMarkdown, shapeOf } from "./interactions-model.ts";

const res = (over: Partial<NetworkEvent>): NetworkEvent => ({ kind: "response", at: "2026-09-12T15:00:00.000Z", method: "GET", host: "agent.minimax.io", path: "/minimax-cloud/api/v1/session/:id", status: 200, contentType: "application/json", ...over });

describe("isApiEvent", () => {
  it("keeps the product's API and drops chunks, images, pages and CDN media", () => {
    expect(isApiEvent(res({}))).toBe(true);
    expect(isApiEvent(res({ host: "cdn.hailuo.ai", path: "/x/_next/static/chunks/main.js" }))).toBe(false);
    expect(isApiEvent(res({ path: "/logo.png" }))).toBe(false);
    expect(isApiEvent(res({ path: "/", contentType: "text/html" }))).toBe(false);
    expect(isApiEvent(res({ host: "filecdn.minimax.chat", path: "/public/:uuid.png" }))).toBe(false);
  });
});

describe("shapeOf", () => {
  it("replaces every value with its type and never keeps string content", () => {
    const shape = shapeOf({ session_id: "441031527284814", ok: true, n: 3, list: [{ name: "secret" }], nested: { deep: { deeper: { deepest: 1 } } } });
    expect(shape).toEqual({ session_id: "string", ok: "boolean", n: "number", list: [{ name: "string" }], nested: { deep: { deeper: { deepest: "…" } } } });
    expect(JSON.stringify(shape)).not.toContain("secret");
    expect(JSON.stringify(shape)).not.toContain("441031527284814");
  });
});

describe("medianGapSeconds", () => {
  it("returns the median spacing in seconds, null with fewer than two samples", () => {
    expect(medianGapSeconds(["2026-09-12T15:00:00Z", "2026-09-12T15:00:10Z", "2026-09-12T15:00:50Z"])).toBe(25);
    expect(medianGapSeconds(["2026-09-12T15:00:00Z"])).toBeNull();
  });
});

describe("groupEndpoints", () => {
  it("groups by method, host and path with counts, statuses, cadence and the first body's shape", () => {
    const events: NetworkEvent[] = [
      res({ at: "2026-09-12T15:00:00Z", body: { base_resp: { status_code: 0 }, session: { id: "x" } } }),
      res({ at: "2026-09-12T15:00:40Z", body: { base_resp: { status_code: 0 }, session: { id: "y" } } }),
      res({ at: "2026-09-12T15:01:20Z", status: 500 }),
      res({ kind: "request", path: "/minimax-cloud/api/v1/session/:id" }),
      res({ method: "POST", host: "agent-stream.minimax.io", path: "/minimax-cloud/api/v1/session/:id/message", contentType: "text/event-stream" }),
      res({ host: "cdn.hailuo.ai", path: "/x/_next/static/chunks/main.js", contentType: "application/javascript" }),
    ];
    const grouped = groupEndpoints(events);
    expect(grouped.map((e) => `${e.method} ${e.path}`)).toEqual(["GET /minimax-cloud/api/v1/session/:id", "POST /minimax-cloud/api/v1/session/:id/message"]);
    const stored = groupEndpoints([res({ host: "x.oss-us-east-1.aliyuncs.com", path: "/Mavis/:id/files/:id/441031527284814.mp4", contentType: "video/mp4" })]);
    expect(stored[0]?.path).toBe("/Mavis/:id/files/:id/:id.mp4");
    expect(grouped[0]).toMatchObject({ count: 3, statuses: { "200": 2, "500": 1 }, medianGapSeconds: 40, responseShape: { base_resp: { status_code: "number" }, session: { id: "string" } } });
    const md = renderEndpointsMarkdown(grouped);
    expect(md).toContain("| 3 | GET | agent.minimax.io | `/minimax-cloud/api/v1/session/:id` | 200×2 500×1 | application/json | 40s |");
    expect(md).toContain("text/event-stream");
  });
});

describe("findResultPayloads (STORY_018)", () => {
  it("groups the responses that carry a result by endpoint: result-file keys, or the deliver-assets markup in a message", () => {
    const events: NetworkEvent[] = [
      res({ at: "2026-09-14T15:02:00Z", body: { base_resp: { status_code: 0 }, session: { id: "x" } } }),
      res({ at: "2026-09-14T15:09:00Z", path: "/minimax-cloud/api/v1/session/:id/message", body: { messages: [{ msg_id: "m1", role: "assistant", msg_content: "Done.\n\n<deliver-assets>\n<media src=\"441031527284814\" name=\"441031527284814.mp4\" type=\"mp4\" />\n</deliver-assets>" }] } }),
      res({ at: "2026-09-14T15:05:00Z", path: "/minimax-cloud/api/v1/drive/file", body: { nodes: [{ node_id: "n", cdn_url: "https://cdn/y.mp4", name: "clip.mp4" }] } }),
      res({ at: "2026-09-14T15:06:00Z", path: "/minimax-cloud/api/v1/drive/file", body: { nodes: [{ node_id: "n2", cdn_url: "https://cdn/z.mp4", name: "clip2.mp4" }] } }),
      res({ at: "2026-09-14T15:07:00Z", path: "/minimax-cloud/api/v1/drive/file/441031527284814/download-url", body: { download_url: "https://cdn/x.mp4" } }),
      res({ at: "2026-09-14T15:03:00Z", path: "/v1/api/config/web/common_config", body: { data: { overseasX64MacosDownloadUrl: "https://cdn/app.dmg", download_url: "x" } } }),
      res({ at: "2026-09-14T15:03:30Z", host: "cdn.hailuo.ai", path: "/x.js", body: { video_url: "not-api" } }),
    ];
    const payloads = findResultPayloads(events);
    expect(payloads.map((p) => `${p.path} ×${p.count}`)).toEqual([
      "/minimax-cloud/api/v1/drive/file ×2",
      "/minimax-cloud/api/v1/drive/file/:id/download-url ×1",
      "/minimax-cloud/api/v1/session/:id/message ×1",
    ]);
    expect(payloads[0]?.keys).toEqual(["cdn_url"]);
    expect(payloads[1]?.keys).toEqual(["download_url"]);
    expect(payloads[2]?.keys).toEqual([]);
    expect(payloads[2]?.markup).toEqual(["deliver-assets", "media"]);
    const text = JSON.stringify(payloads);
    expect(text).not.toContain("441031527284814");
    expect(text).not.toContain("https://cdn");
    expect(payloads[2]?.shape).toEqual({ messages: [{ msg_id: "string", role: "string", msg_content: "string" }] });
  });
  it("is empty when no response names a result", () => {
    expect(findResultPayloads([res({ body: { ok: true } })])).toEqual([]);
  });
});
