import { describe, expect, it } from "vitest";
import { isNoise, sanitizePath } from "./network-log.ts";

describe("isNoise", () => {
  it("is true for the analytics and pixel hosts seen on 2026-09-12", () => {
    for (const url of [
      "https://www.googletagmanager.com/gtag/js?id=X",
      "https://analytics.google.com/g/collect?v=2",
      "https://connect.facebook.net/en_US/fbevents.js",
      "https://static.ads-twitter.com/uwt.js",
      "https://bat.bing.com/p/action/1.js",
      "https://googleads.g.doubleclick.net/pagead/viewthroughconversion/1/",
      "https://www.redditstatic.com/ads/pixel.js",
      "https://data.hailuo.ai/meerkat-reporter/api/report?project=MiniMaxAgent",
      "https://rum-openway.guance.com/v1/write/rum",
    ]) {
      expect(isNoise(url), url).toBe(true);
    }
  });
  it("is false for the reference origin and its CDNs", () => {
    expect(isNoise("https://agent.minimax.io/v1/api/config/web/common_config?filter=x")).toBe(false);
    expect(isNoise("https://cdn.hailuo.ai/mavis-chat/prod/_next/static/chunks/main.js")).toBe(false);
    expect(isNoise("https://filecdn.minimax.chat/public/abc.png")).toBe(false);
  });
  it("treats an unparsable URL as noise rather than logging it", () => {
    expect(isNoise("nope")).toBe(true);
  });
});

describe("sanitizePath", () => {
  it("drops the query string and hash", () => {
    expect(sanitizePath("https://agent.minimax.io/v1/api/task?id=1&token=abc#x")).toBe("/v1/api/task");
  });
  it("replaces UUIDs, long numeric ids and long hex ids with placeholders", () => {
    expect(sanitizePath("https://agent.minimax.io/v1/api/task/3f1c2a4e-1b2c-4d5e-8f90-abcdef123456/status")).toBe("/v1/api/task/:uuid/status");
    expect(sanitizePath("https://agent.minimax.io/v1/api/chat/348713812640899/messages")).toBe("/v1/api/chat/:id/messages");
    expect(sanitizePath("https://filecdn.minimax.chat/public/9eed7c85-a1af-40a0-be5e-26d133c045d6.png")).toBe("/public/:uuid.png");
    expect(sanitizePath("https://agent.minimax.io/v1/api/file/0123456789abcdef0123456789abcdef")).toBe("/v1/api/file/:hex");
  });
  it("leaves short numbers and version segments alone", () => {
    expect(sanitizePath("https://agent.minimax.io/v1/api/config/web/common_config")).toBe("/v1/api/config/web/common_config");
    expect(sanitizePath("https://agent.minimax.io/v1/api/page/2")).toBe("/v1/api/page/2");
  });
});
