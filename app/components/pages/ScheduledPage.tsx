"use client";
import { useMemo } from "react";
import { cx } from "@/lib/cx";
import { Inert } from "@/components/shell/Inert";
import { usePageActions } from "@/components/shell/ShellContext";
import { IconChevronDown, IconPlus, IconSearch } from "@/components/shell/icons";
import styles from "./pages.module.css";

/** Scheduled (STORY_025; page-scheduled@1440): "Schedules", the search with its status filter, the empty line; Create ▾ in the bar. */
export function ScheduledPage() {
  const actions = useMemo(
    () => (
      <>
        <span className={styles.barCentre}>Schedules</span>
        <span className={cx(styles.barRight, styles.splitButton)}>
          <Inert label="Create" className={cx(styles.barPrimary, styles.splitMain)} align="end"><IconPlus /> <span className={styles.barLabel}>Create</span></Inert>
          <Inert label="More create actions" className={cx(styles.barPrimary, styles.splitMore)} align="end"><IconChevronDown /></Inert>
        </span>
      </>
    ),
    [],
  );
  usePageActions(actions);
  return (
    <main className={cx(styles.page, styles.scheduledPage)} data-testid="scheduled-page">
      <h1 className={styles.pageTitle}>Schedules</h1>
      <div className={styles.scheduledToolbar}>
        <label className={cx(styles.search, styles.searchWide)}>
          <IconSearch />
          <input type="search" placeholder="Search scheduled tasks" aria-label="Search scheduled tasks" readOnly />
        </label>
        <Inert label="Scheduled task status" className={styles.statusFilter}>All <IconChevronDown /></Inert>
      </div>
      <p className={styles.scheduledEmpty}>No scheduled tasks yet.</p>
    </main>
  );
}
