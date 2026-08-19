import { CyreScript } from './CyreScript.js';
import { CyreScriptRegistry } from './CyreScriptRegistry.js';
import { MissionRunner } from './MissionRunner.js';
import { ScenarioDefinition } from '../scenario/index.js';

export class CyreScriptEngine {
  private readonly registry: CyreScriptRegistry;

  constructor(registry: CyreScriptRegistry) {
    this.registry = registry;
  }

  getScript(id: string): CyreScript | undefined {
    return this.registry.get(id);
  }

  buildScenario(scriptOrId: CyreScript | string): ScenarioDefinition {
    const script = this.resolveScript(scriptOrId);
    return script.toScenarioDefinition();
  }

  createMissionRunner(scriptOrId: CyreScript | string): MissionRunner {
    const scenario = this.buildScenario(scriptOrId);
    return new MissionRunner(scenario);
  }

  validate(): void {
    this.registry.validate();
  }

  private resolveScript(scriptOrId: CyreScript | string): CyreScript {
    if (typeof scriptOrId === 'string') {
      const script = this.registry.get(scriptOrId);
      if (script === undefined) {
        throw new Error(`CyreScript "${scriptOrId}" is not registered.`);
      }
      return script;
    }

    scriptOrId.validate();
    return scriptOrId;
  }
}
