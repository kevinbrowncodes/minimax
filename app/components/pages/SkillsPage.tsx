"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cx } from "@/lib/cx";
import { searchSkills, type Skill } from "@/lib/skills";
import { searchDirectors } from "@/lib/agent-skills";
import type { AgentSkill } from "@/lib/composer-state";
import { IconPlus, IconSearch, IconSkill } from "@/components/shell/icons";
import { DirectorSkills } from "./DirectorSkills";
import styles from "./pages.module.css";

export interface SkillsPageProps {
  /** Open the Create template form (+ › Skills › Add template; `/skills?create=1`). */
  readonly createTemplate?: boolean;
  readonly fetchImpl?: typeof fetch;
  readonly confirmImpl?: (message: string) => boolean;
}

/**
 * Skills (STORY_059; the Skills tab of STORY_040/054's Management page, lifted out when the other tabs went): the
 * director skills the agent follows — the folders under agents/skills/ with what each was verified against, Use →
 * the composer with the chip on — above the owner's Templates (a built-in Short-to-script and his own; searched,
 * created, edited, deleted, Use'd into the composer). One page, no tabs.
 */
export function SkillsPage({ createTemplate = false, fetchImpl, confirmImpl }: SkillsPageProps) {
  const doFetch = fetchImpl ?? fetch;
  const confirm = confirmImpl ?? ((message: string) => window.confirm(message));
  const router = useRouter();
  const [skills, setSkills] = useState<readonly Skill[]>([]);
  const [directors, setDirectors] = useState<readonly AgentSkill[]>([]);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<{ readonly id?: string; readonly name: string; readonly description: string; readonly template: string } | undefined>(createTemplate ? { name: "", description: "", template: "" } : undefined);
  const [formError, setFormError] = useState<string | undefined>(undefined);

  const loadSkills = (): Promise<void> =>
    doFetch("/api/skills")
      .then(async (res) => (res.ok ? ((await res.json()) as { skills: Skill[] }).skills : []))
      .catch(() => [] as Skill[])
      .then(setSkills);
  useEffect(() => {
    let cancelled = false;
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
    <main className={cx(styles.page, styles.managePage)} data-testid="skills-page">
      <div className={styles.manageHead}>
        <h1 className={styles.manageHeading}>Skills</h1>
        <label className={styles.manageSearch}>
          <IconSearch />
          <input type="search" placeholder="Search skills" aria-label="Search skills" value={query} onChange={(event) => { setQuery(event.target.value); }} />
        </label>
      </div>
      {/* behaviour-manage-tabs-03-tab-skills: glyph · name · Built-in · one line; ours: the Director skills section (STORY_054) and, under Templates, Use / Edit / Delete and Create template */}
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
    </main>
  );
}
