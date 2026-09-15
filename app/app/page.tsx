import { Composer } from "@/components/composer/Composer";
import { projectStore } from "@/lib/project-store";
import styles from "./home.module.css";

// Home (STORY_012 + STORY_013): the shell's heading and the composer. `?project=` (STORY_031: a project row's New task)
// starts the composer in that project when it exists.
export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }: { readonly searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const wanted = query["project"];
  const project = typeof wanted === "string" && wanted !== "" ? projectStore().get(wanted) : undefined;
  return (
    <main className={styles.home}>
      <h1 className={styles.heading}>MiniMax makes your work easier</h1>
      {/* keyed by the project: a row's New task navigates from / to /?project= and must not keep the mounted composer's state */}
      <Composer key={project?.id ?? "no-project"} initialProjectId={project?.id} />
    </main>
  );
}
