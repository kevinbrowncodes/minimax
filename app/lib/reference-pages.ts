/**
 * The words on the pages behind the sidebar (STORY_025), read off the 2026-09-14 captures: page-plugins@1440,
 * agents-guide-view-now@1440, page-scheduled@1440, page-connect-mobile@1440, page-maxhermes@1440, page-maxclaw@1440.
 * Names and one-line descriptions are plain text; the reference's logos and art are not reproduced (CLAUDE.md §3e).
 */

export const PLUGIN_CATEGORIES = ["All", "Office", "Studio", "Design & sites", "Code", "Biz", "Sales", "Prod", "Sci & health", "Edu", "Other"] as const;

export interface PluginCard {
  readonly name: string;
  readonly description: string;
  /** The drawn tile's hue for the glyph (our own, not the plugin's logo). */
  readonly hue: number;
}

export const PLUGINS: readonly PluginCard[] = [
  { name: "Excel", description: "Create, edit, analyze, and convert spreadsheets.", hue: 140 },
  { name: "EverMe", description: "Connect EverMe to read, search, and write notes.", hue: 45 },
  { name: "Linear", description: "Connect Linear to find, create, and update issues.", hue: 230 },
  { name: "Notion", description: "Connect your Notion workspace to read and write pages.", hue: 0 },
  { name: "PDF", description: "Create, read, reformat, fill, transform and merge PDFs.", hue: 5 },
  { name: "PPT", description: "Read, analyze, create, and edit PowerPoint decks.", hue: 20 },
  { name: "Nowledge Mem", description: "Give MiniMax durable, cross-tool memory.", hue: 210 },
  { name: "Obsidian Skills", description: "Create and edit Obsidian Markdown notes.", hue: 265 },
];
export const PLUGINS_TOTAL = 27;

export interface SkillCard {
  readonly name: string;
  readonly uses: string;
}

export const SKILLS: readonly SkillCard[] = [
  { name: "html-presentation-generator", uses: "10K" },
  { name: "landing-page-builder", uses: "9.7K" },
  { name: "minimax-pdf", uses: "8.3K" },
  { name: "minimax-docx", uses: "7.4K" },
  { name: "visual-content-generator", uses: "7K" },
  { name: "pptx-generator", uses: "6.4K" },
  { name: "video-story-generator", uses: "5.6K" },
  { name: "minimax-xlsx", uses: "5.4K" },
];
export const SKILL_AUTHOR = "@MiniMax Code";

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
