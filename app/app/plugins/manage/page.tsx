import { redirect } from "next/navigation";

// STORY_026: the Management page moved to /plugins when the marketplace went; old links still land.
export default function Manage() {
  redirect("/plugins");
}
