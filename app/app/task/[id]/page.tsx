import { notFound } from "next/navigation";
import { TaskPage } from "@/components/task/TaskPage";
import { historyStore } from "@/lib/history-store";

// The task page (STORY_014): the history entry is read on the server; the client follows the job from there.
export const dynamic = "force-dynamic";

export default async function Task({ params }: { readonly params: Promise<{ readonly id: string }> }) {
  const { id } = await params;
  const entry = historyStore().get(id);
  if (!entry) notFound();
  return <TaskPage entry={entry} />;
}
