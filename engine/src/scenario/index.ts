/**
 * CYRE Scenario Module Exports
 * -----------------------------
 * Public API for scenario representation, loading, and registry.
 */

export type {
  Scenario,
  ScenarioAsset,
  ScenarioUser,
  ScenarioAttacker,
  ScenarioDefense,
  ScenarioNetwork,
  ScenarioAttackPath,
  ScenarioEvidence,
  ScenarioObjective,
  ScenarioEvent,
} from './ScenarioTypes.js';
export { Scenario as ScenarioDefinition } from './Scenario.js';
export { ScenarioLoader } from './ScenarioLoader.js';
export { ScenarioRegistry } from './ScenarioRegistry.js';
