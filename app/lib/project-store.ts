/**
 * The project store (STORY_031): the owner's projects as a JSON file with atomic writes, the history store's shape.
 * Server-side only. PROJECTS_FILE names the file; the app container mounts /data for it. A project is a name that
 * tasks point at (`HistoryEntry.projectId`); deleting one leaves its tasks in Recents, unassigned.
 */
import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

export interface Project {
  readonly id: string;
  readonly name: string;
  readonly createdAt: string;
  /** In the sidebar's Pinned section (STORY_029's), newest pin first. */
  readonly pinned?: boolean;
  readonly pinnedAt?: string;
}
export type ProjectPatch = Partial<Pick<Project, "name" | "pinned" | "pinnedAt">>;

export class ProjectStore {
  readonly file: string;

  constructor(file: string) {
    this.file = file;
  }

  #read(): Project[] {
    let text: string;
    try {
      text = readFileSync(this.file, "utf8");
    } catch {
      return [];
    }
    const parsed: unknown = JSON.parse(text);
    return Array.isArray(parsed) ? (parsed as Project[]) : [];
  }

  #write(projects: readonly Project[]): void {
    mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.${String(process.pid)}.tmp`;
    writeFileSync(tmp, JSON.stringify(projects, null, 2));
    renameSync(tmp, this.file);
  }

  /** Newest first, like history. */
  list(): readonly Project[] {
    return [...this.#read()].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }

  get(id: string): Project | undefined {
    return this.#read().find((p) => p.id === id);
  }

  create(input: { readonly name: string; readonly id?: string; readonly createdAt?: string }): Project {
    const project: Project = { id: input.id ?? randomUUID(), name: input.name.trim(), createdAt: input.createdAt ?? new Date().toISOString() };
    this.#write([...this.#read().filter((p) => p.id !== project.id), project]);
    return project;
  }

  patch(id: string, patch: ProjectPatch): Project | undefined {
    const projects = this.#read();
    const index = projects.findIndex((p) => p.id === id);
    const current = projects[index];
    if (index === -1 || !current) return undefined;
    const next: Project = { ...current, ...patch };
    projects[index] = next;
    this.#write(projects);
    return next;
  }

  remove(id: string): boolean {
    const projects = this.#read();
    const next = projects.filter((p) => p.id !== id);
    if (next.length === projects.length) return false;
    this.#write(next);
    return true;
  }
}

let shared: ProjectStore | undefined;

/** The process-wide store at PROJECTS_FILE (default: a file in the OS temp dir, for the gate and dev). */
export function projectStore(): ProjectStore {
  const file = process.env["PROJECTS_FILE"] ?? path.join(tmpdir(), "minimax-projects.json");
  if (!shared || shared.file !== file) shared = new ProjectStore(file);
  return shared;
}
