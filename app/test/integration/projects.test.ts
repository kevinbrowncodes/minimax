/** STORY_031 integration lane: the project routes, a job created in a project, Move to project, and a deleted project's tasks. */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createStubServer, type StubServer } from "stub-generation-server";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { GET as getHistoryEntry, PATCH as patchHistory } from "@/app/api/history/[id]/route";
import { POST as createJob } from "@/app/api/jobs/route";
import { DELETE as deleteProject, PATCH as patchProject } from "@/app/api/projects/[id]/route";
import { GET as listProjects, POST as createProject } from "@/app/api/projects/route";
import type { HistoryEntry } from "@/lib/history-store";
import type { CreateJobResponse } from "@/lib/job-api";
import type { Project } from "@/lib/project-store";

let stub: StubServer;
let stubUrl = "";
let dir = "";
const valid = { prompt: "A small paper boat", ratio: "16:9", resolution: "768P", durationSeconds: 5, model: "minimax-h3" };
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const jsonRequest = (p: string, body: unknown, method = "POST") => new Request(`http://app${p}`, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const projectsOf = async (): Promise<Project[]> => ((await (await listProjects()).json()) as { projects: Project[] }).projects;
const entryOf = async (id: string): Promise<HistoryEntry> => (await (await getHistoryEntry(new Request(`http://app/api/history/${id}`), ctx(id))).json()) as HistoryEntry;

beforeAll(async () => {
  stub = createStubServer({ fixture: "mp4" });
  stubUrl = `http://127.0.0.1:${String(await stub.listen(0))}`;
  process.env["MODEL_BASE_URL"] = stubUrl;
});
afterAll(async () => {
  await stub.close();
  delete process.env["MODEL_BASE_URL"];
});
beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "projects-it-"));
  process.env["HISTORY_FILE"] = path.join(dir, "history.json");
  process.env["PROJECTS_FILE"] = path.join(dir, "projects.json");
  stub.reset();
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  delete process.env["HISTORY_FILE"];
  delete process.env["PROJECTS_FILE"];
});

describe("projects through the app's routes", () => {
  it("POST creates with a trimmed name (blank refused), PATCH renames and pins, DELETE removes; unknown ids are 404", async () => {
    expect((await createProject(jsonRequest("/api/projects", { name: "   " }))).status).toBe(400);
    expect((await createProject(jsonRequest("/api/projects", {}))).status).toBe(400);
    const created = await createProject(jsonRequest("/api/projects", { name: "  My film " }));
    expect(created.status).toBe(201);
    const { project } = (await created.json()) as { project: Project };
    expect(project.name).toBe("My film");
    expect((await projectsOf()).map((p) => p.id)).toEqual([project.id]);
    const renamed = (await (await patchProject(jsonRequest(`/api/projects/${project.id}`, { name: " Our film " }, "PATCH"), ctx(project.id))).json()) as { project: Project };
    expect(renamed.project.name).toBe("Our film");
    expect((await patchProject(jsonRequest(`/api/projects/${project.id}`, { name: "" }, "PATCH"), ctx(project.id))).status).toBe(400);
    expect((await patchProject(jsonRequest(`/api/projects/${project.id}`, { pinned: "yes" }, "PATCH"), ctx(project.id))).status).toBe(400);
    expect((await patchProject(jsonRequest(`/api/projects/${project.id}`, { createdAt: "x" }, "PATCH"), ctx(project.id))).status).toBe(400);
    const pinned = (await (await patchProject(jsonRequest(`/api/projects/${project.id}`, { pinned: true }, "PATCH"), ctx(project.id))).json()) as { project: Project };
    expect(pinned.project.pinned).toBe(true);
    expect(typeof pinned.project.pinnedAt).toBe("string");
    expect((await patchProject(jsonRequest(`/api/projects/nope`, { name: "x" }, "PATCH"), ctx("nope"))).status).toBe(404);
    expect((await deleteProject(new Request(`http://app/api/projects/${project.id}`, { method: "DELETE" }), ctx(project.id))).status).toBe(204);
    expect((await deleteProject(new Request(`http://app/api/projects/${project.id}`, { method: "DELETE" }), ctx(project.id))).status).toBe(404);
    expect(await projectsOf()).toEqual([]);
  });

  it("a job created with projectId carries it in history and not to the model; an unknown project is refused before any job exists", async () => {
    const { project } = (await (await createProject(jsonRequest("/api/projects", { name: "My film" }))).json()) as { project: Project };
    const refused = await createJob(jsonRequest("/api/jobs?script=done-after-1-poll", { ...valid, projectId: "nope" }));
    expect(refused.status).toBe(400);
    expect(((await refused.json()) as { error: { field?: string } }).error.field).toBe("projectId");
    expect(((await (await fetch(`${stubUrl}/__stub/jobs`)).json()) as { jobs: unknown[] }).jobs).toEqual([]);
    const res = await createJob(jsonRequest("/api/jobs?script=done-after-1-poll", { ...valid, projectId: project.id }));
    expect(res.status).toBe(202);
    const { id } = (await res.json()) as CreateJobResponse;
    expect((await entryOf(id)).projectId).toBe(project.id);
    const received = (await (await fetch(`${stubUrl}/__stub/jobs/${id}/received`)).json()) as { request: Record<string, unknown> };
    expect(received.request).not.toHaveProperty("projectId");
    expect(received.request["prompt"]).toBe(valid.prompt);
    // multipart carries it the same way
    const form = new FormData();
    for (const [k, v] of Object.entries({ ...valid, projectId: project.id })) form.set(k, String(v));
    const multi = await createJob(new Request("http://app/api/jobs?script=done-after-1-poll", { method: "POST", body: form }));
    expect(multi.status).toBe(202);
    const second = (await multi.json()) as CreateJobResponse;
    expect((await entryOf(second.id)).projectId).toBe(project.id);
    expect(((await (await fetch(`${stubUrl}/__stub/jobs/${second.id}/received`)).json()) as { request: Record<string, unknown> }).request).not.toHaveProperty("projectId");
  });

  it("Move to project patches projectId (null clears, an unknown project is a 400); deleting the project leaves its tasks unassigned", async () => {
    const { project } = (await (await createProject(jsonRequest("/api/projects", { name: "My film" }))).json()) as { project: Project };
    const { id } = (await (await createJob(jsonRequest("/api/jobs?script=done-after-1-poll", valid))).json()) as CreateJobResponse;
    expect((await entryOf(id)).projectId).toBeUndefined();
    expect((await patchHistory(jsonRequest(`/api/history/${id}`, { projectId: "nope" }, "PATCH"), ctx(id))).status).toBe(400);
    expect((await patchHistory(jsonRequest(`/api/history/${id}`, { projectId: 7 }, "PATCH"), ctx(id))).status).toBe(400);
    const moved = (await (await patchHistory(jsonRequest(`/api/history/${id}`, { projectId: project.id }, "PATCH"), ctx(id))).json()) as HistoryEntry;
    expect(moved.projectId).toBe(project.id);
    const cleared = (await (await patchHistory(jsonRequest(`/api/history/${id}`, { projectId: null }, "PATCH"), ctx(id))).json()) as HistoryEntry;
    expect(cleared.projectId).toBeUndefined();
    await patchHistory(jsonRequest(`/api/history/${id}`, { projectId: project.id }, "PATCH"), ctx(id));
    expect((await deleteProject(new Request(`http://app/api/projects/${project.id}`, { method: "DELETE" }), ctx(project.id))).status).toBe(204);
    const after = await entryOf(id);
    expect(after.title).toBe("A small paper boat");
    expect(after.projectId).toBeUndefined();
  });
});
