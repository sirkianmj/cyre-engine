import { describe, expect, it } from 'vitest';
import { CyberScenarioSimulation } from '../simulation/CyberScenarioSimulation.js';
import { CYBER_SCENARIOS, findCyberScenario } from '../simulation/CyberScenarioCatalog.js';

describe('CyberScenarioSimulation multi-scenario support', () => {
  it('loads multiple scenarios with different hosts', () => {
    const lab = findCyberScenario('lab-basic');
    const fintech = findCyberScenario('fintech');
    const healthcare = findCyberScenario('healthcare');

    expect(lab).toBeDefined();
    expect(fintech).toBeDefined();
    expect(healthcare).toBeDefined();

    const labSim = new CyberScenarioSimulation(lab!);
    labSim.initialize();
    expect(Object.keys(labSim.getState().hosts)).toHaveLength(5);

    const fintechSim = new CyberScenarioSimulation(fintech!);
    fintechSim.initialize();
    expect(Object.keys(fintechSim.getState().hosts)).toHaveLength(6);

    const healthcareSim = new CyberScenarioSimulation(healthcare!);
    healthcareSim.initialize();
    expect(Object.keys(healthcareSim.getState().hosts)).toHaveLength(5);
  });

  it('uses scenario-specific target', () => {
    const fintech = findCyberScenario('fintech')!;
    const sim = new CyberScenarioSimulation(fintech);
    sim.initialize();

    expect(sim.getState().objective.targetHostId).toBe('core-db');
  });

  it('catalog contains three scenarios', () => {
    expect(CYBER_SCENARIOS).toHaveLength(3);
  });
});
