import type {
  ReproducibilityManifest,
  ReproducibilityManifestInput,
  ReproducibilityManagerSnapshot,
  ReproducibilityVerificationResult,
} from './ReproducibilityTypes.js';
import {
  CYRE_ENGINE_VERSION,
  REPRODUCIBILITY_SCHEMA_VERSION,
} from './ReproducibilityTypes.js';
import {
  assertNonEmptyString,
  assertNonNegativeInteger,
  computeReproducibilityChecksum,
  deepClone,
  stableStringify,
  validateAssignmentMethod,
} from './ReproducibilityUtils.js';
import type { ExperimentalAssignmentMethod } from './ExperimentalScenarioTypes.js';
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

export class ReproducibilityManager {
  readonly name: string;
  private readonly manifests = new Map<string, ReproducibilityManifest>();
  private readonly generator = new ScenarioGenerator();
  private readonly validator = new ScenarioValidator();
  private verificationCountValue = 0;

  constructor(name = 'CYRE Reproducibility Manager') {
    if (!name || name.trim() === '') {
      throw new Error('Reproducibility manager name is required.');
    }
    this.name = name;
  }

  createManifest(
    input: ReproducibilityManifestInput,
    scenarioData: Scenario,
  ): ReproducibilityManifest {
    this.validateManifestInput(input);
    this.validateScenarioDataForInput(input, scenarioData);

    const scenarioDataJson = stableStringify(scenarioData);
    const checksum = computeReproducibilityChecksum(scenarioDataJson);
    const generatedAt = input.generatedAt ?? Date.now();
    const engineVersion = input.engineVersion ?? CYRE_ENGINE_VERSION;
    const schemaVersion = input.schemaVersion ?? REPRODUCIBILITY_SCHEMA_VERSION;

    const manifest: ReproducibilityManifest = {
      id: this.createManifestId(input.experimentId, input.participantId),
      experimentId: input.experimentId,
      participantId: input.participantId,
      armId: input.armId,
      assignmentMethod: input.assignmentMethod,
      seed: input.seed,
      scenarioOptions: deepClone(input.scenarioOptions),
      scenarioId: input.scenarioId,
      scenarioName: input.scenarioName,
      scenarioDataJson,
      checksum,
      generatedAt,
      engineVersion,
      schemaVersion,
      metadata: input.metadata !== undefined ? deepClone(input.metadata) : undefined,
    };

    this.manifests.set(manifest.id, deepClone(manifest));
    return deepClone(manifest);
  }

  hasManifest(id: string): boolean {
    return this.manifests.has(id);
  }

  getManifest(id: string): ReproducibilityManifest | undefined {
    const manifest = this.manifests.get(id);
    return manifest !== undefined ? deepClone(manifest) : undefined;
  }

  listManifests(): ReproducibilityManifest[] {
    return Array.from(this.manifests.values()).map((manifest) => deepClone(manifest));
  }

  listManifestIds(): string[] {
    return Array.from(this.manifests.keys()).sort();
  }

  replayScenario(manifest: ReproducibilityManifest): ScenarioDefinition {
    this.validateManifest(manifest);

    const scenarioOptions: ScenarioGeneratorOptions = {
      ...manifest.scenarioOptions,
      seed: manifest.seed,
    };
    const generatedData = this.generator.generate(scenarioOptions);

    const validation = this.validator.validate(generatedData);
    if (!validation.isValid) {
      throw new Error(
        `Reproducibility replay scenario failed validation: ${validation.errors.join(', ')}`,
      );
    }

    return new ScenarioDefinition(generatedData);
  }

  verifyManifest(
    manifest: ReproducibilityManifest,
  ): ReproducibilityVerificationResult {
    this.validateManifest(manifest);

    const replayedScenario = this.replayScenario(manifest);
    const replayedJson = stableStringify(replayedScenario.getData());
    const actualChecksum = computeReproducibilityChecksum(replayedJson);
    const errors: string[] = [];

    if (actualChecksum !== manifest.checksum) {
      errors.push(
        `Checksum mismatch: expected ${manifest.checksum}, got ${actualChecksum}.`,
      );
    }

    const replayedName = replayedScenario.getName();
    if (replayedName !== manifest.scenarioName) {
      errors.push(
        `Scenario name mismatch: expected ${manifest.scenarioName}, got ${replayedName}.`,
      );
    }

    if (replayedScenario.getId() !== manifest.scenarioId) {
      errors.push(
        `Scenario id mismatch: expected ${manifest.scenarioId}, got ${replayedScenario.getId()}.`,
      );
    }

    this.verificationCountValue += 1;
    return {
      identical: errors.length === 0,
      manifestId: manifest.id,
      scenarioId: manifest.scenarioId,
      expectedChecksum: manifest.checksum,
      actualChecksum,
      replayedScenarioName: replayedName,
      errors,
    };
  }

  verifyManifestDirect(
    manifest: ReproducibilityManifest,
    scenarioData: Scenario,
  ): ReproducibilityVerificationResult {
    this.validateManifest(manifest);

    const actualJson = stableStringify(scenarioData);
    const actualChecksum = computeReproducibilityChecksum(actualJson);
    const errors: string[] = [];

    if (actualChecksum !== manifest.checksum) {
      errors.push(
        `Checksum mismatch: expected ${manifest.checksum}, got ${actualChecksum}.`,
      );
    }

    if (scenarioData.id !== manifest.scenarioId) {
      errors.push(
        `Scenario id mismatch: expected ${manifest.scenarioId}, got ${scenarioData.id}.`,
      );
    }

    if (scenarioData.name !== manifest.scenarioName) {
      errors.push(
        `Scenario name mismatch: expected ${manifest.scenarioName}, got ${scenarioData.name}.`,
      );
    }

    this.verificationCountValue += 1;
    return {
      identical: errors.length === 0,
      manifestId: manifest.id,
      scenarioId: manifest.scenarioId,
      expectedChecksum: manifest.checksum,
      actualChecksum,
      replayedScenarioName: scenarioData.name,
      errors,
    };
  }

  getVerificationCount(): number {
    return this.verificationCountValue;
  }

  validate(): void {
    if (!this.name || this.name.trim() === '') {
      throw new Error('Reproducibility manager name is required.');
    }
    for (const manifest of this.manifests.values()) {
      this.validateManifest(manifest);
    }
  }

  createSnapshot(): ReproducibilityManagerSnapshot {
    const manifestIds = this.listManifestIds();
    return {
      name: this.name,
      manifestCount: this.manifests.size,
      manifestIds,
      verificationCount: this.verificationCountValue,
      summary: [
        this.name,
        `${this.manifests.size} manifests`,
        `${this.verificationCountValue} verifications`,
      ].join(' | '),
    };
  }

  private validateManifestInput(input: ReproducibilityManifestInput): void {
    if (!isRecord(input)) {
      throw new Error('Reproducibility manifest input must be an object.');
    }
    assertNonEmptyString(input.experimentId, 'Manifest experiment id');
    assertNonEmptyString(input.participantId, 'Manifest participant id');
    assertNonEmptyString(input.armId, 'Manifest arm id');
    validateAssignmentMethod(input.assignmentMethod);
    assertNonNegativeInteger(input.seed, 'Manifest seed');
    assertNonEmptyString(input.scenarioId, 'Manifest scenario id');
    assertNonEmptyString(input.scenarioName, 'Manifest scenario name');
    if (!isRecord(input.scenarioOptions)) {
      throw new Error('Manifest scenario options must be an object.');
    }
    if (
      input.generatedAt !== undefined &&
      !Number.isFinite(input.generatedAt)
    ) {
      throw new Error('Manifest generatedAt must be a finite number if provided.');
    }
    if (input.engineVersion !== undefined && typeof input.engineVersion !== 'string') {
      throw new Error('Manifest engineVersion must be a string if provided.');
    }
    if (input.schemaVersion !== undefined && typeof input.schemaVersion !== 'string') {
      throw new Error('Manifest schemaVersion must be a string if provided.');
    }
    if (input.metadata !== undefined && !isRecord(input.metadata)) {
      throw new Error('Manifest metadata must be an object if provided.');
    }
  }

  private validateScenarioDataForInput(
    input: ReproducibilityManifestInput,
    scenarioData: Scenario,
  ): void {
    if (!isRecord(scenarioData)) {
      throw new Error('Reproducibility scenario data must be an object.');
    }
    if (scenarioData.id !== input.scenarioId) {
      throw new Error(
        `Scenario id mismatch: expected ${input.scenarioId}, got ${scenarioData.id}.`,
      );
    }
    if (scenarioData.name !== input.scenarioName) {
      throw new Error(
        `Scenario name mismatch: expected ${input.scenarioName}, got ${scenarioData.name}.`,
      );
    }

    const validation = this.validator.validate(scenarioData);
    if (!validation.isValid) {
      throw new Error(
        `Reproducibility scenario data failed validation: ${validation.errors.join(', ')}`,
      );
    }
  }

  private validateManifest(manifest: ReproducibilityManifest): void {
    if (!isRecord(manifest)) {
      throw new Error('Reproducibility manifest must be an object.');
    }
    assertNonEmptyString(manifest.id, 'Manifest id');
    assertNonEmptyString(manifest.experimentId, 'Manifest experiment id');
    assertNonEmptyString(manifest.participantId, 'Manifest participant id');
    assertNonEmptyString(manifest.armId, 'Manifest arm id');
    validateAssignmentMethod(manifest.assignmentMethod);
    assertNonNegativeInteger(manifest.seed, 'Manifest seed');
    assertNonEmptyString(manifest.scenarioId, 'Manifest scenario id');
    assertNonEmptyString(manifest.scenarioName, 'Manifest scenario name');
    if (!isRecord(manifest.scenarioOptions)) {
      throw new Error('Manifest scenario options must be an object.');
    }
    if (typeof manifest.scenarioDataJson !== 'string' || manifest.scenarioDataJson.length === 0) {
      throw new Error('Manifest scenarioDataJson must be a non-empty string.');
    }
    if (typeof manifest.checksum !== 'string' || manifest.checksum.length === 0) {
      throw new Error('Manifest checksum must be a non-empty string.');
    }
    if (!Number.isFinite(manifest.generatedAt)) {
      throw new Error('Manifest generatedAt must be a finite number.');
    }
    if (typeof manifest.engineVersion !== 'string' || manifest.engineVersion.length === 0) {
      throw new Error('Manifest engineVersion must be a non-empty string.');
    }
    if (typeof manifest.schemaVersion !== 'string' || manifest.schemaVersion.length === 0) {
      throw new Error('Manifest schemaVersion must be a non-empty string.');
    }
    if (manifest.metadata !== undefined && !isRecord(manifest.metadata)) {
      throw new Error('Manifest metadata must be an object if provided.');
    }
  }

  private createManifestId(experimentId: string, participantId: string): string {
    return computeReproducibilityChecksum(`${experimentId}:${participantId}`);
  }
}
