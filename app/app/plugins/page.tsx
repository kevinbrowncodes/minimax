import { redirect } from "next/navigation";

// STORY_059: the Management page became Skills; the reference's Plugins / Apps / Agents tabs went. Old links still land.
export default async function Plugins({ searchParams }: { readonly searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  redirect(query["create"] === "1" ? "/skills?create=1" : "/skills");
}
