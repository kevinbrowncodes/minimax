import { notFound } from "next/navigation";
import { ProjectPage } from "@/components/project/ProjectPage";
import { historyStore } from "@/lib/history-store";
import { projectStore } from "@/lib/project-store";
import { tasksOf } from "@/lib/recents";

// The project page (STORY_031): the project and its tasks are read on the server.
export const dynamic = "force-dynamic";

export default async function ProjectRoute({ params }: { readonly params: Promise<{ readonly id: string }> }) {
  const { id } = await params;
  const project = projectStore().get(id);
  if (!project) notFound();
  return <ProjectPage project={project} tasks={tasksOf(historyStore().list(), project.id)} />;
}
