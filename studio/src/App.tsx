import { useCallback, useMemo, useState } from 'react';

import { BootScreen } from './launcher/BootScreen';
import { LauncherApp } from './launcher/LauncherApp';
import { LauncherHandoff } from './launcher/LauncherHandoff';
import { MemoryLauncherStorage, ProjectStore } from './launcher/projectStore';
import { StudioWorkspace } from './shell/StudioWorkspace';
import { StudioProvider } from './studio/StudioContext';

import type { LauncherProject } from './launcher/projectStore';

const IS_E2E = import.meta.env.VITE_E2E === '1';

function e2eProject(): LauncherProject {
  return {
    id: 'e2e-project',
    name: 'E2E Cyber Project',
    scenarioId: 'lab-basic',
    renderMode: '3d',
    renderer: 'engine-gpu',
    createdAt: new Date().toISOString(),
    lastOpenedAt: new Date().toISOString(),
    notes: '',
  };
}

type Phase = 'boot' | 'launcher' | 'studio';

/**
 * The Studio boots through a launcher rather than straight into the editor.
 *
 * The launcher is real state, not a gate: the project the user picks there is
 * the project the editor opens, with the render mode and renderer they chose.
 */
export default function App(): JSX.Element {
  const store = useMemo<ProjectStore>(
    () =>
      new ProjectStore(
        // Private-mode or file:// contexts can refuse localStorage; the launcher
        // still works, it just will not remember projects between runs.
        typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
          ? window.localStorage
          : new MemoryLauncherStorage(),
      ),
    [],
  );

  const [phase, setPhase] = useState<Phase>(() => IS_E2E ? 'studio' : (store.getSettings().showBootAnimation ? 'boot' : 'launcher'));
  const [project, setProject] = useState<LauncherProject | null>(() => IS_E2E ? e2eProject() : null);

  const handleLaunch = useCallback((next: LauncherProject): void => {
    setProject(next);
    setPhase('studio');
  }, []);

  const handleBootComplete = useCallback((): void => {
    setPhase('launcher');
  }, []);

  if (phase === 'boot') {
    return <BootScreen onComplete={handleBootComplete} />;
  }

  if (phase === 'launcher' || !project) {
    return <LauncherApp store={store} onLaunch={handleLaunch} />;
  }

  return (
    <StudioProvider>
      <LauncherHandoff project={project} />
      <StudioWorkspace />
    </StudioProvider>
  );
}
