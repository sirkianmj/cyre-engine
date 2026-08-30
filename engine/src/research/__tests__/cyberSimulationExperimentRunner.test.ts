import { describe, expect, it } from 'vitest';
import { CyberSimulationExperimentRunner } from '../CyberSimulationExperimentRunner.js';
import type { CyberSimulationReplayAction } from '../../cyber/simulation/index.js';

const successfulPlan: CyberSimulationReplayAction[] = [
  { method: 'runRecon' },
  { method: 'discoverServices' },
  { method: 'exploitWebServer' },
  { method: 'escalatePrivileges' },
  { method: 'moveToDatabase' },
  { method: 'accessTarget' },
];

describe('CyberSimulationExperimentRunner', () => {
  it('runs a reproducible experiment and records telemetry', () => {
    const runner = new CyberSimulationExperimentRunner();
    const output = runner.run({
      id: 'exp-001',
      name: 'Full Attack Chain',
      seedStart: 100,
      runCount: 2,
      actionPlan: successfulPlan,
    });

    expect(output.results).toHaveLength(2);
    for (const result of output.results) {
      expect(result.success).toBe(true);
      expect(result.finalState.objective.achieved).toBe(true);
      expect(result.telemetry.length).toBeGreaterThan(0);
      expect(result.eventHistory.length).toBeGreaterThan(0);
      expect(result.replay.seed).toBe(result.seed);
    }
  });

  it('same seed produces identical final state, event history, and telemetry', () => {
    const runner = new CyberSimulationExperimentRunner();
    const def = {
      id: 'exp-002',
      name: 'Deterministic Reproducibility',
      seedStart: 12345,
      runCount: 1,
      actionPlan: successfulPlan,
    };

    const first = runner.run(def).results[0];
    const second = runner.run(def).results[0];

    expect(first.finalState).toEqual(second.finalState);
    expect(first.eventHistory).toEqual(second.eventHistory);
    expect(first.telemetry).toEqual(second.telemetry);
  });

  it('catches invalid action plans and returns failure result', () => {
    const runner = new CyberSimulationExperimentRunner();
    const output = runner.run({
      id: 'exp-003',
      name: 'Invalid Plan',
      seedStart: 1,
      runCount: 1,
      actionPlan: [
        { method: 'runRecon' },
        { method: 'exploitWebServer' },
      ],
    });

    expect(output.results[0].success).toBe(false);
    expect(output.results[0].error).toMatch(/must discover web service/i);
  });

  it('exports results as JSON, CSV, and NDJSON', () => {
    const runner = new CyberSimulationExperimentRunner();
    const output = runner.run({
      id: 'exp-004',
      name: 'Export Test',
      seedStart: 1,
      runCount: 1,
      actionPlan: successfulPlan,
    });

    const results = output.results;

    const json = runner.exportResultsJSON(results);
    const parsedJSON = JSON.parse(json) as unknown[];
    expect(parsedJSON).toHaveLength(1);

    const csv = runner.exportResultsCSV(results);
    expect(csv.startsWith('id,sessionId,timestamp,type')).toBe(true);
    expect(csv.split('\n').length).toBeGreaterThan(1);

    const ndjson = runner.exportResultsNDJSON(results);
    const lines = ndjson.split('\n').filter((line) => line.trim().length > 0);
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      expect(() => JSON.parse(line)).not.toThrow();
    }
  });

  it('rejects invalid experiment definitions', () => {
    const runner = new CyberSimulationExperimentRunner();
    expect(() =>
      runner.run({
        id: '',
        name: 'bad',
        seedStart: 0,
        runCount: 1,
        actionPlan: [],
      } as any),
    ).toThrowError(/experiment id/i);

    expect(() =>
      runner.run({
        id: 'bad',
        name: 'bad',
        seedStart: -1,
        runCount: 1,
        actionPlan: [],
      } as any),
    ).toThrowError(/seed start/i);

    expect(() =>
      runner.run({
        id: 'bad',
        name: 'bad',
        seedStart: 0,
        runCount: 1,
        actionPlan: [{}],
      } as any),
    ).toThrowError(/action plan method/i);
  });
});
