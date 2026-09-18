import { notFound } from "next/navigation";
import { TaskPage } from "@/components/task/TaskPage";
import { pendingSourceSeconds } from "@/lib/extend";
import { historyStore } from "@/lib/history-store";

// The task page (STORY_014): the history entry is read on the server; the client follows the job from there.
export const dynamic = "force-dynamic";

export default async function Task({ params, searchParams }: { readonly params: Promise<{ readonly id: string }>; readonly searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params;
  const query = await searchParams;
  const store = historyStore();
  const entry = store.get(id);
  if (!entry) notFound();
  // `?extend` opens the page with the docked composer already extending this video (STORY_016; Assets' menu links here).
  // STORY_043: a clip still queued or running can be extended too — its length comes from its request (a chain resolves to its first clip).
  const pending = entry.status === "queued" || entry.status === "running" ? pendingSourceSeconds(entry, (sourceId) => store.get(sourceId)) : undefined;
  // STORY_056: the segments that continue from this one — Retry re-queues them behind a redraw
  const chainAfter = store.chainAfter(id).map((e) => ({ id: e.id, title: e.title }));
  return <TaskPage entry={entry} extendOnOpen={query["extend"] !== undefined} pendingSeconds={pending} chainAfter={chainAfter} />;
}
