import { SkillsPage } from "@/components/pages/SkillsPage";

// Skills (STORY_059): the director skills the agent follows and the owner's templates — the one management page.
// `?create=1` opens the Create template form (+ › Skills › Add template).
export const dynamic = "force-dynamic";

export default async function Skills({ searchParams }: { readonly searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  return <SkillsPage createTemplate={query["create"] === "1"} />;
}
