import { useEffect, useRef } from 'react';

import { useStudio } from '../studio/StudioContext';

import type { LauncherProject } from './projectStore';

export interface LauncherHandoffProps {
  project: LauncherProject;
}

/**
 * LauncherHandoff
 * ----------------
 * Applies the launcher's decision to a freshly mounted Studio.
 *
 * The launcher cannot configure the editor before it exists, so this component
 * runs once on mount and pushes the chosen project's name, scenario, render mode
 * and renderer into the live application. Everything after this point is driven
 * by the editor's own state.
 */
export function LauncherHandoff({ project }: LauncherHandoffProps): null {
  const { application, createProject, setRenderMode, setRendererBackend } = useStudio();
  const appliedRef = useRef<string | null>(null);

  useEffect(() => {
    // Runs once per project: re-applying on every render would keep resetting
    // the render mode while the user is working.
    if (appliedRef.current === project.id) return;
    appliedRef.current = project.id;

    createProject(project.name);
    setRenderMode(project.renderMode);
    setRendererBackend(project.renderer);

    if (project.scenarioId && project.scenarioId !== 'default') {
      application.selectCyberScenario(project.scenarioId);
    }
  }, [application, createProject, project, setRenderMode, setRendererBackend]);

  return null;
}
