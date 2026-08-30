import type {
  ExperimentalAssignment,
  ExperimentalOutcome,
} from './ExperimentalScenarioTypes.js';
import type {
  ReproducibilityManifest,
  ReproducibilityVerificationResult,
} from './ReproducibilityTypes.js';
import type { ScenarioDefinition } from '../scenario/index.js';

export interface ExperimentRunContext {
  experimentId: string;
  participantId: string;
  armId: string;
  seed: number;
  assignment: ExperimentalAssignment;
  scenario: ScenarioDefinition;
}

export type ExperimentOutcomeResolverInput = Omit<
  ExperimentalOutcome,
  'experimentId' | 'participantId' | 'armId' | 'recordedAt'
>;

export type ExperimentOutcomeResolver =
  | ExperimentOutcomeResolverInput
  | ((
      context: ExperimentRunContext,
    ) => ExperimentOutcomeResolverInput | Promise<ExperimentOutcomeResolverInput>);

export interface ExperimentRunParticipantInput {
  participantId: string;
  seed?: number;
}

export interface ExperimentParticipantResult {
  experimentId: string;
  participantId: string;
  armId: string;
  seed: number;
  assignment: ExperimentalAssignment;
  scenario: ScenarioDefinition;
  manifest: ReproducibilityManifest;
  outcome: ExperimentalOutcome;
  reproducibility: ReproducibilityVerificationResult;
}

export interface ExperimentRunBatchResult {
  experimentId: string;
  runCount: number;
  completedCount: number;
  results: ExperimentParticipantResult[];
}

export interface ExperimentRunnerSnapshot {
  name: string;
  experimentId: string;
  runCount: number;
  completedCount: number;
  assignmentCount: number;
  scenarioCount: number;
  outcomeCount: number;
  manifestCount: number;
  reproducibilityVerificationCount: number;
  summary: string;
}
