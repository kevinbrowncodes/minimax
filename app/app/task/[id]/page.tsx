// Placeholder (STORY_013): Send lands here; STORY_014 turns it into the task page with progress, playback and history.
export const dynamic = "force-dynamic";

export default async function TaskPage({ params }: { readonly params: Promise<{ readonly id: string }> }) {
  const { id } = await params;
  return (
    <main style={{ padding: "var(--spacing_24) var(--spacing_64)" }}>
      <p style={{ color: "var(--gray_500)" }}>Job {id} submitted. The task page arrives with STORY_014.</p>
    </main>
  );
}
