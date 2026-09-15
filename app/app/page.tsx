import { Composer } from "@/components/composer/Composer";
import { referenceUrl } from "@/lib/assets-filter";
import type { InitialRequest } from "@/lib/composer-state";
import { projectStore } from "@/lib/project-store";
import { getQueued } from "@/lib/queue-store";
import { getSkill } from "@/lib/skill-store";
import { applySkill } from "@/lib/skills";
import styles from "./home.module.css";

// Home (STORY_012 + STORY_013): the shell's heading and the composer. `?project=` (STORY_031: a project row's New task)
// starts the composer in that project when it exists; `?skill=` (STORY_040: Management › Skills › Use) starts it with
// the skill's template; `?queue=` (STORY_041: Scheduled › Edit) reopens a waiting request so Send replaces it.
export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }: { readonly searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const wanted = query["project"];
  const project = typeof wanted === "string" && wanted !== "" ? projectStore().get(wanted) : undefined;
  const skillId = query["skill"];
  const skill = typeof skillId === "string" && skillId !== "" ? getSkill(skillId) : undefined;
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
      <h1 className={styles.heading}>MiniMax makes your work easier</h1>
      {/* keyed by the project, the skill and the queued request: a navigation from / to /?… must not keep the mounted composer's state */}
      <Composer key={`${project?.id ?? "no-project"}:${skill?.id ?? "no-skill"}:${initialRequest?.queueId ?? "no-queue"}`} initialProjectId={project?.id} initialText={skill ? applySkill(skill.template, "") : undefined} initialRequest={initialRequest} />
    </main>
  );
}
