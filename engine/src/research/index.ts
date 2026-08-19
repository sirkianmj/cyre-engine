/**
 * CYRE Research Module Exports
 * ------------------------------
 * Public API for research dataset management.
 */

export type {
  ExperimentMetadata,
  ResearchSession,
  ResearchDatasetExport,
} from './ResearchTypes.js';
export { ResearchDataset } from './ResearchDataset.js';

export {
  EXPERIMENTAL_ASSIGNMENT_METHODS,
  EXPERIMENTAL_INTERVENTIONS,
  isExperimentalAssignmentMethod,
  isExperimentalIntervention,
} from './ExperimentalScenarioTypes.js';
export type {
  ExperimentalAssignmentMethod,
  ExperimentalIntervention,
  ExperimentArmDefinition,
  ExperimentDefinition,
  ExperimentalAssignment,
  ExperimentalOutcome,
  ExperimentalScenarioRecord,
  ExperimentalScenarioFrameworkSnapshot,
} from './ExperimentalScenarioTypes.js';
export { ExperimentalScenarioFramework } from './ExperimentalScenarioFramework.js';
