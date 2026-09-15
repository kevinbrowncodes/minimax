import { Composer } from "@/components/composer/Composer";
import { projectStore } from "@/lib/project-store";
import { getSkill } from "@/lib/skill-store";
import { applySkill } from "@/lib/skills";
import styles from "./home.module.css";

// Home (STORY_012 + STORY_013): the shell's heading and the composer. `?project=` (STORY_031: a project row's New task)
// starts the composer in that project when it exists; `?skill=` (STORY_040: Management › Skills › Use) starts it with
// the skill's template.
export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }: { readonly searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const wanted = query["project"];
  const project = typeof wanted === "string" && wanted !== "" ? projectStore().get(wanted) : undefined;
  const skillId = query["skill"];
  const skill = typeof skillId === "string" && skillId !== "" ? getSkill(skillId) : undefined;
  return (
    <main className={styles.home}>
      <h1 className={styles.heading}>MiniMax makes your work easier</h1>
      {/* keyed by the project and the skill: a row's New task or a skill's Use navigates from / to /?… and must not keep the mounted composer's state */}
      <Composer key={`${project?.id ?? "no-project"}:${skill?.id ?? "no-skill"}`} initialProjectId={project?.id} initialText={skill ? applySkill(skill.template, "") : undefined} />
    </main>
  );
}
