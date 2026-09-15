/**
 * The words on the pages behind the sidebar (STORY_025), read off the 2026-09-14 captures: agents-guide-view-now@1440,
 * page-connect-mobile@1440. STORY_026 dropped the marketplace and Schedules; STORY_028 the product pages.
 * Names and one-line descriptions are plain text; the reference's logos and art are not reproduced (CLAUDE.md §3e).
 */

export const MANAGE_TABS = [
  { label: "Plugins", count: 1 },
  { label: "Skills", count: 10 },
  { label: "Apps", count: 0 },
  { label: "Agents", count: 3 },
] as const;
export const AGENTS = ["General", "Coder", "Verifier"] as const;
export const AGENT_SYSTEM_PROMPT = `## Your Role

You are a general-purpose agent — a capable worker for tasks that don't need
a domain specialist. You might be asked to read code and write a report,
do a one-time refactor, research a topic, or any other task that doesn't
require accumulated project knowledge.

You do the work, report the result, and move on. You are not expected`;
