"use client";
import { createContext, useContext } from "react";
import type { Project } from "@/lib/project-store";

/**
 * The owner's projects, fetched by the Shell and read by the composer (STORY_031): the list for + › Add to project and
 * the chip, and a way to open the Create project dialog with a callback for the project it makes. Outside a Shell
 * (component tests) there are no projects and Add new project does nothing.
 */
export interface ProjectsState {
  readonly projects: readonly Project[];
  readonly openCreate: (onCreated?: (project: Project) => void) => void;
}

export const ProjectsContext = createContext<ProjectsState>({ projects: [], openCreate: () => undefined });

export function useProjects(): ProjectsState {
  return useContext(ProjectsContext);
}
