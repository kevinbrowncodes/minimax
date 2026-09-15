import { describe, expect, it } from "vitest";
import { ACTIONS, mergeActions, redactBody, selectActions, summarizeCalls, type ActionId } from "./behaviour-plan.ts";
import type { NetworkEvent } from "./network-log.ts";

describe("the behaviour recon's plan (STORY_027)", () => {
  it("lists every kept surface once, and every action that changes the account says how it is undone", () => {
    expect(new Set(ACTIONS.map((a) => a.id)).size).toBe(ACTIONS.length);
    for (const a of ACTIONS.filter((x) => x.changes)) expect(a.undo, a.id).not.toBe("");
    expect(ACTIONS.map((a) => a.id)).toEqual(expect.arrayContaining(["recents-rename", "recents-archive", "project-create", "assets-star", "assets-upload", "manage-create-agent", "settings-preferences", "chat"]));
  });

  it("runs the credit-spending turn only with --chat, and --only narrows the rest", () => {
    expect(selectActions(null, false).map((a) => a.id)).not.toContain("chat");
    expect(selectActions(null, true).map((a) => a.id)).toContain("chat");
    expect(selectActions(/^recents-/, true).map((a) => a.id)).toEqual(["recents-rename", "recents-pin", "recents-copy-id", "recents-archive"]);
  });

  it("redacts secret-looking keys and long ids, keeps the rest", () => {
    const body = redactBody({ title: "Lighthouse", token: "abc", user_id: 42, session_id: "123456789012345", nested: { auth: "x", note: "ok", ids: ["/a/f0e1d2c3b4a5968778695a4b3c2d1e0f"] }, data: { accessKeyId: "STS.x", accessKeySecret: "y", securityToken: "z", dir: "moss/prod" } });
    expect(body).toEqual({ title: "Lighthouse", token: "<redacted>", user_id: "<redacted>", session_id: ":id", nested: { auth: "<redacted>", note: "ok", ids: ["/a/:hex"] }, data: { accessKeyId: "<redacted>", accessKeySecret: "<redacted>", securityToken: "<redacted>", dir: "moss/prod" } });
  });

  it("summarises a slice of the log by method + path with counts and statuses, API responses only", () => {
    const at = "2026-09-15T00:00:00.000Z";
    const events: NetworkEvent[] = [
      { kind: "request", at, method: "PUT", host: "agent.minimax.io", path: "/minimax-cloud/api/v1/session/:uuid" },
      { kind: "response", at, method: "PUT", host: "agent.minimax.io", path: "/minimax-cloud/api/v1/session/:uuid", status: 200 },
      { kind: "response", at, method: "GET", host: "agent.minimax.io", path: "/minimax-cloud/api/v1/session", status: 200 },
      { kind: "response", at, method: "GET", host: "agent.minimax.io", path: "/minimax-cloud/api/v1/session", status: 304 },
      { kind: "response", at, method: "GET", host: "cdn.example", path: "/x.png", status: 200 },
      { kind: "response", at, method: "GET", host: "agent.minimax.io", path: "/assets/app.js", status: 200 },
    ];
    expect(summarizeCalls(events)).toEqual([
      { method: "PUT", path: "/minimax-cloud/api/v1/session/:uuid", count: 1, statuses: [200] },
      { method: "GET", path: "/minimax-cloud/api/v1/session", count: 2, statuses: [200, 304] },
    ]);
  });

  it("merges a rerun's actions over the day's by id, in plan order", () => {
    type Row = { id: ActionId; n: number };
    const merged = mergeActions<Row>([{ id: "recents-pin", n: 1 }, { id: "chat", n: 1 }], [{ id: "recents-pin", n: 2 }, { id: "inbox", n: 2 }]);
    expect(merged).toEqual([{ id: "recents-pin", n: 2 }, { id: "inbox", n: 2 }, { id: "chat", n: 1 }]);
  });
});
