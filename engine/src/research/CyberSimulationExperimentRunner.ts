/**
 * CyberSimulationExperimentRunner
 * ---------------------------------
 * Runs reproducible CYRE cyber simulation experiments using the
 * canonical CyberSimulation replay system and structured telemetry.
 */

import { CyberSimulation } from '../cyber/simulation/index.js';
import type {
  CyberSimulationReplay,
  CyberSimulationReplayAction,
  CyberSimulationState,
} from '../cyber/simulation/index.js';
import { TelemetryRecorder } from '../analytics/index.js';
import { TelemetryExporter } from '../analytics/index.js';
import type { TelemetryEvent } from '../analytics/index.js';
import type { SimulationEvent } from '../simulation/index.js';

export interface CyberSimulationExperimentDefinition {
  id: string;
  name: string;
  description?: string;
  scenarioId?: string;
  engineVersion?: string;
  seedStart: number;
  runCount: number;
  actionPlan: CyberSimulationReplayAction[];
}

export interface CyberSimulationExperimentRunResult {
  experimentId: string;
  experimentName: string;
  participantId: string;
  seed: number;
  success: boolean;
  finalState: CyberSimulationState;
  eventHistory: SimulationEvent[];
  telemetry: TelemetryEvent[];
  replay: CyberSimulationReplay;
  error?: string;
}

export interface CyberSimulationExperimentOutput {
  experimentId: string;
  experimentName: string;
  generatedAt: number;
  runCount: number;
  results: CyberSimulationExperimentRunResult[];
}

const DEFAULT_ENGINE_VERSION = '1.0.4';
const DEFAULT_SCENARIO_ID = 'cyber-lab';

function assertNonEmptyString(value: string, label: string): void {
  if (!value || value.trim() === '') {
    throw new Error(`${label} must be a non-empty string.`);
  }
}

function assertPositiveInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer.`);
  }
}

function createReplay(
  seed: number,
  actionPlan: CyberSimulationReplayAction[],
  scenarioId: string,
  engineVersion: string,
): CyberSimulationReplay {
  return {
    formatVersion: 1,
    engineVersion,
    scenarioId,
    seed,
    actions: actionPlan.map((action) => ({
      method: action.method,
      args:
        action.args === undefined
          ? undefined
          : JSON.parse(JSON.stringify(action.args)),
    })),
  };
}

export class CyberSimulationExperimentRunner {
  constructor() {
    // Stateless runner; no initialization required.
  }

  run(
    definition: CyberSimulationExperimentDefinition,
  ): CyberSimulationExperimentOutput {
    this.validateDefinition(definition);

    const results: CyberSimulationExperimentRunResult[] = [];

    for (let index = 0; index < definition.runCount; index += 1) {
      const seed = definition.seedStart + index;
      const participantId = `${definition.id}-run-${index + 1}`;
      results.push(this.runOne(definition, participantId, seed));
    }

    return {
      experimentId: definition.id,
      experimentName: definition.name,
      generatedAt: Date.now(),
      runCount: results.length,
      results,
    };
  }

  runOne(
    definition: CyberSimulationExperimentDefinition,
    participantId: string,
    seed: number,
  ): CyberSimulationExperimentRunResult {
    this.validateDefinition(definition);
    assertNonEmptyString(participantId, 'Participant ID');
    assertPositiveInteger(seed, 'Seed');

    const scenarioId = definition.scenarioId ?? DEFAULT_SCENARIO_ID;
    const engineVersion = definition.engineVersion ?? DEFAULT_ENGINE_VERSION;
    const replay = createReplay(seed, definition.actionPlan, scenarioId, engineVersion);

    try {
      const sim = CyberSimulation.replay(replay);

      const telemetry = new TelemetryRecorder(participantId);

      for (const event of sim.getEventHistory()) {
        const data = event.data as Record<string, unknown> | undefined;
        telemetry.record(
          event.type,
          data === undefined
            ? { timestamp: event.timestamp }
            : { timestamp: event.timestamp, data },
        );
      }

      return {
        experimentId: definition.id,
        experimentName: definition.name,
        participantId,
        seed,
        success: true,
        finalState: sim.getState(),
        eventHistory: sim.getEventHistory(),
        telemetry: telemetry.getEvents(),
        replay,
      };
    } catch (error) {
      return {
        experimentId: definition.id,
        experimentName: definition.name,
        participantId,
        seed,
        success: false,
        finalState: {} as CyberSimulationState,
        eventHistory: [],
        telemetry: [],
        replay,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  exportResultsJSON(results: CyberSimulationExperimentRunResult[]): string {
    return JSON.stringify(results, null, 2);
  }

  exportResultsCSV(results: CyberSimulationExperimentRunResult[]): string {
    const events: TelemetryEvent[] = [];
    for (const result of results) {
      events.push(...result.telemetry);
    }
    return TelemetryExporter.toCSV(events);
  }

  exportResultsNDJSON(results: CyberSimulationExperimentRunResult[]): string {
    const lines: string[] = [];
    for (const result of results) {
      for (const event of result.telemetry) {
        lines.push(JSON.stringify(event));
      }
    }
    return lines.join('\n');
  }

  private validateDefinition(definition: CyberSimulationExperimentDefinition): void {
    if (!definition || typeof definition !== 'object' || Array.isArray(definition)) {
      throw new Error('Experiment definition must be an object.');
    }
    assertNonEmptyString(definition.id, 'Experiment id');
    assertNonEmptyString(definition.name, 'Experiment name');
    if (definition.description !== undefined && typeof definition.description !== 'string') {
      throw new Error('Experiment description must be a string if provided.');
    }
    if (definition.scenarioId !== undefined) {
      assertNonEmptyString(definition.scenarioId, 'Scenario id');
    }
    if (definition.engineVersion !== undefined) {
      assertNonEmptyString(definition.engineVersion, 'Engine version');
    }
    assertPositiveInteger(definition.seedStart, 'Seed start');
    assertPositiveInteger(definition.runCount, 'Run count');
    if (!Array.isArray(definition.actionPlan)) {
      throw new Error('Experiment actionPlan must be an array.');
    }
    for (const action of definition.actionPlan) {
      if (!action || typeof action !== 'object' || Array.isArray(action)) {
        throw new Error('Experiment action plan entry must be an object.');
      }
      assertNonEmptyString(action.method, 'Action plan method');
      if (
        action.args !== undefined &&
        (typeof action.args !== 'object' || Array.isArray(action.args))
      ) {
        throw new Error('Action plan args must be an object if provided.');
      }
    }
  }
}
