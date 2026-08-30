import { useCallback, useEffect, useMemo, useState } from 'react';

import { CYRE_BRANDING, attribution, copyrightLine, engineVersion, studioVersion } from '../branding';
import { Badge, Button, Checkbox, Segmented, SelectField, TextField } from '../ui/primitives';

import { MemoryLauncherStorage, ProjectStore } from './projectStore';
import { describeHardware, detectHardware, recommendedRenderer } from './hardware';

import type { LauncherProject, LauncherRenderMode, LauncherRenderer, LauncherSettings } from './projectStore';
import type { HardwareReport } from './hardware';

export interface LauncherAppProps {
  /** Called with the project the user chose to open. */
  onLaunch: (project: LauncherProject) => void;
  /** Optional injected store, so tests can drive a fixed set of projects. */
  store?: ProjectStore;
  /** Optional injected hardware report, so tests do not depend on the platform. */
  hardware?: HardwareReport;
}

const SCENARIOS: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'default', label: 'Default SOC network' },
  { value: 'fintech-breach', label: 'Fintech breach' },
  { value: 'industrial-control', label: 'Industrial control' },
];

function browserStorage(): ProjectStore {
  if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
    return new ProjectStore(window.localStorage);
  }
  // A private-mode or file:// context may refuse storage; the launcher still
  // works, it just will not remember projects between runs.
  return new ProjectStore(new MemoryLauncherStorage());
}

/**
 * LauncherApp
 * ------------
 * A desktop-style project launcher shown before the editor: recent projects,
 * new project creation, per-project settings, hardware and renderer selection,
 * and the engine version.
 *
 * It is a real screen backed by persisted state, not a splash image with a
 * button on it — the project it hands to the editor is the one the editor opens.
 */
export function LauncherApp({ onLaunch, store, hardware }: LauncherAppProps): JSX.Element {
  const [projectStore] = useState<ProjectStore>(() => store ?? browserStorage());
  const [projects, setProjects] = useState<LauncherProject[]>(() => projectStore.listProjects());
  const [selectedId, setSelectedId] = useState<string | null>(() => projectStore.lastOpened()?.id ?? null);
  const [settings, setSettings] = useState<LauncherSettings>(() => projectStore.getSettings());

  const [newName, setNewName] = useState('');
  const [newScenario, setNewScenario] = useState(SCENARIOS[0]?.value ?? 'default');
  const [newMode, setNewMode] = useState<LauncherRenderMode>(settings.renderMode);
  const [newRenderer, setNewRenderer] = useState<LauncherRenderer>(settings.renderer);
  const [error, setError] = useState<string | null>(null);

  const [report] = useState<HardwareReport>(() => hardware ?? detectHardware());

  const refresh = useCallback((): void => {
    setProjects(projectStore.listProjects());
  }, [projectStore]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const selected = useMemo(
    () => projects.find((project) => project.id === selectedId) ?? null,
    [projects, selectedId],
  );

  const last = projects[0] ?? null;

  const launch = useCallback(
    (project: LauncherProject): void => {
      projectStore.touch(project.id);
      refresh();
      onLaunch(project);
    },
    [onLaunch, projectStore, refresh],
  );

  const createProject = useCallback((): void => {
    setError(null);

    try {
      const project = projectStore.createProject({
        name: newName,
        scenarioId: newScenario,
        renderMode: newMode,
        renderer: newRenderer,
      });

      setNewName('');
      refresh();
      setSelectedId(project.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create the project.');
    }
  }, [newMode, newName, newRenderer, newScenario, projectStore, refresh]);

  const deleteProject = useCallback(
    (id: string): void => {
      projectStore.deleteProject(id);
      refresh();
      setSelectedId((current) => (current === id ? null : current));
    },
    [projectStore, refresh],
  );

  const updateSetting = useCallback(
    (patch: Partial<LauncherSettings>): void => {
      setSettings(projectStore.setSettings(patch));
    },
    [projectStore],
  );

  const updateProjectSetting = useCallback(
    (patch: Partial<Omit<LauncherProject, 'id' | 'createdAt'>>): void => {
      if (!selected) return;
      projectStore.update(selected.id, patch);
      refresh();
    },
    [projectStore, refresh, selected],
  );

  const suggested = recommendedRenderer(report);

  return (
    <div className="cyre-launcher" data-testid="launcher">
      <aside className="cyre-launcher-side">
        <div className="cyre-launcher-mark" aria-hidden="true">
          CYRE
        </div>
        <h1 className="cyre-launcher-product" data-testid="launcher-product">
          {CYRE_BRANDING.product}
        </h1>
        <p className="cyre-launcher-tagline">{CYRE_BRANDING.productTagline}</p>

        <dl className="cyre-launcher-meta">
          <div>
            <dt>Engine</dt>
            <dd data-testid="launcher-engine-version">v{engineVersion()}</dd>
          </div>
          <div>
            <dt>Studio</dt>
            <dd data-testid="launcher-studio-version">v{studioVersion()}</dd>
          </div>
          <div>
            <dt>Hardware</dt>
            <dd data-testid="launcher-hardware">{describeHardware(report)}</dd>
          </div>
        </dl>

        <div className="cyre-launcher-credit" data-testid="launcher-credit">
          <span className="cyre-launcher-developer" data-testid="launcher-developer">
            {CYRE_BRANDING.developer}
          </span>
          <span className="cyre-launcher-role" data-testid="launcher-developer-role">
            {CYRE_BRANDING.developerRole}
          </span>
          <span className="cyre-launcher-copyright">{copyrightLine()}</span>
        </div>
      </aside>

      <main className="cyre-launcher-main">
        <section className="cyre-launcher-section">
          <header className="cyre-launcher-section-head">
            <h2>Recent projects</h2>
            {last ? (
              <Button
                variant="primary"
                testId="launcher-continue"
                onClick={() => launch(last)}
              >
                Continue · {last.name}
              </Button>
            ) : null}
          </header>

          {projects.length === 0 ? (
            <p className="cyre-launcher-empty" data-testid="launcher-empty">
              No projects yet. Create one to open the editor.
            </p>
          ) : (
            <ul className="cyre-launcher-projects" data-testid="launcher-projects">
              {projects.map((project) => (
                <li
                  key={project.id}
                  className="cyre-launcher-project"
                  data-selected={project.id === selectedId || undefined}
                  data-testid={`launcher-project-${project.id}`}
                >
                  <button
                    type="button"
                    className="cyre-launcher-project-open"
                    data-testid={`launcher-open-${project.id}`}
                    onClick={() => {
                      setSelectedId(project.id);
                      launch(project);
                    }}
                  >
                    <span className="cyre-launcher-project-name">{project.name}</span>
                    <span className="cyre-launcher-project-meta">
                      {project.scenarioId} · {project.renderMode.toUpperCase()} ·{' '}
                      {project.renderer === 'engine-gpu' ? 'Engine GPU' : 'Three.js WebGL'}
                    </span>
                    <span className="cyre-launcher-project-when">
                      {formatTimestamp(project.lastOpenedAt)}
                    </span>
                  </button>

                  <Button
                    size="sm"
                    testId={`launcher-select-${project.id}`}
                    onClick={() => setSelectedId(project.id)}
                  >
                    Settings
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    testId={`launcher-delete-${project.id}`}
                    onClick={() => deleteProject(project.id)}
                  >
                    Delete
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {selected ? (
          <section className="cyre-launcher-section" data-testid="launcher-project-settings">
            <h2>Project settings · {selected.name}</h2>

            <div className="cyre-launcher-form">
              <TextField
                label="Project name"
                value={selected.name}
                testId="launcher-settings-name"
                onChange={(value) => {
                  try {
                    updateProjectSetting({ name: value });
                    setError(null);
                  } catch (cause) {
                    setError(cause instanceof Error ? cause.message : 'Invalid name.');
                  }
                }}
              />

              <SelectField
                label="Scenario"
                value={selected.scenarioId}
                options={SCENARIOS}
                testId="launcher-settings-scenario"
                onChange={(value) => updateProjectSetting({ scenarioId: value })}
              />

              <div className="cyre-field">
                <span className="cyre-field-label">Render mode</span>
                <Segmented
                  ariaLabel="Render mode"
                  value={selected.renderMode}
                  options={[
                    { value: '2d', label: '2D' },
                    { value: '2.5d', label: '2.5D' },
                    { value: '3d', label: '3D' },
                  ]}
                  testId="launcher-settings-mode"
                  onChange={(value) => updateProjectSetting({ renderMode: value as LauncherRenderMode })}
                />
              </div>

              <div className="cyre-field">
                <span className="cyre-field-label">Renderer</span>
                <Segmented
                  ariaLabel="Renderer"
                  value={selected.renderer}
                  options={[
                    { value: 'engine-gpu', label: 'Engine GPU' },
                    { value: 'three-webgl', label: 'Three.js WebGL' },
                  ]}
                  testId="launcher-settings-renderer"
                  onChange={(value) => updateProjectSetting({ renderer: value as LauncherRenderer })}
                />
              </div>
            </div>

            <Button variant="primary" testId="launcher-launch-selected" onClick={() => launch(selected)}>
              Open {selected.name}
            </Button>
          </section>
        ) : null}

        <section className="cyre-launcher-section" data-testid="launcher-new-project">
          <h2>New project</h2>

          <div className="cyre-launcher-form">
            <TextField
              label="Name"
              value={newName}
              placeholder="Financial network"
              testId="launcher-new-name"
              onChange={setNewName}
            />

            <SelectField
              label="Scenario"
              value={newScenario}
              options={SCENARIOS}
              testId="launcher-new-scenario"
              onChange={setNewScenario}
            />

            <div className="cyre-field">
              <span className="cyre-field-label">Render mode</span>
              <Segmented
                ariaLabel="New project render mode"
                value={newMode}
                options={[
                  { value: '2d', label: '2D' },
                  { value: '2.5d', label: '2.5D' },
                  { value: '3d', label: '3D' },
                ]}
                testId="launcher-new-mode"
                onChange={(value) => setNewMode(value as LauncherRenderMode)}
              />
            </div>

            <div className="cyre-field">
              <span className="cyre-field-label">Renderer</span>
              <Segmented
                ariaLabel="New project renderer"
                value={newRenderer}
                options={[
                  { value: 'engine-gpu', label: 'Engine GPU' },
                  { value: 'three-webgl', label: 'Three.js WebGL' },
                ]}
                testId="launcher-new-renderer"
                onChange={(value) => setNewRenderer(value as LauncherRenderer)}
              />
            </div>
          </div>

          {error ? (
            <p className="cyre-launcher-error" data-testid="launcher-error" role="alert">
              {error}
            </p>
          ) : null}

          <Button variant="primary" testId="launcher-create" onClick={createProject}>
            Create project
          </Button>
        </section>

        <section className="cyre-launcher-section" data-testid="launcher-global-settings">
          <h2>Defaults</h2>

          <div className="cyre-launcher-form">
            <div className="cyre-field">
              <span className="cyre-field-label">Default renderer</span>
              <Segmented
                ariaLabel="Default renderer"
                value={settings.renderer}
                options={[
                  { value: 'engine-gpu', label: 'Engine GPU' },
                  { value: 'three-webgl', label: 'Three.js WebGL' },
                ]}
                testId="launcher-default-renderer"
                onChange={(value) => updateSetting({ renderer: value as LauncherRenderer })}
              />
            </div>

            <Checkbox
              label="Hardware acceleration"
              checked={settings.hardwareAcceleration}
              testId="launcher-hardware-acceleration"
              onChange={() => updateSetting({ hardwareAcceleration: !settings.hardwareAcceleration })}
            />

            <Checkbox
              label="Show boot animation"
              checked={settings.showBootAnimation}
              testId="launcher-boot-animation"
              onChange={() => updateSetting({ showBootAnimation: !settings.showBootAnimation })}
            />
          </div>

          <p className="cyre-launcher-hint" data-testid="launcher-renderer-suggestion">
            {!report.webgl2
              ? 'This platform reports no WebGL2 context, so the Three.js renderer is suggested.'
              : `WebGL2 is available — the suggested renderer is ${suggested === 'engine-gpu' ? 'Engine GPU' : 'Three.js WebGL'}.`}
          </p>

          <div className="cyre-launcher-badges">
            <Badge tone="success">engine v{engineVersion()}</Badge>
            <Badge>{report.webgl2 ? 'WebGL2' : report.webgl1 ? 'WebGL1' : 'no WebGL'}</Badge>
            <Badge>{attribution()}</Badge>
          </div>
        </section>
      </main>
    </div>
  );
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'unknown';

  const delta = Date.now() - date.getTime();
  const minutes = Math.floor(delta / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return date.toISOString().slice(0, 10);
}
