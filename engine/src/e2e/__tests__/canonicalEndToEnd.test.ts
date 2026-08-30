import { describe, expect, it } from 'vitest';
import { CyberSimulation } from '../../cyber/simulation/index.js';
import type {
  CyberSimulationReplay,
  CyberSimulationReplayAction,
} from '../../cyber/simulation/index.js';
import { CyberSimulationExperimentRunner } from '../../research/index.js';

const canonicalPlan: CyberSimulationReplayAction[] = [
  { method: 'runRecon' },
  { method: 'discoverServices' },
  { method: 'exploitWebServer' },
  { method: 'escalatePrivileges' },
  { method: 'detectThreats' },
  { method: 'investigateAlert', args: { alertId: 'alert-exploit-3' } },
  { method: 'isolateHost', args: { hostId: 'gateway' } },
  { method: 'moveToDatabase' },
  { method: 'accessTarget' },
];

const canonicalReplay: CyberSimulationReplay = {
  formatVersion: 1,
  engineVersion: '1.0.4',
  scenarioId: 'cyber-lab',
  seed: 12345,
  actions: canonicalPlan,
};

describe('CYRE canonical end-to-end deterministic incident', () => {
  it('reproduces the complete cyber incident from replay and telemetry', () => {
    const first = CyberSimulation.replay(canonicalReplay);
    const second = CyberSimulation.replay(canonicalReplay);

    expect(first.getState()).toEqual(second.getState());
    expect(first.getTime()).toBe(second.getTime());
    expect(first.getEventHistory()).toEqual(second.getEventHistory());

    const state = first.getState();
    expect(state.objective.achieved).toBe(true);
    expect(state.hosts['database-server'].compromised).toBe(true);
    expect(state.hosts['gateway'].isolated).toBe(true);
    expect(state.alerts.length).toBeGreaterThan(0);
    expect(state.defenderActions.length).toBeGreaterThan(0);
  });

  it('runs the same plan through the reproducible experiment pipeline', () => {
    const runner = new CyberSimulationExperimentRunner();
    const output = runner.run({
      id: 'e2e-canonical',
      name: 'Canonical End-to-End Incident',
      seedStart: canonicalReplay.seed,
      runCount: 1,
      actionPlan: canonicalPlan,
    });

    expect(output.results).toHaveLength(1);
    const result = output.results[0];

    expect(result.success).toBe(true);
    expect(result.finalState).toEqual(CyberSimulation.replay(canonicalReplay).getState());
    expect(result.replay).toEqual(canonicalReplay);
    expect(result.telemetry.length).toBeGreaterThan(0);
    expect(result.eventHistory).toEqual(
      CyberSimulation.replay(canonicalReplay).getEventHistory(),
    );

    const json = runner.exportResultsJSON(output.results);
    const csv = runner.exportResultsCSV(output.results);
    const ndjson = runner.exportResultsNDJSON(output.results);

    expect(() => JSON.parse(json)).not.toThrow();
    expect(csv.startsWith('id,sessionId,timestamp,type')).toBe(true);
    expect(ndjson.split('\n').filter((line) => line.trim().length > 0).length).toBeGreaterThan(0);
  });

  it('runs fresh simulations with different seeds and replays each identically', () => {
    const seeds = [100, 200, 300];

    for (const seed of seeds) {
      const replay: CyberSimulationReplay = {
        ...canonicalReplay,
        seed,
      };

      const original = CyberSimulation.replay(replay);
      const reproduced = CyberSimulation.replay(replay);

      expect(original.getState()).toEqual(reproduced.getState());
      expect(original.getEventHistory()).toEqual(reproduced.getEventHistory());
      expect(original.getTime()).toBe(reproduced.getTime());
    }
  });
});
