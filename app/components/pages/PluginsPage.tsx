"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { cx } from "@/lib/cx";
import { PLUGIN_CATEGORIES, PLUGINS, PLUGINS_TOTAL, SKILL_AUTHOR, SKILLS } from "@/lib/reference-pages";
import { Inert } from "@/components/shell/Inert";
import { usePageActions } from "@/components/shell/ShellContext";
import { IconFilter, IconGear, IconPlugins, IconPlus, IconRefresh, IconSearch, IconSkill } from "@/components/shell/icons";
import styles from "./pages.module.css";

type Segment = "Market" | "Personal";

/**
 * Plugins (STORY_025; page-plugins@1440, page-plugins-tab-personal@1440): the reference's marketplace — Market with its
 * categories, search, plugin and skill cards; Personal with its search and empty state. Every control is inert but the
 * segments and Manage, which is our page too. The bar's chrome (segments, Refresh, Manage, Create) goes through the Shell.
 */
export function PluginsPage() {
  const [segment, setSegment] = useState<Segment>("Market");
  const actions = useMemo(
    () => (
      <>
        <div className={styles.segments} role="tablist" aria-label="Plugins">
          {(["Market", "Personal"] as const).map((s) => (
            <button key={s} type="button" role="tab" aria-selected={segment === s} className={cx(styles.segment, segment === s && styles.segmentActive)} onClick={() => { setSegment(s); }}>
              {s}
            </button>
          ))}
        </div>
        <span className={styles.barRight}>
          <Inert label="Refresh" className={styles.barIcon} align="end"><IconRefresh /></Inert>
          <Link href="/plugins/manage" className={styles.barSecondary}><IconGear /> <span className={styles.barLabel}>Manage</span></Link>
          <Inert label="Create" className={styles.barPrimary} align="end"><IconPlus /> <span className={styles.barLabel}>Create</span></Inert>
        </span>
      </>
    ),
    [segment],
  );
  usePageActions(actions);

  if (segment === "Personal") {
    return (
      <main className={cx(styles.page, styles.pluginsPage)} data-testid="plugins-page">
        <label className={cx(styles.search, styles.searchTop)}>
          <IconSearch />
          <input type="search" placeholder="Search skills..." aria-label="Search skills" readOnly />
        </label>
        <div className={styles.personalEmpty} data-testid="plugins-empty">
          <span className={styles.personalGlyph} aria-hidden="true"><IconPlugins /></span>
          No matching plugins or skills
        </div>
      </main>
    );
  }

  return (
    <main className={cx(styles.page, styles.pluginsPage)} data-testid="plugins-page">
      <div className={styles.categories} role="group" aria-label="Categories">
        {PLUGIN_CATEGORIES.map((c, i) => (
          <Inert key={c} label={c} className={cx(styles.category, i === 0 && styles.categoryActive)}>{c}</Inert>
        ))}
      </div>
      <label className={styles.search}>
        <IconSearch />
        <input type="search" placeholder="Search plugins or skills..." aria-label="Search plugins or skills" readOnly />
      </label>

      <h2 className={styles.sectionHeading}>Plugins</h2>
      <ul className={styles.cards} aria-label="Plugins">
        {PLUGINS.map((plugin) => (
          <li key={plugin.name} className={styles.card}>
            {/* our drawn tile: the plugin's initial on a tinted square, never its logo (STORY_025 › Departures) */}
            <span className={styles.cardTile} style={{ background: `hsl(${String(plugin.hue)} 70% 92%)`, color: `hsl(${String(plugin.hue)} 60% 35%)` }} aria-hidden="true">{plugin.name.slice(0, 1)}</span>
            <span className={styles.cardText}>
              <span className={styles.cardName}>{plugin.name}</span>
              <span className={styles.cardLine}>{plugin.description}</span>
            </span>
            <Inert label={`Install ${plugin.name}`} className={styles.install}>Install</Inert>
          </li>
        ))}
      </ul>
      <Inert role="link" label={`View all ${String(PLUGINS_TOTAL)}`} className={styles.viewAll}>
        <span className={styles.viewAllDots} aria-hidden="true"><i /><i /><i /></span>
        View all {PLUGINS_TOTAL}
      </Inert>

      <h2 className={cx(styles.sectionHeading, styles.sectionHeadingRow)}>
        Skills
        <Inert label="Filter skills" className={styles.barIcon} align="end"><IconFilter /></Inert>
      </h2>
      <ul className={styles.cards} aria-label="Skills">
        {SKILLS.map((skill) => (
          <li key={skill.name} className={styles.card}>
            <span className={styles.cardGlyph} aria-hidden="true"><IconSkill /></span>
            <span className={styles.cardText}>
              <span className={styles.cardName}>{skill.name}</span>
              <span className={styles.cardLine}>{SKILL_AUTHOR} · {skill.uses} uses</span>
            </span>
            <Inert label={`Install ${skill.name}`} className={styles.install}>Install</Inert>
          </li>
        ))}
      </ul>
    </main>
  );
}
