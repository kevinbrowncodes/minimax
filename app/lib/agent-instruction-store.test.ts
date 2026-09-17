/** STORY_052: the instructions store — replace with kept references, dropped rows' files removed, the limits, the reference's location, the active inputs. */
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { activeInstructionInputs, clearInstructions, clearReference, instructionsFile, instructionUploadsDir, listInstructions, referenceLocation, replaceInstructions, setHistoryReference, setUploadedReference } from "./agent-instruction-store";
import { historyStore } from "./history-store";
import { uploadsDirFor } from "./uploads";

let dir = "";
beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "instr-"));
  process.env["HISTORY_FILE"] = path.join(dir, "history.json");
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  delete process.env["HISTORY_FILE"];
});

describe("agent-instruction-store", () => {
  it("replaces the list, keeps ids and references across a PUT, and deletes a dropped row's files", async () => {
    expect(instructionsFile()).toBe(path.join(dir, "agent-instructions.json"));
    const first = replaceInstructions([{ title: "Studio", text: "the sequin curtain", active: true }, { title: "House rule", text: "camera fixed", active: false }], "2026-09-17T10:00:00.000Z");
    expect(first.map((r) => [r.title, r.active, r.createdAt])).toEqual([["Studio", true, "2026-09-17T10:00:00.000Z"], ["House rule", false, "2026-09-17T10:00:00.000Z"]]);
    const studio = first[0];
    if (studio === undefined) throw new Error("no row");
    const withRef = await setUploadedReference(studio.id, new File([new Uint8Array([1, 2, 3])], "01.png", { type: "image/png" }));
    expect(withRef?.reference).toEqual({ kind: "upload", file: { name: "01.png", type: "image/png", size: 3 } });
    expect(existsSync(path.join(instructionUploadsDir(studio.id), "01.png"))).toBe(true);
    const second = replaceInstructions([{ id: studio.id, title: "Studio · sequin", text: "updated", active: true }], "2026-09-17T11:00:00.000Z");
    expect(second).toHaveLength(1);
    expect(second[0]).toMatchObject({ id: studio.id, title: "Studio · sequin", createdAt: "2026-09-17T10:00:00.000Z", reference: { kind: "upload" } });
    expect(existsSync(instructionUploadsDir(first[1]?.id ?? "x"))).toBe(false);
    expect(clearReference(studio.id)?.reference).toBeUndefined();
    expect(existsSync(instructionUploadsDir(studio.id))).toBe(false);
    clearInstructions();
    expect(listInstructions()).toEqual([]);
  });
  it("names the limits and refuses a bad row; garbage on disk reads as empty", () => {
    expect(() => replaceInstructions([{ title: "", text: "t", active: true }])).toThrow("needs a title");
    expect(() => replaceInstructions([{ title: "x".repeat(81), text: "t", active: true }])).toThrow("at most 80 characters");
    expect(() => replaceInstructions([{ title: "t", text: "x".repeat(4001), active: true }])).toThrow("at most 4000 characters");
    expect(() => replaceInstructions(Array.from({ length: 21 }, (_, i) => ({ title: `t${String(i)}`, text: "t", active: true })))).toThrow("at most 20 instructions");
    expect(() => replaceInstructions([{ id: "same", title: "a", text: "t", active: true }, { id: "same", title: "b", text: "t", active: true }])).toThrow("listed twice");
    mkdirSync(dir, { recursive: true });
    writeFileSync(instructionsFile(), "{nope");
    expect(listInstructions()).toEqual([]);
  });
  it("a reference from the history points at the job's file and reads it at run time; a gone file sends the text alone", () => {
    const entry = historyStore().create({ id: "job1", prompt: "p", params: { ratio: "16:9", resolution: "768P", durationSeconds: 5, model: "m" }, referenceImages: 1, referenceFiles: [{ n: 1, name: "ref.png", file: "1-ref.png", size: 3, type: "image/png" }] });
    mkdirSync(uploadsDirFor(entry.id), { recursive: true });
    writeFileSync(path.join(uploadsDirFor(entry.id), "1-ref.png"), new Uint8Array([9, 9, 9]));
    const [row] = replaceInstructions([{ title: "Scene", text: "the set", active: true }, { title: "Off", text: "never sent", active: false }]);
    if (row === undefined) throw new Error("no row");
    expect(setHistoryReference(row.id, entry.id, 1)?.reference).toEqual({ kind: "history", historyId: entry.id, n: 1 });
    expect(referenceLocation(listInstructions()[0] as never)?.mimeType).toBe("image/png");
    let active = activeInstructionInputs();
    expect(active.inputs.map((i) => [i.title, i.image?.mimeType, i.image?.bytes.length])).toEqual([["Scene", "image/png", 3]]);
    expect(active.missing).toEqual([]);
    rmSync(uploadsDirFor(entry.id), { recursive: true, force: true });
    active = activeInstructionInputs();
    expect(active.inputs).toEqual([{ title: "Scene", text: "the set" }]);
    expect(active.missing).toEqual(["Scene"]);
    expect(setHistoryReference("nope", entry.id, 1)).toBeUndefined();
  });
});
