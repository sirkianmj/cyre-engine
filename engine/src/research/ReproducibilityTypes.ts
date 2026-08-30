import type { ScenarioGeneratorOptions } from '../scenario/index.js';
import type { ExperimentalAssignmentMethod } from './ExperimentalScenarioTypes.js';

export const REPRODUCIBILITY_SCHEMA_VERSION = '1.0.0';
export const CYRE_ENGINE_VERSION = '1.0.0';

export interface ReproducibilityManifestInput {
  experimentId: string;
  participantId: string;
  armId: string;
  assignmentMethod: ExperimentalAssignmentMethod;
  seed: number;
  scenarioOptions: ScenarioGeneratorOptions;
  scenarioId: string;
  scenarioName: string;
  generatedAt?: number;
  engineVersion?: string;
  schemaVersion?: string;
  metadata?: Record<string, unknown>;
}

export interface ReproducibilityManifest {
  id: string;
  experimentId: string;
  participantId: string;
  armId: string;
  assignmentMethod: ExperimentalAssignmentMethod;
  seed: number;
  scenarioOptions: ScenarioGeneratorOptions;
  scenarioId: string;
  scenarioName: string;
  scenarioDataJson: string;
  checksum: string;
  generatedAt: number;
  engineVersion: string;
  schemaVersion: string;
  metadata?: Record<string, unknown>;
}

export interface ReproducibilityVerificationResult {
  identical: boolean;
  manifestId: string;
  scenarioId: string;
  expectedChecksum: string;
  actualChecksum: string;
  replayedScenarioName?: string;
  errors: string[];
}

export interface ReproducibilityManagerSnapshot {
  name: string;
  manifestCount: number;
  manifestIds: string[];
  verificationCount: number;
  summary: string;
}
