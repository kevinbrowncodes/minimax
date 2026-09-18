import { Composer } from "@/components/composer/Composer";
import { referenceUrl } from "@/lib/assets-filter";
import type { InitialRequest } from "@/lib/composer-state";
import { projectStore } from "@/lib/project-store";
import { getQueued } from "@/lib/queue-store";
import { listAgentRuns } from "@/lib/agent-run-store";
import { getSkill } from "@/lib/skill-store";
import { applySkill } from "@/lib/skills";
import styles from "./home.module.css";

// Home (STORY_012 + STORY_013): the shell's heading and the composer. `?project=` (STORY_031: a project row's New task)
// starts the composer in that project when it exists; `?skill=` (STORY_040: Management › Skills › Use) starts it with
// the skill's template; `?queue=` (STORY_041: Scheduled › Edit) reopens a waiting request so Send replaces it;
// `?agentRun=` (STORY_050: an Inbox row) reopens a director run that ended without a prompt, its notes and words;
// `?agent=` (STORY_054: Management › Skills › Use on a director) starts it in video mode with the chip on and that skill.
export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }: { readonly searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const wanted = query["project"];
  const project = typeof wanted === "string" && wanted !== "" ? projectStore().get(wanted) : undefined;
  const skillId = query["skill"];
  const skill = typeof skillId === "string" && skillId !== "" ? getSkill(skillId) : undefined;
  // STORY_050: an Inbox row of a director run reopens the composer with the notes and the run's words, the chip on
  const runId = query["agentRun"];
  const run = typeof runId === "string" && runId !== "" ? listAgentRuns().find((r) => r.id === runId) : undefined;
  const initialAgentRun = run === undefined ? undefined : { notes: run.notes, message: run.outcome === "refusal" ? `The director declined: "${run.message}"` : run.message, skill: run.skill };
  const agentId = query["agent"];
  const initialAgentSkill = typeof agentId === "string" && agentId !== "" ? agentId : undefined;
  const queueId = query["queue"];
  const queued = typeof queueId === "string" && queueId !== "" ? getQueued(queueId) : undefined;
  const initialRequest: InitialRequest | undefined = queued && queued.jobId === undefined
    ? {
        queueId: queued.id,
        prompt: queued.request.prompt,
        ratio: queued.request.ratio,
        resolution: queued.request.resolution,
        durationSeconds: queued.request.durationSeconds,
        model: queued.request.model,
        ...(queued.request.projectId === undefined ? {} : { projectId: queued.request.projectId }),
        ...(queued.notBefore === undefined ? {} : { notBefore: queued.notBefore }),
        images: queued.referenceFiles.map((ref) => ({ n: ref.n, name: ref.name, type: ref.type, url: referenceUrl({ id: queued.id }, ref) })),
      }
    : undefined;
  return (
    <main className={styles.home}>
      <h1 className={styles.heading}>MiniMax</h1>
      {/* keyed by the project, the skill and the queued request: a navigation from / to /?… must not keep the mounted composer's state */}
      <Composer key={`${project?.id ?? "no-project"}:${skill?.id ?? "no-skill"}:${initialRequest?.queueId ?? "no-queue"}:${run?.id ?? "no-run"}:${initialAgentSkill ?? "no-agent"}`} initialProjectId={project?.id} initialText={skill ? applySkill(skill.template, "") : undefined} initialRequest={initialRequest} initialAgentRun={initialAgentRun} initialAgentSkill={initialAgentSkill} />
    </main>
  );
}
