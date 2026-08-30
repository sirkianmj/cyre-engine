import { SecuritySandboxPolicy } from './SecuritySandboxPolicy.js';
import { CyberScenarioSimulation } from '../cyber/simulation/index.js';
import { deserializeCyberScenarioDefinition } from '../cyber/index.js';

export interface SandboxExecutionResult {
  success: boolean;
  state?: unknown;
  error?: string;
  escaped: boolean;
}

export class CyberScenarioSandbox {
  static execute(json: string): SandboxExecutionResult {
    try {
      const scenario = deserializeCyberScenarioDefinition(json);
      SecuritySandboxPolicy.assertSecureScenario(scenario);

      const sim = new CyberScenarioSimulation(scenario);
      sim.initialize();
      return {
        success: true,
        state: sim.getState(),
        escaped: false,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        escaped: false,
      };
    }
  }
}
