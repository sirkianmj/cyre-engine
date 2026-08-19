import { ExperimentalScenarioFramework } from './ExperimentalScenarioFramework.js';
import type {
  ExperimentalAssignment,
  ExperimentalOutcome,
  ExperimentDefinition,
} from './ExperimentalScenarioTypes.js';
import {
  ReproducibilityManager,
} from './ReproducibilityManager.js';
import type {
  ReproducibilityManifest,
} from './ReproducibilityTypes.js';
import type {
  ExperimentOutcomeResolver,
  ExperimentOutcomeResolverInput,
  ExperimentParticipantResult,
  ExperimentRunBatchResult,
  ExperimentRunContext,
  ExperimentRunParticipantInput,
  ExperimentRunnerSnapshot,
} from './ExperimentRunnerTypes.js';
import {
  CYRE_ENGINE_VERSION,
  REPRODUCIBILITY_SCHEMA_VERSION,
} from './ReproducibilityTypes.js';
import type { ScenarioDefinition } from '../scenario/index.js';

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

export class ExperimentRunner {
  readonly name: string;
  readonly experimentId: string;
  private readonly framework: ExperimentalScenarioFramework;
  private readonly reproducibility: ReproducibilityManager;
  private runCountValue = 0;
  private completedCountValue = 0;

  constructor(
    experiment: ExperimentDefinition,
    options: {
      name?: string;
      framework?: ExperimentalScenarioFramework;
      reproducibility?: ReproducibilityManager;
    } = {},
  ) {
    if (!isRecord(experiment)) {
      throw new Error('Experiment definition must be an object.');
    }
    assertNonEmpty(experiment.id, 'Experiment id');

    if (options.name !== undefined && options.name.trim() === '') {
      throw new Error('ExperimentRunner name cannot be empty if provided.');
    }

    this.name = options.name ?? `Experiment Runner: ${experiment.name}`;
    this.experimentId = experiment.id;
    this.framework = options.framework ?? new ExperimentalScenarioFramework();
    this.reproducibility = options.reproducibility ?? new ReproducibilityManager();

    if (!this.framework.hasExperiment(experiment.id)) {
      this.framework.registerExperiment(experiment);
    }
  }

  getFramework(): ExperimentalScenarioFramework {
    return this.framework;
  }

  getReproducibilityManager(): ReproducibilityManager {
    return this.reproducibility;
  }

  getRunCount(): number {
    return this.runCountValue;
  }

  getCompletedCount(): number {
    return this.completedCountValue;
  }

  async runParticipant(
    input: ExperimentRunParticipantInput,
    resolver: ExperimentOutcomeResolver,
  ): Promise<ExperimentParticipantResult> {
    this.validateParticipantInput(input);

    const assignment = this.framework.assignParticipant(
      this.experimentId,
      input.participantId,
      input.seed !== undefined ? { seed: input.seed } : {},
    );

    const scenarioRecord = this.framework.createScenarioForParticipant(
      this.experimentId,
      input.participantId,
    );
    const scenario = this.framework.getScenarioForParticipant(
      this.experimentId,
      input.participantId,
    );

    if (!scenario) {
      throw new Error(
        `Scenario for participant "${input.participantId}" was not found after creation.`,
      );
    }

    const arm = this.resolveArm(scenario, assignment);
    const manifest = this.createManifestForParticipant(
      assignment,
      scenario,
      arm,
    );

    const context: ExperimentRunContext = {
      experimentId: this.experimentId,
      participantId: input.participantId,
      armId: assignment.armId,
      seed: assignment.seed,
      assignment,
      scenario,
    };

    const resolved = await this.resolveOutcome(resolver, context);
    const outcome: ExperimentalOutcome = {
      ...resolved,
      experimentId: this.experimentId,
      participantId: input.participantId,
      armId: assignment.armId,
      recordedAt: Date.now(),
    };
    this.framework.recordOutcome(outcome);

    const reproducibility = this.reproducibility.verifyManifestDirect(
      manifest,
      scenario.getData(),
    );

    this.runCountValue += 1;
    if (outcome.completed) {
      this.completedCountValue += 1;
    }

    return {
      experimentId: this.experimentId,
      participantId: input.participantId,
      armId: assignment.armId,
      seed: assignment.seed,
      assignment,
      scenario,
      manifest,
      outcome,
      reproducibility,
    };
  }

  async runBatch(
    participants: ExperimentRunParticipantInput[],
    resolver: ExperimentOutcomeResolver,
  ): Promise<ExperimentRunBatchResult> {
    if (!Array.isArray(participants)) {
      throw new Error('Experiment run batch participants must be an array.');
    }

    const results: ExperimentParticipantResult[] = [];
    for (const participant of participants) {
      results.push(await this.runParticipant(participant, resolver));
    }

    return {
      experimentId: this.experimentId,
      runCount: results.length,
      completedCount: results.filter((result) => result.outcome.completed).length,
      results,
    };
  }

  validate(): void {
    if (!this.name || this.name.trim() === '') {
      throw new Error('ExperimentRunner name is required.');
    }
    if (!this.framework.hasExperiment(this.experimentId)) {
      throw new Error(`Experiment "${this.experimentId}" is not registered.`);
    }
    this.framework.validate();
    this.reproducibility.validate();
  }

  createSnapshot(): ExperimentRunnerSnapshot {
    const frameworkSnapshot = this.framework.createSnapshot();
    const reproducibilitySnapshot = this.reproducibility.createSnapshot();

    return {
      name: this.name,
      experimentId: this.experimentId,
      runCount: this.runCountValue,
      completedCount: this.completedCountValue,
      assignmentCount: frameworkSnapshot.assignmentCount,
      scenarioCount: frameworkSnapshot.scenarioCount,
      outcomeCount: frameworkSnapshot.outcomeCount,
      manifestCount: reproducibilitySnapshot.manifestCount,
      reproducibilityVerificationCount:
        reproducibilitySnapshot.verificationCount,
      summary: [
        this.name,
        `experiment=${this.experimentId}`,
        `runs=${this.runCountValue}`,
        `completed=${this.completedCountValue}`,
        `scenarios=${frameworkSnapshot.scenarioCount}`,
        `outcomes=${frameworkSnapshot.outcomeCount}`,
        `manifests=${reproducibilitySnapshot.manifestCount}`,
      ].join(' | '),
    };
  }

  private resolveArm(
    _scenario: ScenarioDefinition,
    assignment: ExperimentalAssignment,
  ): ExperimentDefinition['arms'][number] {
    const experiment = this.framework.getExperiment(this.experimentId);
    if (!experiment) {
      throw new Error(`Experiment "${this.experimentId}" does not exist.`);
    }
    const arm = experiment.arms.find((entry) => entry.id === assignment.armId);
    if (!arm) {
      throw new Error(`Arm "${assignment.armId}" does not exist.`);
    }
    return arm;
  }

  private createManifestForParticipant(
    assignment: ExperimentalAssignment,
    scenario: ScenarioDefinition,
    arm: ExperimentDefinition['arms'][number],
  ): ReproducibilityManifest {
    const experiment = this.framework.getExperiment(this.experimentId);
    if (!experiment) {
      throw new Error(`Experiment "${this.experimentId}" does not exist.`);
    }

    const scenarioOptions = {
      ...experiment.baseScenarioOptions,
      ...(arm.scenarioOverrides ?? {}),
    };

    return this.reproducibility.createManifest(
      {
        experimentId: this.experimentId,
        participantId: assignment.participantId,
        armId: assignment.armId,
        assignmentMethod: assignment.assignmentMethod,
        seed: assignment.seed,
        scenarioOptions,
        scenarioId: scenario.getId(),
        scenarioName: scenario.getName(),
        generatedAt: Date.now(),
        engineVersion: CYRE_ENGINE_VERSION,
        schemaVersion: REPRODUCIBILITY_SCHEMA_VERSION,
      },
      scenario.getData(),
    );
  }

  private async resolveOutcome(
    resolver: ExperimentOutcomeResolver,
    context: ExperimentRunContext,
  ): Promise<ExperimentOutcomeResolverInput> {
    if (typeof resolver === 'function') {
      const result = await resolver(context);
      this.validateResolvedOutcome(result);
      return deepClone(result);
    }

    this.validateResolvedOutcome(resolver);
    return deepClone(resolver);
  }

  private validateResolvedOutcome(
    outcome: ExperimentOutcomeResolverInput,
  ): void {
    if (!isRecord(outcome)) {
      throw new Error('Experiment outcome resolver result must be an object.');
    }
    if (typeof outcome.completed !== 'boolean') {
      throw new Error('Experiment outcome resolver completed must be a boolean.');
    }
    if (
      outcome.normalizedScore !== undefined &&
      (!Number.isFinite(outcome.normalizedScore) ||
        outcome.normalizedScore < 0 ||
        outcome.normalizedScore > 1)
    ) {
      throw new Error('Experiment outcome resolver normalizedScore must be between 0 and 1.');
    }
    if (
      outcome.timeMs !== undefined &&
      (!Number.isFinite(outcome.timeMs) || outcome.timeMs < 0)
    ) {
      throw new Error('Experiment outcome resolver timeMs must be a non-negative finite number.');
    }
    if (
      outcome.penalties !== undefined &&
      (!Number.isInteger(outcome.penalties) || outcome.penalties < 0)
    ) {
      throw new Error('Experiment outcome resolver penalties must be a non-negative integer.');
    }
  }

  private validateParticipantInput(input: ExperimentRunParticipantInput): void {
    if (!isRecord(input)) {
      throw new Error('Experiment run participant input must be an object.');
    }
    assertNonEmpty(input.participantId, 'Participant id');
    if (
      input.seed !== undefined &&
      (!Number.isFinite(input.seed) || input.seed < 0)
    ) {
      throw new Error('Experiment run participant seed must be a non-negative finite number.');
    }
  }
}
