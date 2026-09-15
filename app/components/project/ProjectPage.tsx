"use client";
import Link from "next/link";
import type { Project } from "@/lib/project-store";
import { recentLabel } from "@/lib/recents";
import type { RecentEntry } from "@/lib/route-title";
import { IconProject } from "@/components/shell/icons";
import styles from "./project.module.css";

export interface ProjectPageProps {
  readonly project: Project;
  readonly tasks: readonly RecentEntry[];
}

/**
 * The project's page (STORY_031; the reference shows the project's name as the page's h1 on /mavis — ours has its own
 * route, Departures): the name, its tasks as rows (stamp and title, CHORE_008), "No tasks", and a New task button that
 * opens the home composer in the project.
 */
export function ProjectPage({ project, tasks }: ProjectPageProps) {
  return (
    <main className={styles.page}>
      <div className={styles.head}>
        <h1 className={styles.title}><IconProject /> {project.name}</h1>
        <Link href={`/?project=${encodeURIComponent(project.id)}`} className={styles.newTask}>+ New task</Link>
      </div>
      {tasks.length === 0 ? (
        <p className={styles.empty}>No tasks</p>
      ) : (
        <ul className={styles.list} aria-label={`Tasks in ${project.name}`}>
          {tasks.map((task) => (
            <li key={task.id}>
              <Link href={`/task/${encodeURIComponent(task.id)}`} className={styles.task}>
                <span className={styles.stamp}>{recentLabel(task)}</span>
                <span className={styles.taskTitle}>{task.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
