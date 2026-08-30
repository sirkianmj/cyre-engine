import { describe, expect, it } from 'vitest';
import { StudioApplication } from './StudioApplication';

describe('Studio cyber scenario selection', () => {
  it('lists all scenarios from the catalog', () => {
    const app = new StudioApplication();
    const scenarios = app.listCyberScenarios();

    expect(scenarios).toHaveLength(3);
    expect(scenarios.map((scenario) => scenario.id)).toEqual([
      'lab-basic',
      'fintech',
      'healthcare',
    ]);
  });

  it('selects a scenario and updates the selected id', () => {
    const app = new StudioApplication();
    app.selectCyberScenario('fintech');

    expect(app.getState().selectedCyberScenarioId).toBe('fintech');
  });

  it('rejects unknown scenarios', () => {
    const app = new StudioApplication();
    expect(() => app.selectCyberScenario('unknown')).toThrowError(
      /does not exist/i,
    );
  });

  it('Play loads the selected scenario state', () => {
    const app = new StudioApplication();
    app.selectCyberScenario('fintech');
    app.play();

    const state = app.getState();
    expect(state.cyberSimulationState).not.toBeNull();
    expect(Object.keys(state.cyberSimulationState!.hosts)).toHaveLength(6);
    expect(state.cyberSimulationState?.objective.targetHostId).toBe('core-db');
  });
});
