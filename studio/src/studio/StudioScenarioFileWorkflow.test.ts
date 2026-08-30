import { describe, expect, it } from 'vitest';
import { StudioApplication } from './StudioApplication';
import { findCyberScenario } from '@cyre/engine';

describe('Studio scenario file workflow', () => {
  it('exports the selected scenario as JSON', () => {
    const app = new StudioApplication();
    app.selectCyberScenario('fintech');

    const json = app.exportSelectedCyberScenario();
    expect(json).toContain('"id": "fintech"');
  });

  it('imports a scenario JSON and loads it on Play', () => {
    const app = new StudioApplication();
    const scenario = findCyberScenario('healthcare')!;
    const json = JSON.stringify(scenario, null, 2);

    app.importCyberScenario(json);
    expect(app.getState().selectedCyberScenarioId).toBe('healthcare');
    expect(app.getState().hasCustomCyberScenario).toBe(true);

    app.play();
    const state = app.getState();
    expect(state.cyberSimulationState).not.toBeNull();
    expect(Object.keys(state.cyberSimulationState!.hosts)).toHaveLength(5);
    expect(state.cyberSimulationState?.objective.targetHostId).toBe('patient-db');
  });

  it('rejects invalid scenario JSON', () => {
    const app = new StudioApplication();
    expect(() => app.importCyberScenario('not-json')).toThrowError(
      /invalid cyber scenario json/i,
    );
  });
});
