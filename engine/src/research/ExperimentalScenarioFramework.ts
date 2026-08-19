import type {
  ExperimentArmDefinition,
  ExperimentDefinition,
  ExperimentalAssignment,
  ExperimentalOutcome,
  ExperimentalScenarioRecord,
  ExperimentalScenarioFrameworkSnapshot,
} from './ExperimentalScenarioTypes.js';
import {
  EXPERIMENTAL_ASSIGNMENT_METHODS,
  EXPERIMENTAL_INTERVENTIONS,
  isExperimentalAssignmentMethod,
  isExperimentalIntervention,
} from './ExperimentalScenarioTypes.js';
import {
  ScenarioDefinition,
  ScenarioGenerator,
  ScenarioValidator,
  type Scenario,
  type ScenarioGeneratorOptions,
} from '../scenario/index.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function assertNonEmpty(value: string, label: string): void {
  if (!value || value.trim() === '') {
    throw new Error(`${label} must be a non-empty string.`);
  }
}

function hashString(value: string): number {
  let hash = 2166136261 >>> 0;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash >>> 0;
}

function toPositiveSeed(value: number): number {
  return Math.max(1, Math.floor(value % 1_000_000_000));
}

interface ArmState {
  assignmentCount: number;
}

export class ExperimentalScenarioFramework {
  readonly name: string;
  private readonly experiments = new Map<string, ExperimentDefinition>();
  private readonly assignments = new Map<string, ExperimentalAssignment>();
  private readonly scenarios = new Map<string, ExperimentalScenarioRecord>();
  private readonly outcomes = new Map<string, ExperimentalOutcome>();
  private readonly armState = new Map<string, ArmState>();
  private readonly generator = new ScenarioGenerator();
  private readonly validator = new ScenarioValidator();

  constructor(name = 'CYRE Experimental Scenario Framework') {
    if (!name || name.trim() === '') {
      throw new Error('Experimental scenario framework name is required.');
    }
    this.name = name;
  }

  registerExperiment(definition: ExperimentDefinition): void {
    this.validateExperimentDefinition(definition);

    if (this.experiments.has(definition.id)) {
      throw new Error(`Experiment "${definition.id}" is already registered.`);
    }

    const copied = this.copyExperimentDefinition(definition);
    this.experiments.set(copied.id, copied);

    for (const arm of copied.arms) {
      this.armState.set(`${copied.id}:${arm.id}`, { assignmentCount: 0 });
    }
  }

  unregisterExperiment(id: string): void {
    if (!this.experiments.delete(id)) {
      throw new Error(`Experiment "${id}" does not exist.`);
    }
  }

  hasExperiment(id: string): boolean {
    return this.experiments.has(id);
  }

  getExperiment(id: string): ExperimentDefinition | undefined {
    const experiment = this.experiments.get(id);
    return experiment !== undefined
      ? this.copyExperimentDefinition(experiment)
      : undefined;
  }

  listExperimentIds(): string[] {
    return Array.from(this.experiments.keys()).sort();
  }

  listExperiments(): ExperimentDefinition[] {
    return Array.from(this.experiments.values()).map((definition) =>
      this.copyExperimentDefinition(definition),
    );
  }

  assignParticipant(
    experimentId: string,
    participantId: string,
    options: { seed?: number; assignedAt?: number } = {},
  ): ExperimentalAssignment {
    assertNonEmpty(experimentId, 'Experiment id');
    assertNonEmpty(participantId, 'Participant id');

    const experiment = this.requireExperiment(experimentId);
    if (
      options.seed !== undefined &&
      (!Number.isFinite(options.seed) || options.seed < 0)
    ) {
      throw new Error('Experimental assignment seed must be a non-negative finite number.');
    }
    if (
      options.assignedAt !== undefined &&
      !Number.isFinite(options.assignedAt)
    ) {
      throw new Error('Experimental assignment assignedAt must be a finite number if provided.');
    }

    const key = this.assignmentKey(experimentId, participantId);
    if (this.assignments.has(key)) {
      throw new Error(
        `Participant "${participantId}" is already assigned to experiment "${experimentId}".`,
      );
    }

    const arm = this.selectArm(experiment, participantId);
    const seed = options.seed !== undefined
      ? toPositiveSeed(Math.floor(options.seed))
      : toPositiveSeed(hashString(`${experimentId}:${participantId}`));

    const assignment: ExperimentalAssignment = {
      experimentId,
      participantId,
      armId: arm.id,
      assignmentMethod: experiment.assignmentMethod,
      seed,
      assignedAt: options.assignedAt ?? Date.now(),
    };

    this.assignments.set(key, assignment);
    const armKey = `${experimentId}:${arm.id}`;
    const armState = this.armState.get(armKey) ?? { assignmentCount: 0 };
    armState.assignmentCount += 1;
    this.armState.set(armKey, armState);

    return { ...assignment };
  }

  getAssignment(
    experimentId: string,
    participantId: string,
  ): ExperimentalAssignment | undefined {
    const assignment = this.assignments.get(this.assignmentKey(experimentId, participantId));
    return assignment !== undefined ? { ...assignment } : undefined;
  }

  listAssignments(experimentId: string): ExperimentalAssignment[] {
    this.requireExperiment(experimentId);
    return Array.from(this.assignments.values())
      .filter((assignment) => assignment.experimentId === experimentId)
      .map((assignment) => ({ ...assignment }))
      .sort((a, b) => a.participantId.localeCompare(b.participantId));
  }

  createScenarioForParticipant(
    experimentId: string,
    participantId: string,
  ): ExperimentalScenarioRecord {
    const assignment = this.getAssignment(experimentId, participantId);
    if (!assignment) {
      throw new Error(
        `Participant "${participantId}" is not assigned to experiment "${experimentId}".`,
      );
    }

    const key = this.assignmentKey(experimentId, participantId);
    const existing = this.scenarios.get(key);
    if (existing) {
      return {
        assignment: { ...existing.assignment },
        scenario: existing.scenario,
        generatedAt: existing.generatedAt,
      };
    }

    const experiment = this.requireExperiment(experimentId);
    const arm = experiment.arms.find((entry) => entry.id === assignment.armId);
    if (!arm) {
      throw new Error(`Arm "${assignment.armId}" does not exist in experiment "${experimentId}".`);
    }

    const scenarioOptions: ScenarioGeneratorOptions = {
      ...experiment.baseScenarioOptions,
      ...(arm.scenarioOverrides ?? {}),
      seed: assignment.seed,
    };

    const generatedData = this.generator.generate(scenarioOptions);
    const validation = this.validator.validate(generatedData);
    if (!validation.isValid) {
      throw new Error(
        `Generated experimental scenario failed validation: ${validation.errors.join(', ')}`,
      );
    }

    const scenario = new ScenarioDefinition(generatedData);
    const record: ExperimentalScenarioRecord = {
      assignment: { ...assignment },
      scenario,
      generatedAt: Date.now(),
    };

    this.scenarios.set(key, record);
    return {
      assignment: { ...record.assignment },
      scenario: record.scenario,
      generatedAt: record.generatedAt,
    };
  }

  getScenarioForParticipant(
    experimentId: string,
    participantId: string,
  ): ScenarioDefinition | undefined {
    const record = this.scenarios.get(this.assignmentKey(experimentId, participantId));
    return record?.scenario as ScenarioDefinition | undefined;
  }

  hasScenarioForParticipant(experimentId: string, participantId: string): boolean {
    return this.scenarios.has(this.assignmentKey(experimentId, participantId));
  }

  recordOutcome(outcome: ExperimentalOutcome): void {
    this.validateOutcome(outcome);
    const key = this.assignmentKey(outcome.experimentId, outcome.participantId);

    if (!this.assignments.has(key)) {
      throw new Error(
        `Participant "${outcome.participantId}" is not assigned to experiment "${outcome.experimentId}".`,
      );
    }

    this.outcomes.set(key, deepClone(outcome));
  }

  getOutcome(
    experimentId: string,
    participantId: string,
  ): ExperimentalOutcome | undefined {
    const outcome = this.outcomes.get(this.assignmentKey(experimentId, participantId));
    return outcome !== undefined ? deepClone(outcome) : undefined;
  }

  listOutcomes(experimentId: string): ExperimentalOutcome[] {
    this.requireExperiment(experimentId);
    return Array.from(this.outcomes.values())
      .filter((outcome) => outcome.experimentId === experimentId)
      .map((outcome) => deepClone(outcome))
      .sort((a, b) => a.participantId.localeCompare(b.participantId));
  }

  getArmAssignmentCount(experimentId: string, armId: string): number {
    return this.armState.get(`${experimentId}:${armId}`)?.assignmentCount ?? 0;
  }

  validate(): void {
    if (!this.name || this.name.trim() === '') {
      throw new Error('Experimental scenario framework name is required.');
    }

    for (const experiment of this.experiments.values()) {
      this.validateExperimentDefinition(experiment);
    }

    for (const [key, assignment] of this.assignments.entries()) {
      if (!this.experiments.has(assignment.experimentId)) {
        throw new Error(`Assignment "${key}" references missing experiment.`);
      }
      const experiment = this.requireExperiment(assignment.experimentId);
      if (!experiment.arms.some((arm) => arm.id === assignment.armId)) {
        throw new Error(`Assignment "${key}" references missing arm "${assignment.armId}".`);
      }
    }

    for (const [key, scenario] of this.scenarios.entries()) {
      if (!this.assignments.has(key)) {
        throw new Error(`Scenario record "${key}" references missing assignment.`);
      }
      this.validator.validate((scenario.scenario as ScenarioDefinition).getData());
    }
  }

  createSnapshot(): ExperimentalScenarioFrameworkSnapshot {
    const assignmentCountsByArm: Record<string, number> = {};
    for (const [key, state] of this.armState.entries()) {
      assignmentCountsByArm[key] = state.assignmentCount;
    }

    return {
      name: this.name,
      experimentCount: this.experiments.size,
      armCount: this.armState.size,
      assignmentCount: this.assignments.size,
      scenarioCount: this.scenarios.size,
      outcomeCount: this.outcomes.size,
      experimentIds: this.listExperimentIds(),
      assignmentCountsByArm,
      summary: [
        this.name,
        `${this.experiments.size} experiments`,
        `${this.assignments.size} assignments`,
        `${this.scenarios.size} scenarios`,
        `${this.outcomes.size} outcomes`,
      ].join(' | '),
    };
  }

  private selectArm(
    experiment: ExperimentDefinition,
    participantId: string,
  ): ExperimentArmDefinition {
    if (experiment.arms.length === 0) {
      throw new Error(`Experiment "${experiment.id}" must have at least one arm.`);
    }

    let index: number;
    if (experiment.assignmentMethod === 'round-robin') {
      const existingCount = Array.from(this.assignments.values())
        .filter((assignment) => assignment.experimentId === experiment.id)
        .length;
      index = existingCount % experiment.arms.length;
    } else {
      index = hashString(`${experiment.id}:${participantId}`) % experiment.arms.length;
    }

    return experiment.arms[index];
  }

  private requireExperiment(id: string): ExperimentDefinition {
    const experiment = this.experiments.get(id);
    if (!experiment) {
      throw new Error(`Experiment "${id}" does not exist.`);
    }
    return experiment;
  }

  private assignmentKey(experimentId: string, participantId: string): string {
    return `${experimentId}:${participantId}`;
  }

  private validateExperimentDefinition(definition: ExperimentDefinition): void {
    if (!isRecord(definition)) {
      throw new Error('Experiment definition must be an object.');
    }
    assertNonEmpty(definition.id, 'Experiment id');
    assertNonEmpty(definition.name, 'Experiment name');
    if (!isExperimentalAssignmentMethod(definition.assignmentMethod)) {
      throw new Error(`Invalid assignment method "${definition.assignmentMethod}".`);
    }
    if (!isRecord(definition.baseScenarioOptions)) {
      throw new Error('Experiment base scenario options must be an object.');
    }
    if (!Array.isArray(definition.arms) || definition.arms.length === 0) {
      throw new Error('Experiment must have at least one arm.');
    }

    const armIds = new Set<string>();
    for (const arm of definition.arms) {
      this.validateArmDefinition(arm);
      if (armIds.has(arm.id)) {
        throw new Error(`Duplicate experiment arm id "${arm.id}".`);
      }
      armIds.add(arm.id);
    }

    // Validate options shape without requiring the full generator type
    const requiredKeys: (keyof ScenarioGeneratorOptions)[] = [
      'organizationSize',
      'networkComplexity',
      'attackerProfile',
      'vulnerabilityLevel',
      'defenseLevel',
      'objective',
      'difficulty',
    ];
    for (const key of requiredKeys) {
      if (definition.baseScenarioOptions[key] === undefined) {
        throw new Error(`Experiment base scenario option "${key}" is required.`);
      }
    }
  }

  private validateArmDefinition(arm: ExperimentArmDefinition): void {
    if (!isRecord(arm)) {
      throw new Error('Experiment arm must be an object.');
    }
    assertNonEmpty(arm.id, 'Arm id');
    assertNonEmpty(arm.name, 'Arm name');
    if (
      arm.intervention !== undefined &&
      !isExperimentalIntervention(arm.intervention)
    ) {
      throw new Error(`Invalid experiment arm intervention "${arm.intervention}".`);
    }
    if (arm.scenarioOverrides !== undefined && !isRecord(arm.scenarioOverrides)) {
      throw new Error('Experiment arm scenario overrides must be an object if provided.');
    }
  }

  private validateOutcome(outcome: ExperimentalOutcome): void {
    if (!isRecord(outcome)) {
      throw new Error('Experimental outcome must be an object.');
    }
    assertNonEmpty(outcome.experimentId, 'Outcome experiment id');
    assertNonEmpty(outcome.participantId, 'Outcome participant id');
    assertNonEmpty(outcome.armId, 'Outcome arm id');
    if (typeof outcome.completed !== 'boolean') {
      throw new Error('Experimental outcome completed must be a boolean.');
    }
    if (
      outcome.normalizedScore !== undefined &&
      (!Number.isFinite(outcome.normalizedScore) ||
        outcome.normalizedScore < 0 ||
        outcome.normalizedScore > 1)
    ) {
      throw new Error('Experimental outcome normalizedScore must be between 0 and 1.');
    }
    if (
      outcome.timeMs !== undefined &&
      (!Number.isFinite(outcome.timeMs) || outcome.timeMs < 0)
    ) {
      throw new Error('Experimental outcome timeMs must be a non-negative finite number.');
    }
    if (
      outcome.penalties !== undefined &&
      (!Number.isInteger(outcome.penalties) || outcome.penalties < 0)
    ) {
      throw new Error('Experimental outcome penalties must be a non-negative integer.');
    }
    if (!Number.isFinite(outcome.recordedAt)) {
      throw new Error('Experimental outcome recordedAt must be a finite number.');
    }

    const assignment = this.assignments.get(
      this.assignmentKey(outcome.experimentId, outcome.participantId),
    );
    if (assignment && assignment.armId !== outcome.armId) {
      throw new Error(
        `Outcome arm "${outcome.armId}" does not match assigned arm "${assignment.armId}".`,
      );
    }
  }

  private copyExperimentDefinition(
    definition: ExperimentDefinition,
  ): ExperimentDefinition {
    return {
      id: definition.id,
      name: definition.name,
      description: definition.description,
      assignmentMethod: definition.assignmentMethod,
      baseScenarioOptions: deepClone(definition.baseScenarioOptions),
      arms: definition.arms.map((arm) => ({
        id: arm.id,
        name: arm.name,
        description: arm.description,
        intervention: arm.intervention,
        scenarioOverrides: arm.scenarioOverrides !== undefined
          ? deepClone(arm.scenarioOverrides)
          : undefined,
      })),
    };
  }
}
