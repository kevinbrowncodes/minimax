/**
 * Agent instructions (STORY_052): persistent guidelines the director follows on every run — a title, a text, a switch,
 * an optional reference image — doubling as saved scenes and characters. `agent-instructions.json` beside
 * `history.json` (the stores' pattern: read on every call, written atomically); an uploaded reference lives under
 * `uploads/agent-instructions/<id>/<safe name>`; a reference picked from Assets points at a job's own file and is read
 * from there at run time. Limits: 80-character titles, 4,000-character texts, 20 instructions.
 */
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { historyStore } from "./history-store";
import { referenceFilePath, safeFileName } from "./uploads";

export const INSTRUCTION_TITLE_MAX = 80;
export const INSTRUCTION_TEXT_MAX = 4000;
export const INSTRUCTIONS_MAX = 20;

export type InstructionReference =
  | { readonly kind: "history"; readonly historyId: string; readonly n: number }
  | { readonly kind: "upload"; readonly file: { readonly name: string; readonly type: string; readonly size: number } };
export interface AgentInstruction {
  readonly id: string;
  readonly title: string;
  readonly text: string;
  readonly active: boolean;
  readonly createdAt: string;
  readonly reference?: InstructionReference;
}
/** What the panel sends on Done: the rows without their references (kept by id) unless a row is new. */
export interface InstructionInput {
  readonly id?: string;
  readonly title: string;
  readonly text: string;
  readonly active: boolean;
}

export class InstructionError extends Error {
  readonly field: string;
  constructor(field: string, message: string) {
    super(message);
    this.field = field;
  }
}

export function instructionsFile(): string {
  return path.join(path.dirname(historyStore().file), "agent-instructions.json");
}
export function instructionUploadsDir(id: string): string {
  return path.join(path.dirname(historyStore().file), "uploads", "agent-instructions", id);
}

function isReference(v: unknown): v is InstructionReference {
  if (typeof v !== "object" || v === null) return false;
  const r = v as Record<string, unknown>;
  if (r["kind"] === "history") return typeof r["historyId"] === "string" && typeof r["n"] === "number";
  if (r["kind"] === "upload") {
    const f = r["file"];
    return typeof f === "object" && f !== null && typeof (f as Record<string, unknown>)["name"] === "string" && typeof (f as Record<string, unknown>)["type"] === "string" && typeof (f as Record<string, unknown>)["size"] === "number";
  }
  return false;
}
function isInstruction(v: unknown): v is AgentInstruction {
  if (typeof v !== "object" || v === null) return false;
  const r = v as Record<string, unknown>;
  return typeof r["id"] === "string" && typeof r["title"] === "string" && typeof r["text"] === "string" && typeof r["active"] === "boolean" && typeof r["createdAt"] === "string" && (r["reference"] === undefined || isReference(r["reference"]));
}

/** Oldest first (the panel lists them newest last); garbage on disk reads as empty. */
export function listInstructions(): readonly AgentInstruction[] {
  let text: string;
  try {
    text = readFileSync(instructionsFile(), "utf8");
  } catch {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(text);
    return Array.isArray(parsed) ? parsed.filter(isInstruction) : [];
  } catch {
    return [];
  }
}

function write(rows: readonly AgentInstruction[]): void {
  const file = instructionsFile();
  mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${String(process.pid)}.tmp`;
  writeFileSync(tmp, JSON.stringify(rows, null, 2));
  renameSync(tmp, file);
}

function validate(input: InstructionInput): void {
  if (typeof input.title !== "string" || input.title.trim() === "") throw new InstructionError("title", "an instruction needs a title");
  if (input.title.length > INSTRUCTION_TITLE_MAX) throw new InstructionError("title", `a title is at most ${String(INSTRUCTION_TITLE_MAX)} characters`);
  if (typeof input.text !== "string" || input.text.trim() === "") throw new InstructionError("text", "an instruction needs its guideline text");
  if (input.text.length > INSTRUCTION_TEXT_MAX) throw new InstructionError("text", `a guideline is at most ${String(INSTRUCTION_TEXT_MAX)} characters`);
  if (typeof input.active !== "boolean") throw new InstructionError("active", "active must be true or false");
}

/** Replace the list (the panel's Done): rows keep their reference by id; the files of rows that vanished are deleted. */
export function replaceInstructions(inputs: readonly InstructionInput[], now = new Date().toISOString()): readonly AgentInstruction[] {
  if (inputs.length > INSTRUCTIONS_MAX) throw new InstructionError("instructions", `at most ${String(INSTRUCTIONS_MAX)} instructions`);
  for (const input of inputs) validate(input);
  const current = listInstructions();
  const byId = new Map(current.map((r) => [r.id, r]));
  const seen = new Set<string>();
  const next: AgentInstruction[] = inputs.map((input) => {
    const existing = input.id === undefined ? undefined : byId.get(input.id);
    const id = existing?.id ?? input.id ?? randomUUID();
    if (seen.has(id)) throw new InstructionError("id", "an instruction is listed twice");
    seen.add(id);
    return { id, title: input.title.trim(), text: input.text.trim(), active: input.active, createdAt: existing?.createdAt ?? now, ...(existing?.reference === undefined ? {} : { reference: existing.reference }) };
  });
  for (const row of current) if (!seen.has(row.id)) rmSync(instructionUploadsDir(row.id), { recursive: true, force: true });
  write(next);
  return next;
}

/** A reference from an upload: the file saved under the instruction's own directory, the old one removed. */
export async function setUploadedReference(id: string, file: File): Promise<AgentInstruction | undefined> {
  const rows = listInstructions();
  const row = rows.find((r) => r.id === id);
  if (row === undefined) return undefined;
  const dir = instructionUploadsDir(id);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const name = safeFileName(file.name);
  writeFileSync(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  const updated: AgentInstruction = { ...row, reference: { kind: "upload", file: { name, type: file.type, size: file.size } } };
  write(rows.map((r) => (r.id === id ? updated : r)));
  return updated;
}

/** A reference picked from Assets (a job's own reference image): kept by pointer, read at run time. */
export function setHistoryReference(id: string, historyId: string, n: number): AgentInstruction | undefined {
  const rows = listInstructions();
  const row = rows.find((r) => r.id === id);
  if (row === undefined) return undefined;
  rmSync(instructionUploadsDir(id), { recursive: true, force: true });
  const updated: AgentInstruction = { ...row, reference: { kind: "history", historyId, n } };
  write(rows.map((r) => (r.id === id ? updated : r)));
  return updated;
}

export function clearReference(id: string): AgentInstruction | undefined {
  const rows = listInstructions();
  const row = rows.find((r) => r.id === id);
  if (row === undefined) return undefined;
  rmSync(instructionUploadsDir(id), { recursive: true, force: true });
  const rest: AgentInstruction = { id: row.id, title: row.title, text: row.text, active: row.active, createdAt: row.createdAt };
  write(rows.map((r) => (r.id === id ? rest : r)));
  return rest;
}

/** Where a reference's bytes are, and its MIME type; undefined when the file is gone (a deleted task, a lost upload). */
export function referenceLocation(row: AgentInstruction): { readonly path: string; readonly mimeType: string } | undefined {
  const ref = row.reference;
  if (ref === undefined) return undefined;
  if (ref.kind === "upload") {
    const p = path.join(instructionUploadsDir(row.id), ref.file.name);
    return existsSync(p) ? { path: p, mimeType: ref.file.type } : undefined;
  }
  const entry = historyStore().get(ref.historyId);
  const file = entry?.referenceFiles?.find((f) => f.n === ref.n);
  if (entry === undefined || file === undefined) return undefined;
  const p = referenceFilePath(entry.id, file);
  return existsSync(p) ? { path: p, mimeType: file.type } : undefined;
}

/** The active rows as the request takes them (the bytes read now — a replaced file is picked up at once); a missing file sends the text alone. */
export function activeInstructionInputs(): { readonly inputs: readonly { readonly title: string; readonly text: string; readonly image?: { readonly bytes: Uint8Array; readonly mimeType: string } }[]; readonly missing: readonly string[] } {
  const missing: string[] = [];
  const inputs = listInstructions().filter((r) => r.active).map((row) => {
    const location = referenceLocation(row);
    if (row.reference !== undefined && location === undefined) missing.push(row.title);
    return { title: row.title, text: row.text, ...(location === undefined ? {} : { image: { bytes: new Uint8Array(readFileSync(location.path)), mimeType: location.mimeType } }) };
  });
  return { inputs, missing };
}

/** Tests and the e2e lane: forget every instruction and its files. */
export function clearInstructions(): void {
  for (const row of listInstructions()) rmSync(instructionUploadsDir(row.id), { recursive: true, force: true });
  write([]);
}
