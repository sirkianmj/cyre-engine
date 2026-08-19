/**
 * CYRE Research Module Exports
 * ------------------------------
 * Public API for research dataset management, experimental scenarios,
 * and reproducibility.
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

export {
  REPRODUCIBILITY_SCHEMA_VERSION,
} from './ReproducibilityTypes.js';
export type {
  ReproducibilityManifestInput,
  ReproducibilityManifest,
  ReproducibilityVerificationResult,
  ReproducibilityManagerSnapshot,
} from './ReproducibilityTypes.js';
export {
  computeReproducibilityChecksum,
  stableStringify,
} from './ReproducibilityUtils.js';
export { ReproducibilityManager } from './ReproducibilityManager.js';
