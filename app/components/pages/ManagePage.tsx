"use client";
import Link from "next/link";
import { useMemo } from "react";
import { cx } from "@/lib/cx";
import { AGENTS, AGENT_SYSTEM_PROMPT, MANAGE_TABS } from "@/lib/reference-pages";
import { Inert } from "@/components/shell/Inert";
import { usePageActions } from "@/components/shell/ShellContext";
import { IconAgent, IconBack, IconChevronDown, IconPlus } from "@/components/shell/icons";
import styles from "./pages.module.css";

/**
 * Plugins › Manage (STORY_025; agents-guide-view-now@1440): "Management" with its four counted tabs, the Agents tab
 * open — General / Coder / Verifier and Create agent on the left, the agent editor on the right. Inert, read-only.
 */
export function ManagePage() {
  const actions = useMemo(() => <Link href="/plugins" className={styles.backLink}><IconBack /> Plugins</Link>, []);
  usePageActions(actions);
  return (
    <main className={cx(styles.page, styles.managePage)} data-testid="manage-page">
      <h1 className={styles.manageHeading}>Management</h1>
      <div className={styles.manageTabs} role="tablist" aria-label="Management">
        {MANAGE_TABS.map((tab) => (
          <Inert key={tab.label} role="tab" ariaSelected={tab.label === "Agents"} label={`${tab.label} ${String(tab.count)}`} className={cx(styles.manageTab, tab.label === "Agents" && styles.manageTabActive)}>
            {tab.label} <span className={styles.manageCount}>{tab.count}</span>
          </Inert>
        ))}
      </div>
      <div className={styles.manageBody}>
        <div className={styles.agentList}>
          <p className={styles.agentListTitle}>All agents</p>
          {AGENTS.map((agent, i) => (
            <Inert key={agent} label={agent} className={cx(styles.agentRow, i === 0 && styles.agentRowActive)}>
              <span className={styles.agentGlyph} aria-hidden="true"><IconAgent /></span>
              {agent}
            </Inert>
          ))}
          <Inert label="Create agent" className={cx(styles.agentRow, styles.agentRowMuted)}><IconPlus /> Create agent</Inert>
        </div>
        <div className={styles.agentEditor}>
          <div className={styles.editorRow}>
            <label className={styles.editorField}>
              <span className={styles.editorLabel}>Portrait</span>
              <span className={styles.portrait} aria-hidden="true"><IconAgent /></span>
            </label>
            <label className={cx(styles.editorField, styles.editorGrow)}>
              <span className={styles.editorLabel}>Name</span>
              <input className={styles.editorInput} value="General" readOnly aria-label="Name" />
            </label>
          </div>
          <label className={styles.editorField}>
            <span className={styles.editorLabel}>Model</span>
            <Inert label="Model: Auto" className={cx(styles.editorInput, styles.editorSelect)}>Auto <IconChevronDown /></Inert>
          </label>
          <label className={styles.editorField}>
            <span className={styles.editorLabel}>System prompt</span>
            <textarea className={cx(styles.editorInput, styles.editorPrompt)} value={AGENT_SYSTEM_PROMPT} readOnly aria-label="System prompt" rows={8} />
          </label>
          <div className={styles.editorActions}>
            <Inert label="Save" className={styles.barSecondary} align="end">Save</Inert>
            <Inert label="Chat with it" className={styles.barPrimary} align="end">Chat with it</Inert>
          </div>
        </div>
      </div>
    </main>
  );
}
