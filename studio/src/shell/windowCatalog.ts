/**
 * windowCatalog
 * --------------
 * Pure metadata describing every window CYRE Studio can present. The React
 * layer maps each `kind` onto a component; keeping the metadata separate
 * means the menu system, the Window menu and the tests can all reason about
 * windows without touching the DOM.
 */

export type WindowKind =
  // Engine capability windows
  | 'scenario-library'
  | 'scenario-editor'
  | 'scenario-designer'
  | 'scenario-generator'
  | 'simulation'
  | 'attack'
  | 'detection'
  | 'hosts'
  | 'telemetry'
  | 'replay'
  | 'research'
  | 'performance'
  | 'security'
  | 'project'
  | 'visualization'
  | 'output'
  | 'shortcuts'
  | 'about'
  // Authoring / production windows backed by existing engine panels
  | 'project-explorer'
  | 'hierarchy'
  | 'entity-palette'
  | 'inspector'
  | 'content-browser'
  | 'attack-graph'
  | 'evidence-graph'
  | 'timeline'
  | 'network-graph'
  | 'mission-designer'
  | 'objective-graph'
  | 'event-triggers'
  | 'live-inspector'
  | 'live-events'
  | 'debugger'
  | 'game-ui'
  | 'renderer'
  | 'assets'
  | 'asset-import'
  | 'scripts'
  | 'build'
  | 'presentation';

export type WindowGroup =
  | 'simulation'
  | 'scenarios'
  | 'research'
  | 'authoring'
  | 'production'
  | 'studio';

export interface WindowDefinition {
  kind: WindowKind;
  title: string;
  group: WindowGroup;
  icon: string;
  width: number;
  height: number;
  /** Short sentence shown in the Window menu tooltip and empty states. */
  summary: string;
}

export const WINDOW_DEFINITIONS: readonly WindowDefinition[] = [
  {
    kind: 'scenario-library',
    title: 'Scenario Library',
    group: 'scenarios',
    icon: 'library',
    width: 760,
    height: 560,
    summary: 'Browse, select, export and manage cyber scenarios.',
  },
  {
    kind: 'scenario-editor',
    title: 'Scenario Editor',
    group: 'scenarios',
    icon: 'edit',
    width: 880,
    height: 620,
    summary: 'Author, validate and save a cyber scenario definition.',
  },
  {
    kind: 'scenario-designer',
    title: 'Scenario Designer',
    group: 'scenarios',
    icon: 'target',
    width: 760,
    height: 600,
    summary: 'Author a mission scenario document with the engine scenario editor.',
  },
  {
    kind: 'scenario-generator',
    title: 'Scenario Generator',
    group: 'scenarios',
    icon: 'flask',
    width: 720,
    height: 600,
    summary: 'Procedurally generate a scenario from organisation and threat parameters.',
  },
  {
    kind: 'simulation',
    title: 'Simulation Control',
    group: 'simulation',
    icon: 'play',
    width: 720,
    height: 560,
    summary: 'Transport, speed, deterministic seed and step mode.',
  },
  {
    kind: 'attack',
    title: 'Attack Chain',
    group: 'simulation',
    icon: 'attack',
    width: 640,
    height: 620,
    summary: 'Execute the canonical attack chain against the live state.',
  },
  {
    kind: 'detection',
    title: 'Detection & Response',
    group: 'simulation',
    icon: 'shield',
    width: 780,
    height: 620,
    summary: 'Alerts, evidence and defender containment actions.',
  },
  {
    kind: 'hosts',
    title: 'Host Inspector',
    group: 'simulation',
    icon: 'server',
    width: 820,
    height: 560,
    summary: 'Live per-host state, attacker position and objective.',
  },
  {
    kind: 'telemetry',
    title: 'Telemetry',
    group: 'research',
    icon: 'chart',
    width: 820,
    height: 560,
    summary: 'Structured telemetry events with JSON, CSV and NDJSON export.',
  },
  {
    kind: 'replay',
    title: 'Replay Studio',
    group: 'research',
    icon: 'replay',
    width: 820,
    height: 620,
    summary: 'Record, save, load and step through deterministic replays.',
  },
  {
    kind: 'research',
    title: 'Experiment Runner',
    group: 'research',
    icon: 'flask',
    width: 900,
    height: 620,
    summary: 'Run multi-seed experiments and compare the results.',
  },
  {
    kind: 'performance',
    title: 'Performance',
    group: 'research',
    icon: 'gauge',
    width: 760,
    height: 560,
    summary: 'Simulation and large-network benchmarks.',
  },
  {
    kind: 'security',
    title: 'Security Validation',
    group: 'studio',
    icon: 'lock',
    width: 860,
    height: 620,
    summary: 'Sandbox safety, hostile payload rejection and audit report.',
  },
  {
    kind: 'project',
    title: 'Project',
    group: 'studio',
    icon: 'folder',
    width: 680,
    height: 520,
    summary: 'Create, save, load and export the Studio project.',
  },
  {
    kind: 'visualization',
    title: 'Visualization',
    group: 'studio',
    icon: 'eye',
    width: 640,
    height: 620,
    summary: 'Render mode, overlays, lighting and render backends.',
  },
  {
    kind: 'output',
    title: 'Output',
    group: 'studio',
    icon: 'terminal',
    width: 720,
    height: 420,
    summary: 'Engine notifications and status history.',
  },
  {
    kind: 'shortcuts',
    title: 'Keyboard Shortcuts',
    group: 'studio',
    icon: 'keyboard',
    width: 620,
    height: 560,
    summary: 'Every shortcut registered in the command palette.',
  },
  {
    kind: 'about',
    title: 'About CYRE Studio',
    group: 'studio',
    icon: 'info',
    width: 560,
    height: 460,
    summary: 'Engine, package and verification information.',
  },
  {
    kind: 'project-explorer',
    title: 'Project Explorer',
    group: 'authoring',
    icon: 'folder',
    width: 420,
    height: 620,
    summary: 'Project node tree with drag, rename and delete.',
  },
  {
    kind: 'hierarchy',
    title: 'Outliner',
    group: 'authoring',
    icon: 'list',
    width: 420,
    height: 560,
    summary: 'Flat outline of every entity in the scene.',
  },
  {
    kind: 'entity-palette',
    title: 'Entity Palette',
    group: 'authoring',
    icon: 'grid',
    width: 420,
    height: 620,
    summary: 'Drag cyber entities into the network graph.',
  },
  {
    kind: 'inspector',
    title: 'Inspector',
    group: 'authoring',
    icon: 'sliders',
    width: 420,
    height: 620,
    summary: 'Properties of the current selection.',
  },
  {
    kind: 'content-browser',
    title: 'Content Browser',
    group: 'authoring',
    icon: 'grid',
    width: 760,
    height: 520,
    summary: 'Browse scenario content registered with the engine.',
  },
  {
    kind: 'attack-graph',
    title: 'Attack Graph',
    group: 'authoring',
    icon: 'graph',
    width: 760,
    height: 560,
    summary: 'Author the attack kill chain graph.',
  },
  {
    kind: 'evidence-graph',
    title: 'Evidence Graph',
    group: 'authoring',
    icon: 'graph',
    width: 760,
    height: 560,
    summary: 'Author the analyst evidence graph.',
  },
  {
    kind: 'timeline',
    title: 'Timeline',
    group: 'authoring',
    icon: 'clock',
    width: 760,
    height: 460,
    summary: 'Authored incident timeline entries.',
  },
  {
    kind: 'network-graph',
    title: 'Network Graph',
    group: 'authoring',
    icon: 'graph',
    width: 820,
    height: 560,
    summary: 'Editable network topology with validation.',
  },
  {
    kind: 'mission-designer',
    title: 'Mission Designer',
    group: 'authoring',
    icon: 'target',
    width: 720,
    height: 560,
    summary: 'Mission objectives and design metadata.',
  },
  {
    kind: 'objective-graph',
    title: 'Objectives',
    group: 'authoring',
    icon: 'target',
    width: 720,
    height: 520,
    summary: 'Objective dependency graph.',
  },
  {
    kind: 'event-triggers',
    title: 'Event Triggers',
    group: 'authoring',
    icon: 'bolt',
    width: 720,
    height: 520,
    summary: 'Event-driven scenario trigger rules.',
  },
  {
    kind: 'live-inspector',
    title: 'Live Inspector',
    group: 'simulation',
    icon: 'activity',
    width: 520,
    height: 560,
    summary: 'Live play-mode simulation snapshot.',
  },
  {
    kind: 'live-events',
    title: 'Live Events',
    group: 'simulation',
    icon: 'activity',
    width: 640,
    height: 480,
    summary: 'Event stream captured while playing.',
  },
  {
    kind: 'debugger',
    title: 'Debugger',
    group: 'simulation',
    icon: 'bug',
    width: 640,
    height: 520,
    summary: 'Engine debugger session and snapshot.',
  },
  {
    kind: 'game-ui',
    title: 'Game UI',
    group: 'production',
    icon: 'layout',
    width: 760,
    height: 620,
    summary: 'Runtime game HUD workspace preview.',
  },
  {
    kind: 'renderer',
    title: 'Renderer',
    group: 'production',
    icon: 'eye',
    width: 720,
    height: 560,
    summary: 'Render backends, targets and scene rendering.',
  },
  {
    kind: 'assets',
    title: 'Asset Pipeline',
    group: 'production',
    icon: 'box',
    width: 720,
    height: 560,
    summary: 'Asset registration, import and preview generation.',
  },
  {
    kind: 'asset-import',
    title: 'Asset Import',
    group: 'production',
    icon: 'upload',
    width: 680,
    height: 520,
    summary: 'Import asset files into the project.',
  },
  {
    kind: 'scripts',
    title: 'Scripts & Plugins',
    group: 'production',
    icon: 'code',
    width: 720,
    height: 560,
    summary: 'CyreScript authoring and plugin registry.',
  },
  {
    kind: 'build',
    title: 'Build & Deploy',
    group: 'production',
    icon: 'package',
    width: 760,
    height: 600,
    summary: 'Build profiles, CI/CD pipeline and packaging.',
  },
  {
    kind: 'presentation',
    title: 'Presentation',
    group: 'production',
    icon: 'presentation',
    width: 720,
    height: 520,
    summary: 'UX and visual design audits.',
  },
];

const DEFINITION_LOOKUP: ReadonlyMap<WindowKind, WindowDefinition> = new Map(
  WINDOW_DEFINITIONS.map((definition) => [definition.kind, definition]),
);

export function getWindowDefinition(kind: WindowKind): WindowDefinition {
  const definition = DEFINITION_LOOKUP.get(kind);
  if (!definition) throw new Error(`Unknown window kind "${kind}".`);
  return definition;
}

export function isWindowKind(value: string): value is WindowKind {
  return DEFINITION_LOOKUP.has(value as WindowKind);
}

export function listWindowDefinitions(group?: WindowGroup): WindowDefinition[] {
  return WINDOW_DEFINITIONS.filter(
    (definition) => group === undefined || definition.group === group,
  );
}
