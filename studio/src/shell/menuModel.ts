/**
 * menuModel
 * ----------
 * The CYRE Studio menu bar definition. Menus are pure data that reference
 * command ids from the command registry, so the menu bar, the command
 * palette and the keyboard layer can never drift apart.
 *
 * `checked` predicates are evaluated against the live Studio snapshot so
 * menu items can show real state (current render mode, open windows,
 * enabled step mode, …).
 */

import type { StudioSnapshot } from '../studio/StudioApplication';
import type { WindowKind } from './windowCatalog';
import { WINDOW_DEFINITIONS } from './windowCatalog';

export interface MenuItemSpec {
  id: string;
  label?: string;
  /** Command id resolved through the command registry. */
  command?: string;
  separator?: boolean;
  shortcut?: string;
  checked?: (state: StudioSnapshot) => boolean;
  disabled?: (state: StudioSnapshot) => boolean;
  /** Renders a live value on the trailing edge of the row. */
  hint?: (state: StudioSnapshot) => string;
}

export interface MenuSpec {
  id: string;
  label: string;
  items: MenuItemSpec[];
}

function separator(id: string): MenuItemSpec {
  return { id, separator: true };
}

function windowToggleItem(menuId: string, kind: WindowKind, label?: string): MenuItemSpec {
  const definition = WINDOW_DEFINITIONS.find((entry) => entry.kind === kind);
  if (!definition) throw new Error(`Unknown window kind "${kind}".`);

  return {
    id: `menu.${menuId}.${kind}`,
    label: label ?? definition.title,
    command: `window.toggle.${kind}`,
    checked: (state) => state.windows.some((entry) => entry.kind === kind),
  };
}

export const STUDIO_MENUS: readonly MenuSpec[] = [
  {
    id: 'file',
    label: 'File',
    items: [
      { id: 'file.new', label: 'New Project', command: 'project.new', shortcut: '⌘N' },
      { id: 'file.open', label: 'Open Last Project', command: 'project.open', shortcut: '⌘O' },
      { id: 'file.save', label: 'Save Project', command: 'project.save', shortcut: '⌘S' },
      separator('file.sep-1'),
      { id: 'file.export-project', label: 'Export Project…', command: 'project.export' },
      { id: 'file.import-scenario', label: 'Import Scenario JSON…', command: 'scenario.import' },
      { id: 'file.export-scenario', label: 'Export Scenario JSON', command: 'scenario.export' },
      separator('file.sep-2'),
      { id: 'project.manager', label: 'Project Manager…', command: 'project.manager' },
      separator('file.sep-3'),
      { id: 'file.close', label: 'Close Window', command: 'window.close', shortcut: '⌘W' },
      { id: 'file.close-all', label: 'Close All Windows', command: 'window.close-all', shortcut: '⇧⌘W' },
    ],
  },
  {
    id: 'edit',
    label: 'Edit',
    items: [
      {
        id: 'edit.undo',
        label: 'Undo',
        command: 'edit.undo',
        shortcut: '⌘Z',
        disabled: (state) => !state.history.canUndo,
        hint: (state) => state.history.undoLabel ?? '',
      },
      {
        id: 'edit.redo',
        label: 'Redo',
        command: 'edit.redo',
        shortcut: '⇧⌘Z',
        disabled: (state) => !state.history.canRedo,
        hint: (state) => state.history.redoLabel ?? '',
      },
      separator('edit.sep-1'),
      { id: 'edit.new-draft', label: 'New Scenario Draft', command: 'edit.new-scenario-draft', shortcut: '⌥⌘N' },
      { id: 'edit.validate', label: 'Validate Scenario', command: 'edit.validate-scenario', shortcut: '⌥⌘V' },
      separator('edit.sep-2'),
      { id: 'edit.scenario-editor', label: 'Scenario Editor…', command: 'edit.scenario-editor' },
      windowToggleItem('edit', 'inspector'),
      windowToggleItem('edit', 'project-explorer'),
    ],
  },
  {
    id: 'view',
    label: 'View',
    items: [
      {
        id: 'view.2d',
        label: '2D Viewport',
        command: 'view.mode-2d',
        shortcut: '1',
        checked: (state) => state.renderMode === '2d',
      },
      {
        id: 'view.25d',
        label: '2.5D Viewport',
        command: 'view.mode-2.5d',
        shortcut: '2',
        checked: (state) => state.renderMode === '2.5d',
      },
      {
        id: 'view.3d',
        label: '3D Viewport',
        command: 'view.mode-3d',
        shortcut: '3',
        checked: (state) => state.renderMode === '3d',
      },
      separator('view.sep-1'),
      { id: 'view.visualization', label: 'Visualization Settings…', command: 'view.visualization' },
      { id: 'view.hosts', label: 'Host Inspector', command: 'view.hosts' },
      windowToggleItem('view', 'output'),
      windowToggleItem('view', 'inspector'),
      windowToggleItem('view', 'project-explorer'),
      separator('view.sep-2'),
      {
        id: 'view.dark',
        label: 'Dark Appearance',
        command: 'view.appearance-dark',
        checked: (state) => state.appearance === 'dark',
      },
      {
        id: 'view.light',
        label: 'Light Appearance',
        command: 'view.appearance-light',
        checked: (state) => state.appearance === 'light',
      },
      {
        id: 'view.reduce-motion',
        label: 'Reduce Motion',
        command: 'view.reduce-motion',
        checked: (state) => state.motionReduced,
      },
      separator('view.sep-3'),
      { id: 'view.reset-layout', label: 'Reset Window Layout', command: 'window.reset-layout' },
    ],
  },
  {
    id: 'scenarios',
    label: 'Scenarios',
    items: [
      { id: 'scenarios.library', label: 'Scenario Library…', command: 'scenario.library', shortcut: '⌘⇧L' },
      { id: 'scenarios.editor', label: 'Scenario Editor…', command: 'scenario.editor' },
      { id: 'scenarios.designer', label: 'Scenario Designer…', command: 'scenario.designer' },
      { id: 'scenarios.generator', label: 'Scenario Generator…', command: 'scenario.generator' },
      separator('scenarios.sep-1'),
      { id: 'scenarios.run', label: 'Run Scenario', command: 'scenario.run', shortcut: '⌘R' },
      { id: 'scenarios.validate', label: 'Validate Scenario', command: 'scenario.validate' },
      { id: 'scenarios.save', label: 'Save Scenario Draft', command: 'scenario.save', shortcut: '⌥⌘S' },
      separator('scenarios.sep-2'),
      { id: 'scenarios.import', label: 'Import Scenario JSON…', command: 'scenario.import' },
      { id: 'scenarios.export', label: 'Export Scenario JSON', command: 'scenario.export' },
      separator('scenarios.sep-3'),
      {
        id: 'scenarios.current',
        label: 'Active scenario',
        separator: false,
        hint: (state) => state.cyberSession.scenarioName,
      },
    ],
  },
  {
    id: 'simulation',
    label: 'Simulation',
    items: [
      { id: 'simulation.play', label: 'Play', command: 'simulation.play', shortcut: 'F6' },
      { id: 'simulation.pause', label: 'Pause', command: 'simulation.pause', shortcut: 'F7' },
      { id: 'simulation.resume', label: 'Resume', command: 'simulation.resume' },
      { id: 'simulation.stop', label: 'Stop', command: 'simulation.stop', shortcut: 'F8' },
      { id: 'simulation.restart', label: 'Restart', command: 'simulation.restart', shortcut: '⇧F8' },
      { id: 'simulation.step', label: 'Step One Tick', command: 'simulation.step', shortcut: 'F10' },
      {
        id: 'simulation.step-mode',
        label: 'Step Mode',
        command: 'simulation.step-mode',
        checked: (state) => state.cyberSession.stepMode,
      },
      separator('simulation.sep-1'),
      ...[0.25, 0.5, 1, 2, 4].map((speed) => ({
        id: `simulation.speed.${speed}`,
        label: `${speed}× Speed`,
        command: `simulation.speed.${speed}`,
        checked: (state: StudioSnapshot) => state.simulationSpeed === speed,
      })),
      separator('simulation.sep-2'),
      {
        id: 'simulation.control',
        label: 'Simulation Control…',
        command: 'simulation.control',
        hint: (state) => `seed ${state.cyberSession.seed}`,
      },
      { id: 'simulation.attack', label: 'Attack Chain…', command: 'simulation.attack' },
      { id: 'simulation.detection', label: 'Detection & Response…', command: 'simulation.detection' },
      { id: 'simulation.hosts', label: 'Host Inspector…', command: 'simulation.hosts' },
      separator('simulation.sep-3'),
      // Direct engine actions, exposed so every capability is menu-reachable.
      {
        id: 'simulation.action.runRecon',
        label: 'Run Reconnaissance',
        command: 'simulation.action.runRecon',
        disabled: (state) => !state.cyberSession.active,
      },
      {
        id: 'simulation.action.discoverServices',
        label: 'Discover Services',
        command: 'simulation.action.discoverServices',
        disabled: (state) => !state.cyberSession.active,
      },
      {
        id: 'simulation.action.exploitWebServer',
        label: 'Exploit Web Server',
        command: 'simulation.action.exploitWebServer',
        disabled: (state) => !state.cyberSession.active,
      },
      {
        id: 'simulation.action.escalatePrivileges',
        label: 'Escalate Privileges',
        command: 'simulation.action.escalatePrivileges',
        disabled: (state) => !state.cyberSession.active,
      },
      {
        id: 'simulation.action.moveToDatabase',
        label: 'Move Laterally to Database',
        command: 'simulation.action.moveToDatabase',
        disabled: (state) => !state.cyberSession.active,
      },
      {
        id: 'simulation.action.accessTarget',
        label: 'Access Target Data',
        command: 'simulation.action.accessTarget',
        disabled: (state) => !state.cyberSession.active,
      },
      {
        id: 'simulation.action.detectThreats',
        label: 'Run Detection',
        command: 'simulation.action.detectThreats',
        disabled: (state) => !state.cyberSession.active,
      },
    ],
  },
  {
    id: 'visualize',
    label: 'Visualize',
    items: [
      {
        id: 'visualize.2d',
        label: '2D Viewport',
        command: 'view.mode-2d',
        checked: (state) => state.renderMode === '2d',
      },
      {
        id: 'visualize.25d',
        label: '2.5D Viewport',
        command: 'view.mode-2.5d',
        checked: (state) => state.renderMode === '2.5d',
      },
      {
        id: 'visualize.3d',
        label: '3D Viewport',
        command: 'view.mode-3d',
        checked: (state) => state.renderMode === '3d',
      },
      separator('visualize.sep-1'),
      { id: 'visualize.settings', label: 'Visualization Settings…', command: 'visualize.settings' },
      { id: 'visualize.renderer', label: 'Renderer…', command: 'visualize.renderer' },
      separator('visualize.sep-2'),
      { id: 'visualize.network', label: 'Network Graph…', command: 'visualize.network-graph' },
      { id: 'visualize.attack-graph', label: 'Attack Graph…', command: 'visualize.attack-graph' },
      { id: 'visualize.evidence-graph', label: 'Evidence Graph…', command: 'visualize.evidence-graph' },
      { id: 'visualize.timeline', label: 'Timeline…', command: 'visualize.timeline' },
      separator('visualize.sep-3'),
      { id: 'visualize.live-inspector', label: 'Live Inspector…', command: 'visualize.live-inspector' },
      { id: 'visualize.live-events', label: 'Live Events…', command: 'visualize.live-events' },
      { id: 'visualize.debugger', label: 'Debugger…', command: 'visualize.debugger' },
      { id: 'visualize.game-ui', label: 'Game UI…', command: 'visualize.game-ui' },
    ],
  },
  {
    id: 'research',
    label: 'Research',
    items: [
      { id: 'research.experiments', label: 'Experiment Runner…', command: 'research.experiments', shortcut: '⌘⇧X' },
      { id: 'research.run', label: 'Run Default Experiment', command: 'research.run' },
      separator('research.sep-1'),
      {
        id: 'research.telemetry',
        label: 'Telemetry…',
        command: 'research.telemetry',
        hint: (state) => `${state.telemetryEvents.length} events`,
      },
      { id: 'research.export-json', label: 'Export Telemetry as JSON', command: 'research.export-json' },
      { id: 'research.export-csv', label: 'Export Telemetry as CSV', command: 'research.export-csv' },
      { id: 'research.export-ndjson', label: 'Export Telemetry as NDJSON', command: 'research.export-ndjson' },
      separator('research.sep-2'),
      { id: 'research.performance', label: 'Performance Benchmarks…', command: 'research.performance' },
      { id: 'research.benchmark', label: 'Run Simulation Benchmark', command: 'research.benchmark' },
      { id: 'research.benchmark-large', label: 'Run Large-Network Benchmark', command: 'research.benchmark-large' },
    ],
  },
  {
    id: 'replay',
    label: 'Replay',
    items: [
      { id: 'replay.window', label: 'Replay Studio…', command: 'replay.window' },
      { id: 'replay.record', label: 'Record Replay', command: 'replay.record', shortcut: '⌥⌘R' },
      separator('replay.sep-1'),
      { id: 'replay.save', label: 'Save Replay JSON…', command: 'replay.save' },
      { id: 'replay.load', label: 'Load Replay JSON…', command: 'replay.load' },
      separator('replay.sep-2'),
      { id: 'replay.start', label: 'Jump to Start', command: 'replay.to-start' },
      { id: 'replay.back', label: 'Step Backward', command: 'replay.step-back', shortcut: '←' },
      { id: 'replay.forward', label: 'Step Forward', command: 'replay.step-forward', shortcut: '→' },
      { id: 'replay.end', label: 'Jump to End', command: 'replay.to-end' },
      { id: 'replay.play', label: 'Play Replay', command: 'replay.play' },
      { id: 'replay.pause', label: 'Pause Replay', command: 'replay.pause' },
      { id: 'replay.close', label: 'Close Replay', command: 'replay.stop' },
      separator('replay.sep-3'),
      {
        id: 'replay.status',
        label: 'Playback position',
        hint: (state) =>
          state.replayPlayback.replay
            ? `${state.replayPlayback.index}/${state.replayPlayback.replay.actions.length}`
            : 'no replay open',
      },
    ],
  },
  {
    id: 'tools',
    label: 'Tools',
    items: [
      { id: 'tools.palette', label: 'Command Palette', command: 'tools.palette', shortcut: '⌘K' },
      { id: 'tools.security', label: 'Security Validation…', command: 'tools.security' },
      separator('tools.sep-1'),
      { id: 'tools.mission', label: 'Mission Designer…', command: 'tools.mission-designer' },
      { id: 'tools.objectives', label: 'Objectives…', command: 'tools.objectives' },
      { id: 'tools.triggers', label: 'Event Triggers…', command: 'tools.event-triggers' },
      { id: 'tools.hierarchy', label: 'Outliner…', command: 'tools.hierarchy' },
      { id: 'tools.entity-palette', label: 'Entity Palette…', command: 'tools.entity-palette' },
      { id: 'tools.content', label: 'Content Browser…', command: 'tools.content-browser' },
      separator('tools.sep-2'),
      { id: 'tools.assets', label: 'Asset Pipeline…', command: 'tools.assets' },
      { id: 'tools.asset-import', label: 'Asset Import…', command: 'tools.asset-import' },
      { id: 'tools.scripts', label: 'Scripts & Plugins…', command: 'tools.scripts' },
      { id: 'tools.build', label: 'Build & Deploy…', command: 'tools.build' },
      { id: 'tools.presentation', label: 'Presentation & Audits…', command: 'tools.presentation' },
    ],
  },
  {
    id: 'window',
    label: 'Window',
    items: [
      { id: 'window.minimize', label: 'Minimize', command: 'window.minimize' },
      { id: 'window.maximize', label: 'Maximize / Restore', command: 'window.maximize' },
      { id: 'window.focus-next', label: 'Focus Next Window', command: 'window.focus-next', shortcut: '⌘`' },
      separator('window.sep-1'),
      { id: 'window.cascade', label: 'Cascade Windows', command: 'window.cascade' },
      { id: 'window.tile', label: 'Tile Windows', command: 'window.tile' },
      { id: 'window.restore-all', label: 'Restore All', command: 'window.restore-all' },
      { id: 'window.reset', label: 'Reset Window Layout', command: 'window.reset-layout' },
      { id: 'window.close-all', label: 'Close All Windows', command: 'window.close-all' },
      separator('window.sep-2'),
      ...WINDOW_DEFINITIONS.map((definition) => windowToggleItem('window', definition.kind)),
    ],
  },
  {
    id: 'help',
    label: 'Help',
    items: [
      { id: 'help.shortcuts', label: 'Keyboard Shortcuts', command: 'help.shortcuts', shortcut: '⌘/' },
      { id: 'help.about', label: 'About CYRE Studio', command: 'help.about' },
    ],
  },
];

/** Flattens every menu item id used by the menu bar (for stable test ids). */
export function listMenuItemIds(): string[] {
  return STUDIO_MENUS.flatMap((menu) => menu.items.map((item) => item.id));
}

/** Every command id referenced by the menu bar. */
export function listMenuCommandIds(): string[] {
  return STUDIO_MENUS.flatMap((menu) =>
    menu.items.map((item) => item.command).filter((command): command is string => Boolean(command)),
  );
}
