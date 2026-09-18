import { redirect } from "next/navigation";

// STORY_026 moved the Management page to /plugins; STORY_059 made it Skills. Old links still land.
export default function Manage() {
  redirect("/skills");
}
