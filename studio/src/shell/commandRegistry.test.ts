import { beforeEach, describe, expect, it, vi } from 'vitest';

import { StudioApplication } from '../studio/StudioApplication';

import type { CommandContext, CommandDescriptor, CommandRegistry } from './commandModel';
import { indexCommands } from './commandModel';
import { createCommandDescriptors } from './commandRegistry';
import { STUDIO_MENUS, listMenuCommandIds, listMenuItemIds } from './menuModel';
import { WINDOW_DEFINITIONS, isWindowKind } from './windowCatalog';

const REQUIRED_MENUS = [
  'File',
  'Edit',
  'View',
  'Scenarios',
  'Simulation',
  'Visualize',
  'Research',
  'Replay',
  'Tools',
  'Window',
  'Help',
];

interface Harness {
  application: StudioApplication;
  registry: CommandRegistry;
  downloads: Array<{ filename: string; mime: string; content: string }>;
  notifications: Array<{ level: string; message: string }>;
  context: CommandContext;
  run: (commandId: string) => Promise<void>;
}

function createHarness(overrides: Partial<CommandContext> = {}): Harness {
  const application = new StudioApplication();
  application.windows.resetLayout();

  const downloads: Harness['downloads'] = [];
  const notifications: Harness['notifications'] = [];

  const context: CommandContext = {
    application,
    notify: (level, message) => notifications.push({ level, message }),
    download: (filename, mime, content) => downloads.push({ filename, mime, content }),
    pickTextFile: async () => '',
    confirm: async () => true,
    togglePalette: () => undefined,
    openWindow: (kind) => {
      application.windows.open(kind);
    },
    ...overrides,
  };

  const registry = indexCommands(createCommandDescriptors());

  return {
    application,
    registry,
    downloads,
    notifications,
    context,
    run: async (commandId: string) => {
      const command = registry.get(commandId);
      if (!command) throw new Error(`Unknown command "${commandId}".`);
      await command.run(context);
    },
  };
}

describe('command registry', () => {
  let harness: Harness;

  beforeEach(() => {
    harness = createHarness();
  });

  it('registers every command referenced by the menu bar', () => {
    for (const commandId of listMenuCommandIds()) {
      expect(harness.registry.has(commandId), `missing command "${commandId}"`).toBe(true);
    }
  });

  it('has unique menu item ids', () => {
    const ids = listMenuItemIds();
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('declares every command with a windowKind pointing at a known window', () => {
    for (const command of harness.registry.values()) {
      if (command.windowKind !== undefined) {
        expect(isWindowKind(command.windowKind), `bad window kind on ${command.id}`).toBe(true);
      }
    }
  });

  it('provides a toggle command for every window in the catalog', () => {
    for (const definition of WINDOW_DEFINITIONS) {
      expect(harness.registry.has(`window.toggle.${definition.kind}`)).toBe(true);
    }
  });

  it('runs every window toggle command and presents the window', async () => {
    for (const definition of WINDOW_DEFINITIONS) {
      await harness.run(`window.toggle.${definition.kind}`);
      const open = harness.application.windows.listByKind(definition.kind);
      expect(open, `${definition.kind} should be open`).toHaveLength(1);
      expect(open[0].title).toBe(definition.title);

      // Second invocation closes it again.
      await harness.run(`window.toggle.${definition.kind}`);
      expect(harness.application.windows.listByKind(definition.kind)).toHaveLength(0);
    }
  });

  it('drives the real simulation transport through commands', async () => {
    await harness.run('simulation.play');
    expect(harness.application.getState().isPlaying).toBe(true);

    await harness.run('simulation.pause');
    expect(harness.application.getState().isPaused).toBe(true);

    await harness.run('simulation.resume');
    expect(harness.application.getState().isPlaying).toBe(true);

    await harness.run('simulation.stop');
    expect(harness.application.getState().playState).toBe('stopped');
  });

  it('changes simulation speed through commands', async () => {
    await harness.run('simulation.speed.4');
    expect(harness.application.getState().simulationSpeed).toBe(4);

    await harness.run('simulation.speed.0.25');
    expect(harness.application.getState().simulationSpeed).toBe(0.25);
  });

  it('executes the engine attack chain through commands', async () => {
    await harness.run('simulation.play');

    await harness.run('simulation.action.escalatePrivileges');
    await harness.run('simulation.action.moveToDatabase');
    await harness.run('simulation.action.accessTarget');

    const session = harness.application.getState().cyberSession;
    expect(session.state?.attacker.position).toBe('database-server');
    expect(session.state?.objective.achieved).toBe(true);
  });

  it('records telemetry for engine actions and exports all three formats', async () => {
    await harness.run('simulation.play');
    await harness.run('simulation.action.detectThreats');

    expect(harness.application.telemetry.getEventCount()).toBeGreaterThan(0);

    await harness.run('research.export-json');
    await harness.run('research.export-csv');
    await harness.run('research.export-ndjson');

    expect(harness.downloads.map((entry) => entry.filename)).toEqual([
      'cyre-telemetry-cyre-studio-session.json',
      'cyre-telemetry-cyre-studio-session.csv',
      'cyre-telemetry-cyre-studio-session.ndjson',
    ]);

    const csv = harness.downloads[1].content;
    expect(csv.split('\n')[0]).toContain('sessionId');

    const ndjson = harness.downloads[2].content;
    expect(ndjson.split('\n').every((line) => line.startsWith('{'))).toBe(true);
  });

  it('warns instead of failing when exporting telemetry with no events', async () => {
    await harness.run('research.export-json');
    expect(harness.downloads).toHaveLength(0);
    expect(harness.notifications.at(-1)?.level).toBe('warning');
  });

  it('records and replays a cyber replay through commands', async () => {
    await harness.run('simulation.play');
    await harness.run('replay.record');

    const playback = harness.application.getReplayPlayback();
    expect(playback.replay).not.toBeNull();
    expect(playback.index).toBe(0);

    await harness.run('replay.step-forward');
    await harness.run('replay.step-forward');
    expect(harness.application.getReplayPlayback().index).toBe(2);

    await harness.run('replay.to-end');
    const total = harness.application.getReplayPlayback().replay?.actions.length ?? 0;
    expect(harness.application.getReplayPlayback().index).toBe(total);

    await harness.run('replay.step-back');
    expect(harness.application.getReplayPlayback().index).toBe(total - 1);

    await harness.run('replay.to-start');
    expect(harness.application.getReplayPlayback().index).toBe(0);
  });

  it('steps the deterministic simulation clock', async () => {
    await harness.run('simulation.play');
    const before = harness.application.cyber.getTime();

    await harness.run('simulation.step');
    await harness.run('simulation.step');

    expect(harness.application.cyber.getTime()).toBeGreaterThan(before);
  });

  it('runs an experiment and exports the results', async () => {
    await harness.run('research.run');

    const experiments = harness.application.experiments.list();
    expect(experiments).toHaveLength(1);
    expect(experiments[0].comparison.runCount).toBe(5);
    expect(experiments[0].comparison.deterministic).toBe(true);
  });

  it('runs both benchmarks', async () => {
    await harness.run('research.benchmark');
    await harness.run('research.benchmark-large');

    const reports = harness.application.benchmarks.list();
    expect(reports).toHaveLength(2);
    expect(reports[0].simulation?.completed).toBe(true);
    expect(reports[1].largeNetwork?.initialized).toBe(true);
  });

  it('imports and exports scenario JSON through commands', async () => {
    const local = createHarness({
      pickTextFile: async () =>
        JSON.stringify({
          id: 'imported-scenario',
          name: 'Imported Scenario',
          description: 'Imported through the File menu.',
          seed: 5,
          targetHostId: 'db',
          nodes: [
            { id: 'internet', name: 'Internet', type: 'internet' },
            { id: 'db', name: 'Database', type: 'database_server' },
          ],
          connectionLogs: [],
        }),
    });

    await local.run('scenario.import');
    expect(local.application.getState().selectedCyberScenarioId).toBe('imported-scenario');

    await local.run('scenario.export');
    expect(local.downloads).toHaveLength(1);
    expect(local.downloads[0].filename).toBe('imported-scenario.json');
    expect(local.downloads[0].content).toContain('"id": "imported-scenario"');
  });

  it('rejects an invalid scenario import with an error notification', async () => {
    const local = createHarness({ pickTextFile: async () => 'not-json' });

    await local.run('scenario.import');

    expect(local.notifications.at(-1)?.level).toBe('error');
    expect(local.notifications.at(-1)?.message).toMatch(/invalid cyber scenario json/i);
  });

  it('exports the project document', async () => {
    await harness.run('project.export');
    expect(harness.downloads).toHaveLength(1);

    const parsed = JSON.parse(harness.downloads[0].content) as {
      formatVersion: number;
      project: { name: string };
    };
    expect(parsed.formatVersion).toBe(1);
    expect(parsed.project.name).toBe('Untitled CYRE Project');
  });

  it('confirms before destroying the current project', async () => {
    const confirm = vi.fn(async () => false);
    const local = createHarness({ confirm });

    await local.run('project.new');
    expect(confirm).toHaveBeenCalledOnce();
    expect(local.application.getState().projectTitle).toBe('Untitled CYRE Project');
  });

  it('validates the selected scenario and reports sandbox status', async () => {
    await harness.run('scenario.validate');

    const reports = harness.application.security.list();
    expect(reports).toHaveLength(1);
    expect(reports[0].sandbox.rejected).toBe(false);
    expect(reports[0].hostileChecks.every((check) => check.rejected)).toBe(true);
    expect(reports[0].passed).toBe(true);
  });

  it('supports undo and redo of scenario drafts', async () => {
    harness.application.setScenarioDraft(
      {
        id: 'draft-a',
        name: 'Draft A',
        description: 'd',
        seed: 1,
        targetHostId: 'internet',
        nodes: [{ id: 'internet', name: 'Internet', type: 'internet' }],
        connectionLogs: [],
      },
      'Create draft A',
    );

    expect(harness.application.getState().history.canUndo).toBe(true);

    await harness.run('edit.undo');
    expect(harness.application.getScenarioDraft()).toBeNull();

    await harness.run('edit.redo');
    expect(harness.application.getScenarioDraft()?.id).toBe('draft-a');
  });

  it('switches appearance and render modes', async () => {
    await harness.run('view.appearance-light');
    expect(harness.application.getState().appearance).toBe('light');

    await harness.run('view.mode-2d');
    expect(harness.application.getState().renderMode).toBe('2d');

    await harness.run('view.mode-3d');
    expect(harness.application.getState().renderMode).toBe('3d');
  });

  it('arranges windows with the Window menu commands', async () => {
    await harness.run('window.toggle.telemetry');
    await harness.run('window.toggle.research');
    await harness.run('window.toggle.performance');

    await harness.run('window.tile');
    const tiled = harness.application.windows.list();
    expect(tiled).toHaveLength(3);
    expect(new Set(tiled.map((entry) => `${entry.x}:${entry.y}`)).size).toBe(3);

    await harness.run('window.cascade');
    const cascaded = harness.application.windows.list();
    expect(cascaded.every((entry) => entry.width > 0 && entry.height > 0)).toBe(true);

    await harness.run('window.minimize');
    expect(harness.application.windows.list().some((entry) => entry.minimized)).toBe(true);

    await harness.run('window.restore-all');
    expect(harness.application.windows.list().every((entry) => !entry.minimized)).toBe(true);

    await harness.run('window.close-all');
    expect(harness.application.windows.list()).toHaveLength(0);
  });

  it('exposes every required top-level menu', () => {
    expect(STUDIO_MENUS.map((menu) => menu.label)).toEqual(REQUIRED_MENUS);
  });

  it('never ships a menu row without a command, separator or hint', () => {
    for (const menu of STUDIO_MENUS) {
      for (const item of menu.items) {
        const meaningful =
          item.separator === true || item.command !== undefined || item.hint !== undefined;
        expect(meaningful, `menu row ${item.id} does nothing`).toBe(true);
      }
    }
  });

  it('marks the whole descriptor list as executable without throwing', async () => {
    const failures: Array<{ id: string; error: string }> = [];

    for (const command of createCommandDescriptors() as CommandDescriptor[]) {
      const local = createHarness();
      // Give every command a live simulation to work against.
      local.application.play();
      try {
        await command.run(local.context);
      } catch (error) {
        failures.push({ id: command.id, error: error instanceof Error ? error.message : String(error) });
      }
    }

    expect(failures).toEqual([]);
  });
});
