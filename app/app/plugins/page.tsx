import { ManagePage, type ManageTab } from "@/components/pages/ManagePage";

// Plugins (STORY_025, STORY_026): the reference's Management page — the agents live here; the marketplace was removed.
// STORY_040: `?tab=` opens a tab (+ › Skills › Manage skills), `?create=1` the Create skill form.
export const dynamic = "force-dynamic";

const TABS: readonly ManageTab[] = ["Plugins", "Skills", "Apps", "Agents"];

export default async function Plugins({ searchParams }: { readonly searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const tab = query["tab"];
  const initialTab = typeof tab === "string" && (TABS as readonly string[]).includes(tab) ? (tab as ManageTab) : "Plugins";
  return <ManagePage initialTab={initialTab} createSkill={query["create"] === "1"} />;
}
