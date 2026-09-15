/**
 * The words on the pages behind the sidebar (STORY_025), read off the 2026-09-14 captures: agents-guide-view-now@1440,
 * page-connect-mobile@1440, page-maxhermes@1440, page-maxclaw@1440. STORY_026 dropped the marketplace and Schedules.
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

export interface ProductPage {
  readonly name: "MaxHermes" | "MaxClaw";
  readonly path: "/max-hermes" | "/max-claw";
  readonly colour: string;
  readonly tagline: string;
  readonly sectionTitle: string;
  readonly features: readonly string[];
  readonly availableOn?: string;
}

export const PRODUCTS: Readonly<Record<"max-hermes" | "max-claw", ProductPage>> = {
  "max-hermes": {
    name: "MaxHermes",
    path: "/max-hermes",
    colour: "#f5a623",
    tagline: "An Agent That Grows With You.",
    sectionTitle: "Why MaxHermes",
    features: [
      "Self-evolution. Each completion of a complex task unlocks a brand-new skill.",
      "Always on, zero wait. Live in 10 seconds, running 24/7 in the cloud.",
      "Right where you need it. Accessible in your daily apps, with expanding support for more.",
    ],
  },
  "max-claw": {
    name: "MaxClaw",
    path: "/max-claw",
    colour: "#e5484d",
    tagline: "Your 24/7 personal assistant.",
    sectionTitle: "What you get",
    features: [
      "Make it yours. Name it, shape its personality, and it remembers every conversation and preference.",
      "Always on, zero wait. Live in 10 seconds, running 24/7 in the cloud.",
      "Right where you need it. Accessible in your daily apps, with expanding support for more.",
    ],
    availableOn: "Telegram",
  },
};
