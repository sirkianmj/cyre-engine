/**
 * Launcher project store.
 *
 * Recent projects, project settings and launcher preferences, persisted through
 * an injected `Storage` so the logic is testable without a browser and the same
 * code runs against `localStorage` in the app.
 */

export type LauncherRenderMode = '2d' | '2.5d' | '3d';
export type LauncherRenderer = 'engine-gpu' | 'three-webgl';

export interface LauncherProject {
  id: string;
  name: string;
  /** Scenario the project starts from. */
  scenarioId: string;
  renderMode: LauncherRenderMode;
  renderer: LauncherRenderer;
  /** ISO timestamps, so ordering survives a reload. */
  createdAt: string;
  lastOpenedAt: string;
  notes: string;
}

export interface LauncherSettings {
  renderer: LauncherRenderer;
  renderMode: LauncherRenderMode;
  /** Falls back to the Canvas2D renderer when the GPU is unavailable. */
  hardwareAcceleration: boolean;
  showBootAnimation: boolean;
}

export const DEFAULT_LAUNCHER_SETTINGS: LauncherSettings = {
  renderer: 'engine-gpu',
  renderMode: '3d',
  hardwareAcceleration: true,
  showBootAnimation: true,
};

const PROJECTS_KEY = 'cyre.launcher.projects';
const SETTINGS_KEY = 'cyre.launcher.settings';

/** The subset of `Storage` this store needs, so a fake can stand in. */
export interface LauncherStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** An in-memory store, used by the tests and as a no-persistence fallback. */
export class MemoryLauncherStorage implements LauncherStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

export interface CreateProjectInput {
  name: string;
  scenarioId?: string;
  renderMode?: LauncherRenderMode;
  renderer?: LauncherRenderer;
  notes?: string;
}

/** Guards against a hostile or truncated payload in storage. */
function parseArray(raw: string | null): LauncherProject[] {
  if (!raw) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) return [];

  const projects: LauncherProject[] = [];
  for (const entry of parsed) {
    const project = asProject(entry);
    if (project) projects.push(project);
  }
  return projects;
}

function asProject(entry: unknown): LauncherProject | null {
  if (typeof entry !== 'object' || entry === null) return null;

  const candidate = entry as Record<string, unknown>;
  if (typeof candidate.id !== 'string' || candidate.id === '') return null;
  if (typeof candidate.name !== 'string' || candidate.name === '') return null;

  return {
    id: candidate.id,
    name: candidate.name,
    scenarioId: typeof candidate.scenarioId === 'string' ? candidate.scenarioId : 'default',
    renderMode: isRenderMode(candidate.renderMode) ? candidate.renderMode : '3d',
    renderer: isRenderer(candidate.renderer) ? candidate.renderer : 'engine-gpu',
    createdAt: typeof candidate.createdAt === 'string' ? candidate.createdAt : new Date(0).toISOString(),
    lastOpenedAt:
      typeof candidate.lastOpenedAt === 'string' ? candidate.lastOpenedAt : new Date(0).toISOString(),
    notes: typeof candidate.notes === 'string' ? candidate.notes : '',
  };
}

export function isRenderMode(value: unknown): value is LauncherRenderMode {
  return value === '2d' || value === '2.5d' || value === '3d';
}

export function isRenderer(value: unknown): value is LauncherRenderer {
  return value === 'engine-gpu' || value === 'three-webgl';
}

export class ProjectStore {
  constructor(
    private readonly storage: LauncherStorage,
    private readonly now: () => Date = () => new Date(),
    private readonly newId: () => string = () =>
      `project-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
  ) {}

  /** Most recently opened first, which is what a launcher list should show. */
  listProjects(): LauncherProject[] {
    return parseArray(this.storage.getItem(PROJECTS_KEY)).sort((a, b) =>
      b.lastOpenedAt.localeCompare(a.lastOpenedAt),
    );
  }

  getProject(id: string): LauncherProject | null {
    return this.listProjects().find((project) => project.id === id) ?? null;
  }

  /** The project the user was last working in, for "Continue". */
  lastOpened(): LauncherProject | null {
    return this.listProjects()[0] ?? null;
  }

  createProject(input: CreateProjectInput): LauncherProject {
    const name = input.name.trim();
    if (name === '') throw new Error('A project needs a name.');

    const timestamp = this.now().toISOString();
    const project: LauncherProject = {
      id: this.newId(),
      name,
      scenarioId: input.scenarioId ?? 'default',
      renderMode: input.renderMode ?? DEFAULT_LAUNCHER_SETTINGS.renderMode,
      renderer: input.renderer ?? DEFAULT_LAUNCHER_SETTINGS.renderer,
      createdAt: timestamp,
      lastOpenedAt: timestamp,
      notes: input.notes ?? '',
    };

    this.write([...parseArray(this.storage.getItem(PROJECTS_KEY)), project]);
    return project;
  }

  /** Marks a project as just opened and returns the updated record. */
  touch(id: string): LauncherProject | null {
    const projects = parseArray(this.storage.getItem(PROJECTS_KEY));
    const index = projects.findIndex((project) => project.id === id);
    if (index === -1) return null;

    const updated: LauncherProject = {
      ...projects[index] as LauncherProject,
      lastOpenedAt: this.now().toISOString(),
    };
    projects[index] = updated;
    this.write(projects);
    return updated;
  }

  rename(id: string, name: string): LauncherProject | null {
    const trimmed = name.trim();
    if (trimmed === '') throw new Error('A project needs a name.');
    return this.update(id, { name: trimmed });
  }

  update(id: string, patch: Partial<Omit<LauncherProject, 'id' | 'createdAt'>>): LauncherProject | null {
    const projects = parseArray(this.storage.getItem(PROJECTS_KEY));
    const index = projects.findIndex((project) => project.id === id);
    if (index === -1) return null;

    const updated: LauncherProject = { ...(projects[index] as LauncherProject), ...patch, id };
    projects[index] = updated;
    this.write(projects);
    return updated;
  }

  deleteProject(id: string): boolean {
    const projects = parseArray(this.storage.getItem(PROJECTS_KEY));
    const remaining = projects.filter((project) => project.id !== id);
    if (remaining.length === projects.length) return false;

    this.write(remaining);
    return true;
  }

  getSettings(): LauncherSettings {
    const raw = this.storage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_LAUNCHER_SETTINGS };

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { ...DEFAULT_LAUNCHER_SETTINGS };
    }

    if (typeof parsed !== 'object' || parsed === null) return { ...DEFAULT_LAUNCHER_SETTINGS };

    const candidate = parsed as Record<string, unknown>;
    return {
      renderer: isRenderer(candidate.renderer)
        ? candidate.renderer
        : DEFAULT_LAUNCHER_SETTINGS.renderer,
      renderMode: isRenderMode(candidate.renderMode)
        ? candidate.renderMode
        : DEFAULT_LAUNCHER_SETTINGS.renderMode,
      hardwareAcceleration:
        typeof candidate.hardwareAcceleration === 'boolean'
          ? candidate.hardwareAcceleration
          : DEFAULT_LAUNCHER_SETTINGS.hardwareAcceleration,
      showBootAnimation:
        typeof candidate.showBootAnimation === 'boolean'
          ? candidate.showBootAnimation
          : DEFAULT_LAUNCHER_SETTINGS.showBootAnimation,
    };
  }

  setSettings(patch: Partial<LauncherSettings>): LauncherSettings {
    const next = { ...this.getSettings(), ...patch };
    this.storage.setItem(SETTINGS_KEY, JSON.stringify(next));
    return next;
  }

  private write(projects: readonly LauncherProject[]): void {
    this.storage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  }
}
