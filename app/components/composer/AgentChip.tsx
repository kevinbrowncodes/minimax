"use client";
import { cx } from "@/lib/cx";
import { agentSkillLabel, type AgentSkill } from "@/lib/composer-state";
import { IconSettings } from "@/components/shell/icons";
import styles from "./composer.module.css";

/** The director's chair — the chip's glyph. */
const IconDirector = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 4.5h10M4 4.5 3 13M12 4.5l1 8.5M4.5 8.5h7M3.5 13h9" />
  </svg>
);

export interface AgentChipProps {
  readonly on: boolean;
  readonly skills: readonly AgentSkill[];
  readonly skillId: string | undefined;
  /** Not configured (the reason), or extend mode (its own reason): the chip is greyed and says why. */
  readonly disabledReason?: string;
  /** While a run is in flight nothing on the chip answers. */
  readonly busy?: boolean;
  /** The menu is open (the composer owns which popover is open). */
  readonly menuOpen: boolean;
  /** Narrow (STORY_050): the chip keeps its glyph and "Agent"; the skill name moves into the menu's title. */
  readonly narrow?: boolean;
  readonly onToggle: () => void;
  readonly onMenu: () => void;
  readonly onSkill: (id: string) => void;
  readonly onManage: () => void;
}

/**
 * The Agent chip (STORY_050; Google Flow's chip in the reference's Agent Team slot — home-signed-in@1440: 32 px tall,
 * radius 10, 14 px/400, blue rgb(0,148,252) when on). Off: the glyph and "Agent", muted. On: "Agent · <skill>" with a ⌄
 * that opens the Skills menu (the model menu's chrome): one radio row per director skill, name + one line, the chosen
 * one checked, and Manage skills.
 */
export function AgentChip({ on, skills, skillId, disabledReason, busy = false, menuOpen, narrow = false, onToggle, onMenu, onSkill, onManage }: AgentChipProps) {
  const chosen = skills.find((s) => s.id === skillId);
  const label = agentSkillLabel(chosen);
  const disabled = disabledReason !== undefined;
  return (
    <span className={styles.agentWrap} data-popover="agent-skill">
      <button
        type="button"
        className={cx(styles.agentChip, on && styles.agentChipOn)}
        aria-pressed={on}
        aria-label={on ? `Agent on · ${label}` : "Agent"}
        aria-disabled={disabled || busy ? true : undefined}
        title={disabledReason}
        onClick={() => {
          if (disabled || busy) return;
          onToggle();
        }}
        data-testid="agent-chip"
      >
        <IconDirector />
        <span className={styles.agentChipWord}>Agent</span>
        {on && !narrow && label !== "" ? <span className={styles.agentChipSkill}>· {label}</span> : null}
      </button>
      {on ? (
        <button type="button" className={cx(styles.agentChipMenu, styles.agentChipOn)} aria-label="Choose the agent's skill" aria-haspopup="menu" aria-expanded={menuOpen} disabled={busy} onClick={onMenu}>
          <span aria-hidden="true">⌄</span>
        </button>
      ) : null}
      {on && menuOpen ? (
        <div className={cx(styles.menu, styles.agentSkillMenu)} role="menu" aria-label="Skills">
          <div className={styles.agentMenuTitle}>Skills{narrow && label !== "" ? ` · ${label}` : ""}</div>
          {skills.length === 0 ? <div className={styles.menuNote}>No director skills — add a folder under agents/skills</div> : null}
          {skills.map((skill) => (
            <button key={skill.id} type="button" role="menuitemradio" aria-checked={skill.id === skillId} className={cx(styles.menuItem, styles.agentMenuItem)} title={skill.description} onClick={() => { onSkill(skill.id); }}>
              <span className={styles.agentMenuText}>
                <span>{skill.id === skillId ? "● " : "○ "}{agentSkillLabel(skill)}</span>
                <span className={styles.agentMenuDesc}>{skill.description}</span>
              </span>
              {skill.id === skillId ? <span aria-hidden="true">✓</span> : null}
            </button>
          ))}
          <div className={styles.agentMenuSeparator} />
          <button type="button" role="menuitem" className={styles.menuItem} onClick={onManage}>
            <span className={styles.agentMenuText}><span><IconSettings /> Manage skills</span></span>
          </button>
        </div>
      ) : null}
    </span>
  );
}
