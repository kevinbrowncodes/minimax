"use client";
import { useRouter } from "next/navigation";
import { skillMetaLine } from "@/lib/agent-skills";
import { agentSkillLabel, type AgentSkill } from "@/lib/composer-state";
import { IconSkill } from "@/components/shell/icons";
import styles from "./pages.module.css";

export interface DirectorSkillsProps {
  /** The rows to show — already searched by the tab. */
  readonly skills: readonly AgentSkill[];
  /** The tab's query, so the section can say whether nothing matched or there is nothing at all. */
  readonly searching: boolean;
}

/**
 * STORY_054: the Director skills section of Management › Skills — one row per folder under agents/skills/
 * (GET /api/agent/skills): the glyph, the short name, a Folder badge in the Built-in badge's chrome, the description on
 * one line, and the meta line from the skill's metadata; Use opens the home composer with the chip on and that skill
 * chosen (/?agent=<id>). No Edit, no Delete — a folder is edited in git; the note under the list says how to add one.
 */
export function DirectorSkills({ skills, searching }: DirectorSkillsProps) {
  const router = useRouter();
  if (skills.length === 0 && searching) return null; // no match in this section: its heading goes too
  return (
    <section className={styles.skillSection} aria-labelledby="director-skills-title" data-testid="director-skills">
      <div className={styles.skillSectionHead}>
        <h2 id="director-skills-title" className={styles.skillSectionTitle}>Director skills</h2>
        <span className={styles.skillSectionNote}>the agent follows one</span>
      </div>
      {skills.length === 0 ? (
        <p className={styles.skillSectionEmpty}>No director skills — the app was built without a folder under <code>agents/skills/</code>.</p>
      ) : (
        <ul className={styles.skillList} aria-label="Director skills">
          {skills.map((skill) => {
            const label = agentSkillLabel(skill);
            const meta = skillMetaLine(skill.metadata);
            return (
              <li key={skill.id} className={styles.skillRow} data-testid="director-row">
                <span className={styles.pluginGlyph} aria-hidden="true"><IconSkill /></span>
                <span className={styles.pluginText}>
                  <span className={styles.pluginName}>{label} <span className={styles.skillBadge}>Folder</span></span>
                  <span className={styles.pluginLine} title={skill.description}>{skill.description}</span>
                  {meta === "" ? null : <span className={styles.skillMeta} data-testid="director-meta">{meta}</span>}
                </span>
                <span className={styles.skillActions}>
                  <button type="button" className={styles.smallButton} aria-label={`Use ${label}`} onClick={() => { router.push(`/?agent=${encodeURIComponent(skill.id)}`); }}>Use</button>
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <p className={styles.skillSectionFoot}>A skill is a folder under <code>agents/skills/</code> — add one by adding a folder and rebuilding the app (<a href="https://github.com/kevinbrowncodes/minimax/blob/develop/README.md#agent-mode--a-director-in-the-cloud-epic_009-story_047-the-credential" target="_blank" rel="noreferrer">README › Agent mode</a>).</p>
    </section>
  );
}
