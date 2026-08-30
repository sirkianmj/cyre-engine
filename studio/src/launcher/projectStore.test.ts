import { beforeEach, describe, expect, it } from 'vitest';

import {
  DEFAULT_LAUNCHER_SETTINGS,
  MemoryLauncherStorage,
  ProjectStore,
  isRenderMode,
  isRenderer,
} from './projectStore';

import { describeHardware, detectHardware, recommendedRenderer } from './hardware';

describe('ProjectStore', () => {
  let storage: MemoryLauncherStorage;
  let clock: number;
  let store: ProjectStore;

  beforeEach(() => {
    storage = new MemoryLauncherStorage();
    clock = Date.parse('2026-08-28T09:00:00.000Z');
    store = new ProjectStore(
      storage,
      () => new Date(clock),
      (() => {
        let n = 0;
        return () => `id-${(n += 1)}`;
      })(),
    );
  });

  it('starts empty', () => {
    expect(store.listProjects()).toEqual([]);
    expect(store.lastOpened()).toBeNull();
  });

  it('creates a project with defaults filled in', () => {
    const project = store.createProject({ name: 'Financial Network' });

    expect(project.id).toBe('id-1');
    expect(project.name).toBe('Financial Network');
    expect(project.scenarioId).toBe('default');
    expect(project.renderMode).toBe(DEFAULT_LAUNCHER_SETTINGS.renderMode);
    expect(project.renderer).toBe(DEFAULT_LAUNCHER_SETTINGS.renderer);
    expect(project.createdAt).toBe('2026-08-28T09:00:00.000Z');
    expect(store.listProjects()).toHaveLength(1);
  });

  it('honours explicit project settings', () => {
    const project = store.createProject({
      name: 'Grid',
      scenarioId: 'fintech-breach',
      renderMode: '2.5d',
      renderer: 'three-webgl',
      notes: 'quarterly review',
    });

    expect(project.scenarioId).toBe('fintech-breach');
    expect(project.renderMode).toBe('2.5d');
    expect(project.renderer).toBe('three-webgl');
    expect(project.notes).toBe('quarterly review');
  });

  it('rejects a blank name', () => {
    expect(() => store.createProject({ name: '   ' })).toThrow(/needs a name/);
    expect(store.listProjects()).toHaveLength(0);
  });

  it('lists most recently opened first', () => {
    store.createProject({ name: 'First' });
    clock += 1000;
    store.createProject({ name: 'Second' });
    clock += 1000;
    store.createProject({ name: 'Third' });

    expect(store.listProjects().map((project) => project.name)).toEqual([
      'Third',
      'Second',
      'First',
    ]);
  });

  it('moves a touched project to the top', () => {
    const first = store.createProject({ name: 'First' });
    clock += 1000;
    store.createProject({ name: 'Second' });

    clock += 1000;
    const touched = store.touch(first.id);

    expect(touched?.lastOpenedAt).toBe(new Date(clock).toISOString());
    expect(store.lastOpened()?.name).toBe('First');
  });

  it('returns null when touching a project that is not there', () => {
    expect(store.touch('missing')).toBeNull();
  });

  it('renames and rejects an empty rename', () => {
    const project = store.createProject({ name: 'Draft' });

    expect(store.rename(project.id, 'Renamed')?.name).toBe('Renamed');
    expect(store.rename(project.id, 'Trims  ')?.name).toBe('Trims');
    expect(() => store.rename(project.id, '  ')).toThrow(/needs a name/);
  });

  it('updates project settings without touching identity or creation time', () => {
    const project = store.createProject({ name: 'Draft' });
    clock += 5000;

    const updated = store.update(project.id, { renderMode: '2d', renderer: 'three-webgl' });

    expect(updated?.id).toBe(project.id);
    expect(updated?.createdAt).toBe(project.createdAt);
    expect(updated?.renderMode).toBe('2d');
    expect(updated?.renderer).toBe('three-webgl');
    // Updating settings is not the same as opening the project.
    expect(updated?.lastOpenedAt).toBe(project.lastOpenedAt);
  });

  it('deletes a project and reports whether anything was removed', () => {
    const project = store.createProject({ name: 'Doomed' });

    expect(store.deleteProject(project.id)).toBe(true);
    expect(store.deleteProject(project.id)).toBe(false);
    expect(store.listProjects()).toEqual([]);
  });

  it('survives a reload by reading back through the same storage', () => {
    store.createProject({ name: 'Persisted', scenarioId: 'fintech-breach' });

    const reopened = new ProjectStore(storage);

    expect(reopened.listProjects()).toHaveLength(1);
    expect(reopened.listProjects()[0]?.name).toBe('Persisted');
    expect(reopened.lastOpened()?.scenarioId).toBe('fintech-breach');
  });

  it('ignores corrupt storage instead of throwing at startup', () => {
    storage.setItem('cyre.launcher.projects', '{not json');

    expect(store.listProjects()).toEqual([]);

    storage.setItem('cyre.launcher.projects', JSON.stringify({ not: 'an array' }));
    expect(store.listProjects()).toEqual([]);
  });

  it('drops malformed entries but keeps the valid ones', () => {
    storage.setItem(
      'cyre.launcher.projects',
      JSON.stringify([
        { id: 'good', name: 'Good', createdAt: '2026-01-01T00:00:00.000Z', lastOpenedAt: '2026-01-01T00:00:00.000Z' },
        { id: '', name: 'No id' },
        { name: 'No id field' },
        'a string',
        null,
      ]),
    );

    const projects = store.listProjects();

    expect(projects).toHaveLength(1);
    expect(projects[0]?.id).toBe('good');
    // Missing fields fall back rather than poisoning the record.
    expect(projects[0]?.renderMode).toBe('3d');
    expect(projects[0]?.renderer).toBe('engine-gpu');
  });

  it('clamps an unknown render mode or renderer from storage', () => {
    storage.setItem(
      'cyre.launcher.projects',
      JSON.stringify([
        {
          id: 'a',
          name: 'A',
          renderMode: 'vr',
          renderer: 'software-raytracer',
          createdAt: '2026-01-01T00:00:00.000Z',
          lastOpenedAt: '2026-01-01T00:00:00.000Z',
        },
      ]),
    );

    const project = store.listProjects()[0];

    expect(project?.renderMode).toBe('3d');
    expect(project?.renderer).toBe('engine-gpu');
  });
});

describe('launcher settings', () => {
  it('falls back to the defaults when nothing is stored', () => {
    const store = new ProjectStore(new MemoryLauncherStorage());
    expect(store.getSettings()).toEqual(DEFAULT_LAUNCHER_SETTINGS);
  });

  it('persists a partial update against the current settings', () => {
    const storage = new MemoryLauncherStorage();
    const store = new ProjectStore(storage);

    const next = store.setSettings({ renderer: 'three-webgl' });

    expect(next.renderer).toBe('three-webgl');
    expect(next.renderMode).toBe(DEFAULT_LAUNCHER_SETTINGS.renderMode);

    // A fresh store reads the same value back.
    expect(new ProjectStore(storage).getSettings().renderer).toBe('three-webgl');
  });

  it('ignores a corrupt settings blob', () => {
    const storage = new MemoryLauncherStorage();
    storage.setItem('cyre.launcher.settings', 'nonsense');

    expect(new ProjectStore(storage).getSettings()).toEqual(DEFAULT_LAUNCHER_SETTINGS);
  });
});

describe('type guards', () => {
  it('accepts exactly the supported render modes', () => {
    expect(isRenderMode('2d')).toBe(true);
    expect(isRenderMode('2.5d')).toBe(true);
    expect(isRenderMode('3d')).toBe(true);
    expect(isRenderMode('4d')).toBe(false);
    expect(isRenderMode(undefined)).toBe(false);
  });

  it('accepts exactly the supported renderers', () => {
    expect(isRenderer('engine-gpu')).toBe(true);
    expect(isRenderer('three-webgl')).toBe(true);
    expect(isRenderer('canvas2d')).toBe(false);
  });
});

describe('hardware detection', () => {
  it('reports no WebGL when the platform offers none', () => {
    // jsdom implements createElement but no WebGL context.
    const report = detectHardware();

    expect(report.webgl2).toBe(false);
    expect(report.gpu).toBe('unknown');
    expect(describeHardware(report)).toContain('no WebGL');
  });

  it('recommends the fallback renderer without WebGL2', () => {
    expect(recommendedRenderer(detectHardware())).toBe('three-webgl');
  });

  it('recommends the engine GPU path when WebGL2 is present', () => {
    expect(
      recommendedRenderer({
        webgl2: true,
        webgl1: true,
        gpu: 'ANGLE (NVIDIA)',
        vendor: 'Google Inc.',
        deviceMemoryGb: 8,
        hardwareConcurrency: 12,
        devicePixelRatio: 2,
      }),
    ).toBe('engine-gpu');
  });

  it('summarises the hardware it can actually see', () => {
    const summary = describeHardware({
      webgl2: true,
      webgl1: true,
      gpu: 'ANGLE (Apple M2)',
      vendor: 'Google Inc.',
      deviceMemoryGb: 16,
      hardwareConcurrency: 10,
      devicePixelRatio: 2,
    });

    expect(summary).toContain('WebGL2');
    expect(summary).toContain('ANGLE (Apple M2)');
    expect(summary).toContain('10 threads');
    expect(summary).toContain('16 GB');
  });

  it('omits values the browser does not expose', () => {
    const summary = describeHardware({
      webgl2: false,
      webgl1: true,
      gpu: 'restricted',
      vendor: 'restricted',
      deviceMemoryGb: null,
      hardwareConcurrency: null,
      devicePixelRatio: 1,
    });

    expect(summary).toBe('WebGL1 only');
  });
});
