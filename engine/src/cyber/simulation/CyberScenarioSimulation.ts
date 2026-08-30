import { Simulation } from '../../simulation/index.js';
import type { CyberScenarioDefinition } from './CyberScenarioDefinition.js';
import { createStateFromScenario } from './CyberScenarioDefinition.js';
import type { CyberSimulationState } from './CyberSimulationTypes.js';

function cloneState(state: Record<string, unknown>): CyberSimulationState {
  return JSON.parse(JSON.stringify(state)) as CyberSimulationState;
}

export class CyberScenarioSimulation {
  private simulation: Simulation;

  constructor(private readonly scenario: CyberScenarioDefinition) {
    this.simulation = new Simulation({
      id: scenario.id,
      name: scenario.name,
      seed: scenario.seed,
    });
  }

  initialize(): void {
    this.simulation.initialize();
    this.simulation.executeAction({
      id: 'scenario-state',
      type: 'initialize',
      execute: () => ({
        patch: createStateFromScenario(this.scenario) as unknown as Record<string, unknown>,
      }),
    });
  }

  getState(): CyberSimulationState {
    return cloneState(this.simulation.getState());
  }

  getScenarioId(): string {
    return this.scenario.id;
  }
}
