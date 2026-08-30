import type { ScenarioGeneratorOptions } from '../scenario/index.js';

export const EXPERIMENTAL_ASSIGNMENT_METHODS = [
  'deterministic-hash',
  'round-robin',
] as const;

export type ExperimentalAssignmentMethod =
  (typeof EXPERIMENTAL_ASSIGNMENT_METHODS)[number];

export function isExperimentalAssignmentMethod(
  value: string,
): value is ExperimentalAssignmentMethod {
  return (EXPERIMENTAL_ASSIGNMENT_METHODS as readonly string[]).includes(value);
}

export const EXPERIMENTAL_INTERVENTIONS = [
  'none',
  'additional-evidence',
  'reduced-ambiguity',
  'increased-time',
  'reduced-time',
] as const;

export type ExperimentalIntervention =
  (typeof EXPERIMENTAL_INTERVENTIONS)[number];

export function isExperimentalIntervention(
  value: string,
): value is ExperimentalIntervention {
  return (EXPERIMENTAL_INTERVENTIONS as readonly string[]).includes(value);
}

export interface ExperimentArmDefinition {
  id: string;
  name: string;
  description?: string;
  intervention?: ExperimentalIntervention;
  scenarioOverrides?: Partial<ScenarioGeneratorOptions>;
}

export interface ExperimentDefinition {
  id: string;
  name: string;
  description?: string;
  assignmentMethod: ExperimentalAssignmentMethod;
  baseScenarioOptions: ScenarioGeneratorOptions;
  arms: ExperimentArmDefinition[];
}

export interface ExperimentalAssignment {
  experimentId: string;
  participantId: string;
  armId: string;
  assignmentMethod: ExperimentalAssignmentMethod;
  seed: number;
  assignedAt: number;
}

export interface ExperimentalOutcome {
  experimentId: string;
  participantId: string;
  armId: string;
  completed: boolean;
  normalizedScore?: number;
  timeMs?: number;
  penalties?: number;
  recordedAt: number;
}

export interface ExperimentalScenarioRecord {
  assignment: ExperimentalAssignment;
  scenario: unknown;
  generatedAt: number;
}

export interface ExperimentalScenarioFrameworkSnapshot {
  name: string;
  experimentCount: number;
  armCount: number;
  assignmentCount: number;
  scenarioCount: number;
  outcomeCount: number;
  experimentIds: string[];
  assignmentCountsByArm: Record<string, number>;
  summary: string;
}
