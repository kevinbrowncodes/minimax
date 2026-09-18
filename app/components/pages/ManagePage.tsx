"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cx } from "@/lib/cx";
import type { Capabilities } from "@/lib/job-api";
import { AGENTS, AGENT_SYSTEM_PROMPT, MANAGE_TABS } from "@/lib/reference-pages";
import { searchSkills, type Skill } from "@/lib/skills";
import { searchDirectors } from "@/lib/agent-skills";
import type { AgentSkill } from "@/lib/composer-state";
import { DirectorSkills } from "./DirectorSkills";
import { Inert } from "@/components/shell/Inert";
import { useSettings } from "@/components/shell/SettingsContext";
import { IconAgent, IconChevronDown, IconPlus, IconSearch, IconSkill, IconVideo } from "@/components/shell/icons";
import styles from "./pages.module.css";

export type ManageTab = (typeof MANAGE_TABS)[number]["label"];

export interface ManagePageProps {
  readonly initialTab?: ManageTab;
  /** STORY_040: open the Create template form (+ › Skills › Add template; STORY_054's wording). */
  readonly createSkill?: boolean;
  readonly fetchImpl?: typeof fetch;
  readonly confirmImpl?: (message: string) => boolean;
}

/**
 * Plugins (STORY_025; agents-guide-view-now@1440): the reference's "Management" page with its four counted tabs.
 * STORY_040 gives three of them their local meaning (behaviour-manage-tabs-02..04): **Plugins** — the one plugin,
 * video-creator, described from what the Spark's adapter reports, with its switch (the video-enabled setting) and its
 * details; **Skills** — STORY_054: the director skills the agent follows (the folders under agents/skills/, with what each
 * was verified against; Use → the composer with the chip on) above the owner's **Templates** (STORY_040's snippets: a
 * built-in Short-to-script, searched, created, edited, deleted, and **Use**d into the composer); **Apps** — the honest
 * empty line. **Agents** stays the read-only editor (STORY_038 deferred).
 */
export function ManagePage({ initialTab = "Plugins", createSkill = false, fetchImpl, confirmImpl }: ManagePageProps) {
  const doFetch = fetchImpl ?? fetch;
  const confirm = confirmImpl ?? ((message: string) => window.confirm(message));
  const router = useRouter();
  const { settings, update } = useSettings();
  const [tab, setTab] = useState<ManageTab>(initialTab);
  const [capabilities, setCapabilities] = useState<Capabilities | undefined | null>(undefined); // null = the adapter did not answer
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [skills, setSkills] = useState<readonly Skill[]>([]);
  const [directors, setDirectors] = useState<readonly AgentSkill[]>([]); // STORY_054: the folders the agent can follow
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<{ readonly id?: string; readonly name: string; readonly description: string; readonly template: string } | undefined>(createSkill ? { name: "", description: "", template: "" } : undefined);
  const [formError, setFormError] = useState<string | undefined>(undefined);

  const loadSkills = (): Promise<void> =>
    doFetch("/api/skills")
      .then(async (res) => (res.ok ? ((await res.json()) as { skills: Skill[] }).skills : []))
      .catch(() => [] as Skill[])
      .then(setSkills);
  useEffect(() => {
    let cancelled = false;
    void doFetch("/api/capabilities")
      .then(async (res) => (res.ok ? ((await res.json()) as Capabilities) : null))
      .catch(() => null)
      .then((caps) => {
        if (!cancelled) setCapabilities(caps);
      });
    void doFetch("/api/skills")
      .then(async (res) => (res.ok ? ((await res.json()) as { skills: Skill[] }).skills : []))
      .catch(() => [] as Skill[])
      .then((list) => {
        if (!cancelled) setSkills(list);
      });
    void doFetch("/api/agent/skills")
      .then(async (res) => {
        const body: unknown = res.ok ? await res.json() : undefined;
        const list = typeof body === "object" && body !== null ? (body as { skills?: unknown }).skills : undefined;
        return Array.isArray(list) ? (list as AgentSkill[]) : [];
      })
      .catch(() => [] as AgentSkill[])
      .then((list) => {
        if (!cancelled) setDirectors(list);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once on mount
  }, []);

  const counts: Record<ManageTab, number> = { Plugins: 1, Skills: directors.length + skills.length, Apps: 0, Agents: AGENTS.length };
  const shownSkills = searchSkills(skills, query);
  const shownDirectors = searchDirectors(directors, query);
  const searching = query.trim() !== "";

  const saveSkill = async (): Promise<void> => {
    if (!editing) return;
    if (editing.name.trim() === "" || editing.template.trim() === "") {
      setFormError("A template needs a name and its text");
      return;
    }
    const body = JSON.stringify({ name: editing.name, description: editing.description, template: editing.template });
    const res = await doFetch(editing.id === undefined ? "/api/skills" : `/api/skills/${encodeURIComponent(editing.id)}`, { method: editing.id === undefined ? "POST" : "PATCH", headers: { "content-type": "application/json" }, body }).catch(() => undefined);
    if (res?.ok !== true) {
      setFormError("That did not save — the app's server did not answer");
      return;
    }
    setEditing(undefined);
    setFormError(undefined);
    await loadSkills();
  };
  const deleteSkill = async (skill: Skill): Promise<void> => {
    if (!confirm(`Delete the template "${skill.name}"?`)) return;
    await doFetch(`/api/skills/${encodeURIComponent(skill.id)}`, { method: "DELETE" }).catch(() => undefined);
    await loadSkills();
  };

  return (
    <main className={cx(styles.page, styles.managePage)} data-testid="manage-page">
      <h1 className={styles.manageHeading}>Management</h1>
      <div className={styles.manageHead}>
        <div className={styles.manageTabs} role="tablist" aria-label="Management">
          {MANAGE_TABS.map((t) => (
            <button key={t.label} type="button" role="tab" aria-selected={tab === t.label} className={cx(styles.manageTab, tab === t.label && styles.manageTabActive)} onClick={() => { setTab(t.label); }}>
              {t.label} <span className={styles.manageCount}>{counts[t.label]}</span>
            </button>
          ))}
        </div>
        {tab === "Skills" ? (
          <label className={styles.manageSearch}>
            <IconSearch />
            <input type="search" placeholder="Search skills" aria-label="Search skills" value={query} onChange={(event) => { setQuery(event.target.value); }} />
          </label>
        ) : null}
      </div>

      {tab === "Plugins" ? (
        // behaviour-manage-tabs-02-tab-plugins: one row — glyph, name, one line, the switch
        <ul className={styles.pluginList} aria-label="Plugins">
          <li className={styles.pluginRow} data-testid="plugin-row">
            <span className={styles.pluginGlyph} aria-hidden="true"><IconVideo /></span>
            <span className={styles.pluginText}>
              <span className={styles.pluginName}>video-creator</span>
              <span className={styles.pluginLine}>
                {capabilities === undefined
                  ? "Asking the Spark's adapter…"
                  : capabilities === null
                    ? "MiniMax-H3 on the Spark through the adapter · ○ not reachable"
                    : `${capabilities.models.map((m) => m.label).join(" / ")} on the Spark through the adapter · ${capabilities.resolutions.join(" / ")} · ${String(capabilities.durationsSeconds.min)}–${String(capabilities.durationsSeconds.max)} s · ● reachable`}
              </span>
              <button type="button" className={styles.pluginDetails} aria-expanded={detailsOpen} onClick={() => { setDetailsOpen((o) => !o); }}>Details</button>
              {detailsOpen && capabilities ? (
                <dl className={styles.pluginCaps} data-testid="plugin-details">
                  <dt>Models</dt><dd>{capabilities.models.map((m) => `${m.label} (${m.id})`).join(", ")}</dd>
                  <dt>Ratios</dt><dd>{capabilities.ratios.join(" · ")}</dd>
                  <dt>Resolutions</dt><dd>{capabilities.resolutions.join(" · ")}</dd>
                  <dt>Duration</dt><dd>{String(capabilities.durationsSeconds.min)}–{String(capabilities.durationsSeconds.max)} s, step {String(capabilities.durationsSeconds.step)}</dd>
                  <dt>Reference images</dt><dd>up to {String(capabilities.referenceImages.max)}</dd>
                  <dt>Extension</dt><dd>{capabilities.extension ? `+${String(capabilities.extension.durationsSeconds.min)}–${String(capabilities.extension.durationsSeconds.max)} s, sources up to ${String(capabilities.extension.maxSourceSeconds)} s` : "not offered"}</dd>
                </dl>
              ) : null}
            </span>
            <button type="button" role="switch" aria-checked={settings.videoEnabled} aria-label="video-creator enabled" className={cx(styles.pluginSwitch, !settings.videoEnabled && styles.pluginSwitchOff)} onClick={() => { update({ videoEnabled: !settings.videoEnabled }); }}>
              <span className={styles.pluginKnob} />
            </button>
          </li>
        </ul>
      ) : null}

      {tab === "Skills" ? (
        // behaviour-manage-tabs-03-tab-skills: glyph · name · Built-in · one line; ours add the Director skills section (STORY_054) and, under Templates, Use / Edit / Delete and Create template
        <div>
          <DirectorSkills skills={shownDirectors} searching={searching} />
          {searching && shownDirectors.length === 0 && shownSkills.length === 0 ? <p className={styles.manageEmpty}>No matching results</p> : null}
          {searching && shownSkills.length === 0 ? null : (
          <section className={styles.skillSection} aria-labelledby="templates-title" data-testid="templates">
          <div className={styles.skillSectionHead}>
            <h2 id="templates-title" className={styles.skillSectionTitle}>Templates</h2>
            <span className={styles.skillSectionNote}>snippets that fill the composer</span>
          </div>
          {editing ? (
            <form
              className={styles.skillForm}
              aria-label={editing.id === undefined ? "Create template" : "Edit template"}
              onSubmit={(event) => {
                event.preventDefault();
                void saveSkill();
              }}
            >
              <label className={styles.skillField}><span>Name</span><input aria-label="Template name" value={editing.name} onChange={(event) => { setEditing({ ...editing, name: event.target.value }); }} /></label>
              <label className={styles.skillField}><span>Description</span><input aria-label="Template description" value={editing.description} onChange={(event) => { setEditing({ ...editing, description: event.target.value }); }} /></label>
              <label className={styles.skillField}><span>Template — {"{{idea}}"} is replaced by what is typed in the composer</span><textarea aria-label="Template text" rows={5} value={editing.template} onChange={(event) => { setEditing({ ...editing, template: event.target.value }); }} /></label>
              {formError !== undefined ? <p className={styles.skillError} role="alert">{formError}</p> : null}
              <div className={styles.skillFormActions}>
                <button type="button" className={styles.barSecondary} onClick={() => { setEditing(undefined); setFormError(undefined); }}>Cancel</button>
                <button type="submit" className={styles.barPrimary}>{editing.id === undefined ? "Create" : "Save"} template</button>
              </div>
            </form>
          ) : (
            <button type="button" className={styles.skillCreate} onClick={() => { setEditing({ name: "", description: "", template: "" }); }}><IconPlus /> Create template</button>
          )}
          {shownSkills.length === 0 ? (
            <p className={styles.skillSectionEmpty}>No templates yet</p>
          ) : (
            <ul className={styles.skillList} aria-label="Templates">
              {shownSkills.map((skill) => (
                <li key={skill.id} className={styles.skillRow} data-testid="skill-row">
                  <span className={styles.pluginGlyph} aria-hidden="true"><IconSkill /></span>
                  <span className={styles.pluginText}>
                    <span className={styles.pluginName}>{skill.name} {skill.builtIn === true ? <span className={styles.skillBadge}>Built-in</span> : null}</span>
                    <span className={styles.pluginLine} title={skill.description}>{skill.description}</span>
                  </span>
                  <span className={styles.skillActions}>
                    <button type="button" className={styles.smallButton} aria-label={`Use ${skill.name}`} onClick={() => { router.push(`/?skill=${encodeURIComponent(skill.id)}`); }}>Use</button>
                    <button type="button" className={styles.smallButton} aria-label={`Edit ${skill.name}`} disabled={skill.builtIn === true} onClick={() => { setEditing({ id: skill.id, name: skill.name, description: skill.description, template: skill.template }); setFormError(undefined); }}>Edit</button>
                    <button type="button" className={cx(styles.smallButton, styles.smallButtonDanger)} aria-label={`Delete ${skill.name}`} disabled={skill.builtIn === true} onClick={() => void deleteSkill(skill)}>Delete</button>
                  </span>
                </li>
              ))}
            </ul>
          )}
          </section>
          )}
        </div>
      ) : null}

      {tab === "Apps" ? <p className={styles.manageEmpty}>No apps — MiniMax Local has no app store.</p> : null}

      {tab === "Agents" ? (
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
      ) : null}
    </main>
  );
}
