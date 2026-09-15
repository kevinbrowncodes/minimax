/**
 * The reference images kept with a job (STORY_032): `uploads/<jobId>/<n>-<name>` beside the history file (APP_DATA is
 * the history file's directory — /data in the container, a temp dir for the gate). Server-side only.
 */
import { mkdirSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { historyStore, type ReferenceFile } from "./history-store";

export function uploadsDirFor(jobId: string): string {
  return path.join(path.dirname(historyStore().file), "uploads", jobId);
}

/** The original name without anything a path could carry; never empty. */
export function safeFileName(name: string): string {
  const base = name.replace(/[/\\]/g, "_").replace(/[\u0000-\u001f]/g, "").trim();
  return base === "" || base === "." || base === ".." ? "image" : base;
}

export async function saveReferenceFiles(jobId: string, files: readonly File[]): Promise<readonly ReferenceFile[]> {
  if (files.length === 0) return [];
  const dir = uploadsDirFor(jobId);
  mkdirSync(dir, { recursive: true });
  const refs: ReferenceFile[] = [];
  for (const [index, file] of files.entries()) {
    const n = index + 1;
    const name = safeFileName(file.name);
    const stored = `${String(n)}-${name}`;
    writeFileSync(path.join(dir, stored), Buffer.from(await file.arrayBuffer()));
    refs.push({ n, name, file: stored, size: file.size, type: file.type });
  }
  return refs;
}

export function referenceFilePath(jobId: string, ref: ReferenceFile): string {
  return path.join(uploadsDirFor(jobId), ref.file);
}

export function removeReferenceFile(jobId: string, ref: ReferenceFile): void {
  try {
    unlinkSync(referenceFilePath(jobId, ref));
  } catch {
    // already gone
  }
}

/** Everything a forgotten job left on disk. */
export function removeUploads(jobId: string): void {
  rmSync(uploadsDirFor(jobId), { recursive: true, force: true });
}
