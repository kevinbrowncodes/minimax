import { agentSettings } from "@/lib/agent-config";
import { readSkills } from "@/lib/agent-request";
import { guarded } from "@/lib/model-client";

export const dynamic = "force-dynamic";

const warned = new Set<string>();

/** GET /api/agent/skills — the director skills the agent can follow (STORY_049): one entry per folder under SKILLS_DIR with a valid SKILL.md. */
export function GET(): Promise<Response> {
  return guarded(() => {
    const { skills, failed } = readSkills(agentSettings().skillsDir);
    for (const f of failed) {
      if (!warned.has(f.id)) {
        warned.add(f.id);
        console.warn(`[agent] skipping skill folder ${f.id}: ${f.message}`);
      }
    }
    return Promise.resolve(Response.json({ skills: skills.map((s) => ({ id: s.id, name: s.name, description: s.description, metadata: s.metadata })) }));
  });
}
