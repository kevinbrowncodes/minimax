import { notFound } from "next/navigation";
import { TaskPage } from "@/components/task/TaskPage";
import { historyStore } from "@/lib/history-store";

// The task page (STORY_014): the history entry is read on the server; the client follows the job from there.
export const dynamic = "force-dynamic";

export default async function Task({ params, searchParams }: { readonly params: Promise<{ readonly id: string }>; readonly searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params;
  const query = await searchParams;
  const entry = historyStore().get(id);
  if (!entry) notFound();
  // `?extend` opens the page with the docked composer already extending this video (STORY_016; Assets' menu links here).
  return <TaskPage entry={entry} extendOnOpen={query["extend"] !== undefined} />;
}
