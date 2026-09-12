import { describe, expect, it } from "vitest";
import { indicatorFor, stepsFor } from "./todo-steps";

describe("stepsFor", () => {
  it("ticks the first two, makes Generate active with the progress, and Deliver done only at the end", () => {
    expect(stepsFor({ status: "queued", progress: 0 }).map((s) => s.state)).toEqual(["done", "done", "active", "pending"]);
    expect(stepsFor({ status: "queued", progress: 0 })[2]?.detail).toBe("Queued");
    expect(stepsFor({ status: "running", progress: 63 })[2]).toMatchObject({ state: "active", detail: "63 %" });
    expect(stepsFor({ status: "done", progress: 100 }).map((s) => s.state)).toEqual(["done", "done", "done", "done"]);
  });
  it("marks Generate failed for failed and cancelled jobs with the reason", () => {
    expect(stepsFor({ status: "failed", progress: 40, error: { code: "generation_failed", message: "boom" } })[2]).toMatchObject({ state: "failed", detail: "boom" });
    expect(stepsFor({ status: "cancelled", progress: 41 })[2]).toMatchObject({ state: "failed", detail: "Cancelled at 41 %" });
  });
});

describe("indicatorFor", () => {
  it("names every state, moderated and unreachable included", () => {
    expect(indicatorFor({ status: "queued", progress: 0 })).toBe("Queued…");
    expect(indicatorFor({ status: "running", progress: 9 })).toBe("Generating… 9 %");
    expect(indicatorFor({ status: "done", progress: 100 })).toBe("Your video is ready");
    expect(indicatorFor({ status: "cancelled", progress: 41 })).toBe("Cancelled at 41 %");
    expect(indicatorFor({ status: "failed", progress: 0, error: { code: "moderated", message: "" } })).toMatch(/content grounds/);
    expect(indicatorFor({ status: "failed", progress: 0, error: { code: "unreachable", message: "" } })).toMatch(/stopped answering/);
    expect(indicatorFor({ status: "failed", progress: 0, error: { code: "generation_failed", message: "" } })).toBe("Request failed");
  });
});
