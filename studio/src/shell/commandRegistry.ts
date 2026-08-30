/**
 * commandRegistry
 * ----------------
 * Every action reachable from the CYRE Studio menu bar, command palette and
 * keyboard layer. Each command calls into `StudioApplication`, which is the
 * single bridge to `@cyre/engine` — there are no UI-only shortcuts here.
 */

import type { CyberActionId } from '../studio/services/CyberSessionService';
import { createExperimentDefinition } from '../studio/services/ExperimentService';
import type { TelemetryExportFormat } from '../studio/services/TelemetryService';
import { TELEMETRY_EXPORT_MIME } from '../studio/services/TelemetryService';
import { createScenarioDraft } from '../studio/StudioDocument';

import type { CommandContext, CommandDescriptor } from './commandModel';
import type { WindowKind } from './windowCatalog';
import { WINDOW_DEFINITIONS } from './windowCatalog';

const SPEEDS = [0.25, 0.5, 1, 2, 4] as const;

function speedId(speed: number): string {
  return `simulation.speed.${speed}`;
}

/** Builds a command whose only effect is presenting a window. */
function open(kind: WindowKind): CommandDescriptor['run'] {
  return (context) => context.openWindow(kind);
}

function windowToggleCommands(): CommandDescriptor[] {
  return WINDOW_DEFINITIONS.map((definition) => ({
    id: `window.toggle.${definition.kind}`,
    label: definition.title,
    category: 'Window' as const,
    windowKind: definition.kind,
    run: (context) => {
      const existing = context.application.windows.listByKind(definition.kind);
      if (existing.length > 0) {
        context.application.windows.closeKind(definition.kind);
        return;
      }
      context.openWindow(definition.kind);
    },
  }));
}

function exportTelemetry(
  format: TelemetryExportFormat,
): CommandDescriptor['run'] {
  return (context) => {
    const application = context.application;
    const events = application.telemetry.getEvents();

    if (events.length === 0) {
      context.notify('warning', 'No telemetry events have been recorded yet.');
      return;
    }

    context.download(
      `cyre-telemetry-${application.telemetry.getSessionId()}.${format === 'ndjson' ? 'ndjson' : format}`,
      TELEMETRY_EXPORT_MIME[format],
      application.telemetry.export(format),
    );
    context.notify('success', `Exported ${events.length} telemetry events as ${format.toUpperCase()}.`);
  };
}

export function createCommandDescriptors(): CommandDescriptor[] {
  const descriptors: CommandDescriptor[] = [
    // ---------------------------------------------------------------- File
    {
      id: 'project.new',
      label: 'New Project',
      category: 'File',
      shortcut: '⌘N',
      destructive: true,
      run: async (context) => {
        const confirmed = await context.confirm(
          'New Project',
          'Creating a new project discards unsaved changes in the current one.',
        );
        if (!confirmed) return;

        context.application.createProject('Untitled CYRE Project', 'soc-game');
        context.notify('success', 'New project created.');
      },
    },
    {
      id: 'project.open',
      label: 'Open Last Project',
      category: 'File',
      shortcut: '⌘O',
      run: (context) => {
        const loaded = context.application.loadSavedProject();
        context.notify(
          loaded ? 'success' : 'warning',
          loaded ? 'Saved project restored.' : 'No saved project was found in this browser.',
        );
      },
    },
    {
      id: 'project.save',
      label: 'Save Project',
      category: 'File',
      shortcut: '⌘S',
      run: (context) => {
        context.application.saveProject();
        context.notify('success', 'Project saved.');
      },
    },
    {
      id: 'project.export',
      label: 'Export Project…',
      category: 'File',
      run: (context) => {
        context.download(
          'cyre-project.json',
          'application/json',
          context.application.exportProject(),
        );
        context.notify('success', 'Project exported.');
      },
    },
    {
      id: 'project.manager',
      label: 'Project Manager…',
      category: 'File',
      windowKind: 'project',
      run: open('project'),
    },
    {
      id: 'scenario.import',
      label: 'Import Scenario JSON…',
      category: 'File',
      shortcut: '⌥⌘I',
      run: async (context) => {
        const json = await context.pickTextFile('application/json,.json');
        if (!json) return;

        try {
          context.application.importCyberScenario(json);
          context.notify('success', 'Scenario imported.');
        } catch (error) {
          context.notify('error', error instanceof Error ? error.message : String(error));
        }
      },
    },
    {
      id: 'scenario.export',
      label: 'Export Scenario JSON',
      category: 'File',
      shortcut: '⌥⌘E',
      run: (context) => {
        const scenario = context.application.getSelectedScenario();
        if (!scenario) {
          context.notify('warning', 'No scenario is selected.');
          return;
        }

        context.download(
          `${scenario.id}.json`,
          'application/json',
          context.application.exportSelectedCyberScenario(),
        );
        context.notify('success', `Exported "${scenario.name}".`);
      },
    },
    {
      id: 'window.close',
      label: 'Close Window',
      category: 'File',
      shortcut: '⌘W',
      run: (context) => {
        const focused = context.application.windows.getFocused();
        if (!focused) {
          context.notify('info', 'No window is open.');
          return;
        }
        context.application.windows.close(focused.id);
      },
    },
    {
      id: 'window.close-all',
      label: 'Close All Windows',
      category: 'File',
      shortcut: '⇧⌘W',
      run: (context) => context.application.windows.closeAll(),
    },

    // ---------------------------------------------------------------- Edit
    {
      id: 'edit.undo',
      label: 'Undo',
      category: 'Edit',
      shortcut: '⌘Z',
      run: (context) => context.application.undo(),
    },
    {
      id: 'edit.redo',
      label: 'Redo',
      category: 'Edit',
      shortcut: '⇧⌘Z',
      run: (context) => context.application.redo(),
    },
    {
      id: 'edit.new-scenario-draft',
      label: 'New Scenario Draft',
      category: 'Edit',
      shortcut: '⌥⌘N',
      run: (context) => {
        const existing = context.application.getScenarioDraft();
        const id = existing ? `${existing.id}-copy` : 'custom-scenario';
        context.application.setScenarioDraft(createScenarioDraft(id), 'New scenario draft');
        context.openWindow('scenario-editor');
      },
    },
    {
      id: 'edit.validate-scenario',
      label: 'Validate Scenario',
      category: 'Edit',
      shortcut: '⌥⌘V',
      run: (context) => {
        try {
          const report = context.application.validateScenarioDraft();
          context.notify(
            report.isValid ? 'success' : 'error',
            report.isValid
              ? `Scenario is valid (${report.issues.length} advisories).`
              : `Scenario has ${report.issues.filter((issue) => issue.severity === 'error').length} errors.`,
          );
        } catch (error) {
          context.notify('error', error instanceof Error ? error.message : String(error));
        }
      },
    },
    {
      id: 'edit.scenario-editor',
      label: 'Scenario Editor…',
      category: 'Edit',
      windowKind: 'scenario-editor',
      run: open('scenario-editor'),
    },

    // ---------------------------------------------------------------- View
    {
      id: 'view.mode-2d',
      label: '2D Viewport',
      category: 'View',
      shortcut: '1',
      run: (context) => context.application.setRenderMode('2d'),
    },
    {
      id: 'view.mode-2.5d',
      label: '2.5D Viewport',
      category: 'View',
      shortcut: '2',
      run: (context) => context.application.setRenderMode('2.5d'),
    },
    {
      id: 'view.mode-3d',
      label: '3D Viewport',
      category: 'View',
      shortcut: '3',
      run: (context) => context.application.setRenderMode('3d'),
    },
    {
      id: 'view.appearance-dark',
      label: 'Dark Appearance',
      category: 'View',
      run: (context) => context.application.setAppearance('dark'),
    },
    {
      id: 'view.appearance-light',
      label: 'Light Appearance',
      category: 'View',
      run: (context) => context.application.setAppearance('light'),
    },
    {
      id: 'view.reduce-motion',
      label: 'Reduce Motion',
      category: 'View',
      run: (context) => {
        const application = context.application;
        application.setReduceMotion(!application.getState().motionReduced);
      },
    },
    {
      id: 'view.visualization',
      label: 'Visualization Settings…',
      category: 'View',
      windowKind: 'visualization',
      run: open('visualization'),
    },
    {
      id: 'view.output',
      label: 'Output',
      category: 'View',
      windowKind: 'output',
      run: open('output'),
    },
    {
      id: 'view.inspector',
      label: 'Inspector',
      category: 'View',
      windowKind: 'inspector',
      run: open('inspector'),
    },
    {
      id: 'view.project-explorer',
      label: 'Project Explorer',
      category: 'View',
      windowKind: 'project-explorer',
      run: open('project-explorer'),
    },
    {
      id: 'view.hosts',
      label: 'Host Inspector',
      category: 'View',
      windowKind: 'hosts',
      run: open('hosts'),
    },

    // ----------------------------------------------------------- Scenarios
    {
      id: 'scenario.library',
      label: 'Scenario Library…',
      category: 'Scenarios',
      shortcut: '⌘⇧L',
      windowKind: 'scenario-library',
      run: open('scenario-library'),
    },
    {
      id: 'scenario.editor',
      label: 'Scenario Editor…',
      category: 'Scenarios',
      windowKind: 'scenario-editor',
      run: open('scenario-editor'),
    },
    {
      id: 'scenario.designer',
      label: 'Scenario Designer…',
      category: 'Scenarios',
      windowKind: 'scenario-designer',
      run: open('scenario-designer'),
    },
    {
      id: 'scenario.generator',
      label: 'Scenario Generator…',
      category: 'Scenarios',
      windowKind: 'scenario-generator',
      run: open('scenario-generator'),
    },
    {
      id: 'scenario.validate',
      label: 'Validate Scenario',
      category: 'Scenarios',
      run: (context) => {
        const scenario = context.application.getSelectedScenario();
        if (!scenario) {
          context.notify('warning', 'No scenario is selected.');
          return;
        }

        const structural = context.application.validateCyberScenario(scenario);
        const security = context.application.runSecurityValidation();
        const errorCount = structural.issues.filter((issue) => issue.severity === 'error').length;
        const passed = structural.isValid && security.passed;

        context.notify(
          passed ? 'success' : 'error',
          passed
            ? `"${scenario.name}" passed structural, sandbox and audit checks (${structural.hostCount} hosts).`
            : `"${scenario.name}" failed validation: ${errorCount} structural error(s), security passed=${security.passed}.`,
        );
        context.openWindow('security');
      },
    },
    {
      id: 'scenario.save',
      label: 'Save Scenario Draft',
      category: 'Scenarios',
      shortcut: '⌥⌘S',
      run: (context) => {
        try {
          context.application.commitScenarioDraft();
          context.notify('success', 'Scenario draft saved to the library.');
        } catch (error) {
          context.notify('error', error instanceof Error ? error.message : String(error));
        }
      },
    },
    {
      id: 'scenario.run',
      label: 'Run Scenario',
      category: 'Scenarios',
      shortcut: '⌘R',
      run: (context) => {
        try {
          context.application.startCyberSimulationForSelectedScenario();
          context.application.play();
          context.notify('success', 'Scenario is running in the viewport.');
        } catch (error) {
          context.notify('error', error instanceof Error ? error.message : String(error));
        }
      },
    },

    // ---------------------------------------------------------- Simulation
    {
      id: 'simulation.play',
      label: 'Play',
      category: 'Simulation',
      shortcut: 'F6',
      run: (context) => context.application.play(),
    },
    {
      id: 'simulation.pause',
      label: 'Pause',
      category: 'Simulation',
      shortcut: 'F7',
      run: (context) => context.application.pause(),
    },
    {
      id: 'simulation.resume',
      label: 'Resume',
      category: 'Simulation',
      shortcut: '⇧F7',
      run: (context) => context.application.resume(),
    },
    {
      id: 'simulation.stop',
      label: 'Stop',
      category: 'Simulation',
      shortcut: 'F8',
      run: (context) => context.application.stop(),
    },
    {
      id: 'simulation.restart',
      label: 'Restart',
      category: 'Simulation',
      shortcut: '⇧F8',
      run: (context) => context.application.restart(),
    },
    {
      id: 'simulation.step',
      label: 'Step One Tick',
      category: 'Simulation',
      shortcut: 'F10',
      run: (context) => {
        try {
          context.application.stepCyberSimulation();
        } catch (error) {
          context.notify('error', error instanceof Error ? error.message : String(error));
        }
      },
    },
    {
      id: 'simulation.step-mode',
      label: 'Step Mode',
      category: 'Simulation',
      run: (context) => {
        const application = context.application;
        application.setStepMode(!application.getState().cyberSession.stepMode);
      },
    },
    ...SPEEDS.map((speed) => ({
      id: speedId(speed),
      label: `${speed}× Speed`,
      category: 'Simulation' as const,
      run: (context: CommandContext) => context.application.setSimulationSpeed(speed),
    })),
    {
      id: 'simulation.control',
      label: 'Simulation Control…',
      category: 'Simulation',
      windowKind: 'simulation',
      run: open('simulation'),
    },
    {
      id: 'simulation.attack',
      label: 'Attack Chain…',
      category: 'Simulation',
      windowKind: 'attack',
      run: open('attack'),
    },
    {
      id: 'simulation.detection',
      label: 'Detection & Response…',
      category: 'Simulation',
      windowKind: 'detection',
      run: open('detection'),
    },
    {
      id: 'simulation.hosts',
      label: 'Host Inspector…',
      category: 'Simulation',
      windowKind: 'hosts',
      run: open('hosts'),
    },
    ...(['runRecon', 'discoverServices', 'exploitWebServer', 'escalatePrivileges', 'moveToDatabase', 'accessTarget', 'detectThreats'] as CyberActionId[]).map(
      (action) => ({
        id: `simulation.action.${action}`,
        label: `Run ${action}`,
        category: 'Simulation' as const,
        run: (context: CommandContext) => {
          try {
            context.application.executeCyberAction(action);
          } catch (error) {
            context.notify('error', error instanceof Error ? error.message : String(error));
          }
        },
      }),
    ),

    // ----------------------------------------------------------- Visualize
    {
      id: 'visualize.settings',
      label: 'Visualization Settings…',
      category: 'Visualize',
      windowKind: 'visualization',
      run: open('visualization'),
    },
    {
      id: 'visualize.attack-graph',
      label: 'Attack Graph…',
      category: 'Visualize',
      windowKind: 'attack-graph',
      run: open('attack-graph'),
    },
    {
      id: 'visualize.evidence-graph',
      label: 'Evidence Graph…',
      category: 'Visualize',
      windowKind: 'evidence-graph',
      run: open('evidence-graph'),
    },
    {
      id: 'visualize.timeline',
      label: 'Timeline…',
      category: 'Visualize',
      windowKind: 'timeline',
      run: open('timeline'),
    },
    {
      id: 'visualize.network-graph',
      label: 'Network Graph…',
      category: 'Visualize',
      windowKind: 'network-graph',
      run: open('network-graph'),
    },
    {
      id: 'visualize.live-inspector',
      label: 'Live Inspector…',
      category: 'Visualize',
      windowKind: 'live-inspector',
      run: open('live-inspector'),
    },
    {
      id: 'visualize.live-events',
      label: 'Live Events…',
      category: 'Visualize',
      windowKind: 'live-events',
      run: open('live-events'),
    },
    {
      id: 'visualize.debugger',
      label: 'Debugger…',
      category: 'Visualize',
      windowKind: 'debugger',
      run: open('debugger'),
    },
    {
      id: 'visualize.game-ui',
      label: 'Game UI…',
      category: 'Visualize',
      windowKind: 'game-ui',
      run: open('game-ui'),
    },
    {
      id: 'visualize.renderer',
      label: 'Renderer…',
      category: 'Visualize',
      windowKind: 'renderer',
      run: open('renderer'),
    },

    // ------------------------------------------------------------ Research
    {
      id: 'research.experiments',
      label: 'Experiment Runner…',
      category: 'Research',
      shortcut: '⌘⇧X',
      windowKind: 'research',
      run: open('research'),
    },
    {
      id: 'research.run',
      label: 'Run Default Experiment',
      category: 'Research',
      run: (context) => {
        try {
          const application = context.application;
          const session = application.cyber.snapshot();
          const stored = application.experiments.run(
            createExperimentDefinition({
              id: `experiment-${Date.now().toString(36)}`,
              name: 'Studio seeded experiment',
              description: 'Default deterministic attack chain across sequential seeds.',
              scenarioId: session.scenarioId,
              seedStart: 1,
              runCount: 5,
            }),
          );

          context.notify(
            'success',
            `Ran ${stored.comparison.runCount} seeds · ${stored.comparison.successCount} succeeded · deterministic=${stored.comparison.deterministic}`,
          );
          context.openWindow('research');
        } catch (error) {
          context.notify('error', error instanceof Error ? error.message : String(error));
        }
      },
    },
    {
      id: 'research.telemetry',
      label: 'Telemetry…',
      category: 'Research',
      windowKind: 'telemetry',
      run: open('telemetry'),
    },
    {
      id: 'research.export-json',
      label: 'Export Telemetry as JSON',
      category: 'Research',
      run: exportTelemetry('json'),
    },
    {
      id: 'research.export-csv',
      label: 'Export Telemetry as CSV',
      category: 'Research',
      run: exportTelemetry('csv'),
    },
    {
      id: 'research.export-ndjson',
      label: 'Export Telemetry as NDJSON',
      category: 'Research',
      run: exportTelemetry('ndjson'),
    },
    {
      id: 'research.performance',
      label: 'Performance Benchmarks…',
      category: 'Research',
      windowKind: 'performance',
      run: open('performance'),
    },
    {
      id: 'research.benchmark',
      label: 'Run Simulation Benchmark',
      category: 'Research',
      run: (context) => {
        const report = context.application.benchmarks.runSimulationBenchmark(200);
        context.notify(
          'success',
          `${report.simulation?.iterations} simulations in ${report.simulation?.durationMs.toFixed(1)} ms.`,
        );
        context.openWindow('performance');
      },
    },
    {
      id: 'research.benchmark-large',
      label: 'Run Large-Network Benchmark',
      category: 'Research',
      run: (context) => {
        const report = context.application.benchmarks.runLargeNetworkBenchmark(1000);
        context.notify(
          'success',
          `${report.largeNetwork?.hostCount} hosts initialized in ${report.largeNetwork?.durationMs.toFixed(1)} ms.`,
        );
        context.openWindow('performance');
      },
    },

    // -------------------------------------------------------------- Replay
    {
      id: 'replay.window',
      label: 'Replay Studio…',
      category: 'Replay',
      windowKind: 'replay',
      run: open('replay'),
    },
    {
      id: 'replay.record',
      label: 'Record Replay',
      category: 'Replay',
      shortcut: '⌥⌘R',
      run: (context) => {
        const replay = context.application.getCyberSimulationReplay();
        if (!replay) {
          context.notify('warning', 'Start a simulation before recording a replay.');
          return;
        }

        context.application.openReplayPlayback(replay);
        context.notify(
          'success',
          `Recorded ${replay.actions.length} actions for seed ${replay.seed}.`,
        );
        context.openWindow('replay');
      },
    },
    {
      id: 'replay.save',
      label: 'Save Replay JSON…',
      category: 'Replay',
      run: (context) => {
        try {
          const replay = context.application.getCyberSimulationReplay();
          if (!replay) {
            context.notify('warning', 'No replay is available to save.');
            return;
          }

          context.download(
            `cyre-replay-${replay.seed}.json`,
            'application/json',
            context.application.exportCyberReplayJSON(),
          );
          context.notify('success', 'Replay saved.');
        } catch (error) {
          context.notify('error', error instanceof Error ? error.message : String(error));
        }
      },
    },
    {
      id: 'replay.load',
      label: 'Load Replay JSON…',
      category: 'Replay',
      run: async (context) => {
        const json = await context.pickTextFile('application/json,.json');
        if (!json) return;

        try {
          context.application.importCyberReplayJSON(json);
          context.notify('success', 'Replay loaded.');
        } catch (error) {
          context.notify('error', error instanceof Error ? error.message : String(error));
        }
      },
    },
    {
      id: 'replay.to-start',
      label: 'Jump to Start',
      category: 'Replay',
      run: (context) => seekReplay(context, 0),
    },
    {
      id: 'replay.step-back',
      label: 'Step Backward',
      category: 'Replay',
      shortcut: '←',
      run: (context) => seekReplay(context, context.application.getReplayPlayback().index - 1),
    },
    {
      id: 'replay.step-forward',
      label: 'Step Forward',
      category: 'Replay',
      shortcut: '→',
      run: (context) => seekReplay(context, context.application.getReplayPlayback().index + 1),
    },
    {
      id: 'replay.to-end',
      label: 'Jump to End',
      category: 'Replay',
      run: (context) => {
        const replay = context.application.getReplayPlayback().replay;
        if (!replay) {
          context.notify('warning', 'No replay is open.');
          return;
        }
        seekReplay(context, replay.actions.length);
      },
    },
    {
      id: 'replay.play',
      label: 'Play Replay',
      category: 'Replay',
      run: (context) => {
        try {
          context.application.playReplayPlayback();
        } catch (error) {
          context.notify('error', error instanceof Error ? error.message : String(error));
        }
      },
    },
    {
      id: 'replay.pause',
      label: 'Pause Replay',
      category: 'Replay',
      run: (context) => context.application.pauseReplayPlayback(),
    },
    {
      id: 'replay.stop',
      label: 'Close Replay',
      category: 'Replay',
      run: (context) => context.application.openReplayPlayback(null),
    },
    {
      id: 'replay.bookmark',
      label: 'Bookmark Current Event',
      category: 'Replay',
      run: (context) => {
        const index = context.application.getState().replayCurrentIndex;
        context.application.addReplayBookmark(`Event ${index + 1}`);
        context.notify('success', `Bookmarked event ${index + 1}.`);
      },
    },

    // --------------------------------------------------------------- Tools
    {
      id: 'tools.palette',
      label: 'Command Palette',
      category: 'Tools',
      shortcut: '⌘K',
      run: (context) => context.togglePalette(),
    },
    {
      id: 'tools.security',
      label: 'Security Validation…',
      category: 'Tools',
      windowKind: 'security',
      run: open('security'),
    },
    {
      id: 'tools.mission-designer',
      label: 'Mission Designer…',
      category: 'Tools',
      windowKind: 'mission-designer',
      run: open('mission-designer'),
    },
    {
      id: 'tools.objectives',
      label: 'Objectives…',
      category: 'Tools',
      windowKind: 'objective-graph',
      run: open('objective-graph'),
    },
    {
      id: 'tools.event-triggers',
      label: 'Event Triggers…',
      category: 'Tools',
      windowKind: 'event-triggers',
      run: open('event-triggers'),
    },
    {
      id: 'tools.hierarchy',
      label: 'Outliner…',
      category: 'Tools',
      windowKind: 'hierarchy',
      run: open('hierarchy'),
    },
    {
      id: 'tools.entity-palette',
      label: 'Entity Palette…',
      category: 'Tools',
      windowKind: 'entity-palette',
      run: open('entity-palette'),
    },
    {
      id: 'tools.content-browser',
      label: 'Content Browser…',
      category: 'Tools',
      windowKind: 'content-browser',
      run: open('content-browser'),
    },
    {
      id: 'tools.assets',
      label: 'Asset Pipeline…',
      category: 'Tools',
      windowKind: 'assets',
      run: open('assets'),
    },
    {
      id: 'tools.asset-import',
      label: 'Asset Import…',
      category: 'Tools',
      windowKind: 'asset-import',
      run: open('asset-import'),
    },
    {
      id: 'tools.scripts',
      label: 'Scripts & Plugins…',
      category: 'Tools',
      windowKind: 'scripts',
      run: open('scripts'),
    },
    {
      id: 'tools.build',
      label: 'Build & Deploy…',
      category: 'Tools',
      windowKind: 'build',
      run: open('build'),
    },
    {
      id: 'tools.presentation',
      label: 'Presentation & Audits…',
      category: 'Tools',
      windowKind: 'presentation',
      run: open('presentation'),
    },

    // -------------------------------------------------------------- Window
    {
      id: 'window.cascade',
      label: 'Cascade Windows',
      category: 'Window',
      run: (context) => context.application.windows.cascade(),
    },
    {
      id: 'window.tile',
      label: 'Tile Windows',
      category: 'Window',
      run: (context) => context.application.windows.tile(),
    },
    {
      id: 'window.restore-all',
      label: 'Restore All Windows',
      category: 'Window',
      run: (context) => context.application.windows.restoreAll(),
    },
    {
      id: 'window.minimize',
      label: 'Minimize Window',
      category: 'Window',
      run: (context) => {
        const focused = context.application.windows.getFocused();
        if (focused) context.application.windows.minimize(focused.id);
      },
    },
    {
      id: 'window.maximize',
      label: 'Maximize Window',
      category: 'Window',
      run: (context) => {
        const focused = context.application.windows.getFocused();
        if (focused) context.application.windows.toggleMaximize(focused.id);
      },
    },
    {
      id: 'window.focus-next',
      label: 'Focus Next Window',
      category: 'Window',
      shortcut: '⌘`',
      run: (context) => {
        const windows = context.application.windows
          .list()
          .filter((entry) => !entry.minimized);
        if (windows.length === 0) return;

        const focusedId = context.application.windows.getFocused()?.id ?? null;
        const index = windows.findIndex((entry) => entry.id === focusedId);
        const next = windows[(index + 1) % windows.length];
        context.application.windows.focus(next.id);
      },
    },
    {
      id: 'window.reset-layout',
      label: 'Reset Window Layout',
      category: 'Window',
      run: (context) => {
        context.application.windows.resetLayout();
        context.notify('info', 'Window layout reset.');
      },
    },
    ...windowToggleCommands(),

    // ---------------------------------------------------------------- Help
    {
      id: 'help.shortcuts',
      label: 'Keyboard Shortcuts',
      category: 'Help',
      shortcut: '⌘/',
      windowKind: 'shortcuts',
      run: open('shortcuts'),
    },
    {
      id: 'help.about',
      label: 'About CYRE Studio',
      category: 'Help',
      windowKind: 'about',
      run: open('about'),
    },
  ];

  return descriptors;
}

function seekReplay(context: CommandContext, index: number): void {
  try {
    context.application.seekReplayPlayback(index);
  } catch (error) {
    context.notify('error', error instanceof Error ? error.message : String(error));
  }
}
