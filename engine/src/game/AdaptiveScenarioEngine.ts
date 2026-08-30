import {
  Difficulty,
  DIFFICULTY_SETTINGS,
} from './Difficulty.js';
import {
  AdaptiveDifficultyController,
  type AdaptiveDifficultyOptions,
  type AdaptiveDifficultyResult,
} from './AdaptiveDifficultyController.js';
import {
  ScenarioDefinition,
  ScenarioGenerator,
  ScenarioValidator,
  type Scenario,
  type ScenarioGeneratorOptions,
  type ScenarioGeneratorOrganizationSize,
  type ScenarioGeneratorNetworkComplexity,
  type ScenarioGeneratorAttackerProfile,
  type ScenarioGeneratorVulnerabilityLevel,
  type ScenarioGeneratorDefenseLevel,
  type ScenarioGeneratorObjective,
  type ScenarioGeneratorDifficulty,
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

export interface AdaptiveScenarioBaseOptions {
  organizationSize: ScenarioGeneratorOrganizationSize;
  objective: ScenarioGeneratorObjective;
}

export interface AdaptiveScenarioEngineOptions {
  name?: string;
  baseOptions: AdaptiveScenarioBaseOptions;
  adaptiveDifficultyOptions?: AdaptiveDifficultyOptions;
}

export interface AdaptiveScenarioAdjustment {
  sequence: number;
  difficulty: Difficulty;
  scenarioOptions: ScenarioGeneratorOptions;
  reason: string;
  averageNormalizedScore: number;
  sampleCount: number;
}

export interface AdaptiveScenarioEngineSnapshot {
  name: string;
  currentDifficulty: Difficulty;
  scenarioCount: number;
  adjustmentCount: number;
  currentScenarioOptions?: ScenarioGeneratorOptions;
  lastAdjustment?: AdaptiveScenarioAdjustment;
  summary: string;
}

interface DifficultyScenarioConfig {
  generatorDifficulty: ScenarioGeneratorDifficulty;
  networkComplexity: ScenarioGeneratorNetworkComplexity;
  attackerProfile: ScenarioGeneratorAttackerProfile;
  vulnerabilityLevel: ScenarioGeneratorVulnerabilityLevel;
  defenseLevel: ScenarioGeneratorDefenseLevel;
}

function mapDifficultyToScenarioConfig(
  difficulty: Difficulty,
): DifficultyScenarioConfig {
  switch (difficulty) {
    case Difficulty.Easy:
      return {
        generatorDifficulty: 'easy',
        networkComplexity: 'low',
        attackerProfile: 'script-kiddie',
        vulnerabilityLevel: 'low',
        defenseLevel: 'advanced',
      };
    case Difficulty.Normal:
      return {
        generatorDifficulty: 'medium',
        networkComplexity: 'medium',
        attackerProfile: 'insider',
        vulnerabilityLevel: 'medium',
        defenseLevel: 'basic',
      };
    case Difficulty.Hard:
      return {
        generatorDifficulty: 'hard',
        networkComplexity: 'high',
        attackerProfile: 'apt',
        vulnerabilityLevel: 'high',
        defenseLevel: 'basic',
      };
    case Difficulty.Expert:
      return {
        generatorDifficulty: 'hard',
        networkComplexity: 'high',
        attackerProfile: 'apt',
        vulnerabilityLevel: 'high',
        defenseLevel: 'advanced',
      };
    default:
      throw new Error(`Invalid difficulty "${difficulty}".`);
  }
}

const VALID_ORGANIZATION_SIZES: readonly ScenarioGeneratorOrganizationSize[] = [
  'small',
  'medium',
  'large',
];

const VALID_OBJECTIVES: readonly ScenarioGeneratorObjective[] = [
  'data-exfiltration',
  'ransomware',
  'credential-theft',
];

export class AdaptiveScenarioEngine {
  readonly name: string;
  private readonly baseOptions: AdaptiveScenarioBaseOptions;
  private readonly difficultyController: AdaptiveDifficultyController;
  private readonly generator = new ScenarioGenerator();
  private readonly validator = new ScenarioValidator();
  private readonly adjustments: AdaptiveScenarioAdjustment[] = [];
  private scenarioCount = 0;
  private adjustmentCountValue = 0;
  private currentScenarioOptions?: ScenarioGeneratorOptions;
  private nextAdjustmentSequence = 1;

  constructor(options: AdaptiveScenarioEngineOptions) {
    if (!isRecord(options)) {
      throw new Error('AdaptiveScenarioEngine options must be an object.');
    }
    if (options.name !== undefined && options.name.trim() === '') {
      throw new Error('AdaptiveScenarioEngine name cannot be empty if provided.');
    }
    this.validateBaseOptions(options.baseOptions);

    this.name = options.name ?? 'CYRE Adaptive Scenario Engine';
    this.baseOptions = {
      organizationSize: options.baseOptions.organizationSize,
      objective: options.baseOptions.objective,
    };
    this.difficultyController = new AdaptiveDifficultyController(
      options.adaptiveDifficultyOptions,
    );
  }

  getCurrentDifficulty(): Difficulty {
    return this.difficultyController.getCurrentDifficulty();
  }

  getDifficultyController(): AdaptiveDifficultyController {
    return this.difficultyController;
  }

  getBaseOptions(): Readonly<AdaptiveScenarioBaseOptions> {
    return { ...this.baseOptions };
  }

  generateScenario(seed?: number): ScenarioDefinition {
    const difficulty = this.getCurrentDifficulty();
    const scenarioOptions = this.buildScenarioOptionsForDifficulty(difficulty, seed);

    this.currentScenarioOptions = deepClone(scenarioOptions);

    const data = this.generator.generate(scenarioOptions);
    const validation = this.validator.validate(data);
    if (!validation.isValid) {
      throw new Error(
        `Adaptive scenario generation failed: ${validation.errors.join(', ')}`,
      );
    }

    this.scenarioCount += 1;
    return new ScenarioDefinition(data);
  }

  recordResult(
    result: AdaptiveDifficultyResult,
  ): AdaptiveScenarioAdjustment | undefined {
    const previousDifficulty = this.getCurrentDifficulty();
    const newDifficulty = this.difficultyController.recordResult(result);

    if (newDifficulty === previousDifficulty) {
      return undefined;
    }

    const adjustment: AdaptiveScenarioAdjustment = {
      sequence: this.nextAdjustmentSequence,
      difficulty: newDifficulty,
      scenarioOptions: this.buildScenarioOptionsForDifficulty(newDifficulty),
      reason:
        this.difficultyController.getLastAdjustment()?.reason ??
        'Difficulty changed',
      averageNormalizedScore:
        this.difficultyController.getAverageNormalizedScore(),
      sampleCount: this.difficultyController.getSampleCount(),
    };

    this.nextAdjustmentSequence += 1;
    this.adjustmentCountValue += 1;
    this.adjustments.push(deepClone(adjustment));
    this.currentScenarioOptions = deepClone(adjustment.scenarioOptions);

    return deepClone(adjustment);
  }

  applyDifficultyToScenario(
    scenario: ScenarioDefinition,
    difficulty: Difficulty = this.getCurrentDifficulty(),
  ): ScenarioDefinition {
    if (!Object.values(Difficulty).includes(difficulty)) {
      throw new Error(`Invalid difficulty "${difficulty}".`);
    }

    const settings = DIFFICULTY_SETTINGS[difficulty];
    const data = scenario.getData();
    const baseTimeLimitMs = data.timeLimitMs ?? 600000;
    const adjustedTimeLimitMs = Math.max(
      1000,
      Math.round(baseTimeLimitMs * settings.timeMultiplier),
    );

    return new ScenarioDefinition({
      ...data,
      timeLimitMs: adjustedTimeLimitMs,
    } as Scenario);
  }

  getScenarioCount(): number {
    return this.scenarioCount;
  }

  getAdjustmentCount(): number {
    return this.adjustmentCountValue;
  }

  getAdjustments(): AdaptiveScenarioAdjustment[] {
    return this.adjustments.map((adjustment) => deepClone(adjustment));
  }

  getLastAdjustment(): AdaptiveScenarioAdjustment | undefined {
    const adjustment = this.adjustments.at(-1);
    return adjustment !== undefined ? deepClone(adjustment) : undefined;
  }

  getCurrentScenarioOptions(): ScenarioGeneratorOptions | undefined {
    return this.currentScenarioOptions !== undefined
      ? deepClone(this.currentScenarioOptions)
      : undefined;
  }

  reset(): void {
    this.difficultyController.reset();
    this.adjustments.length = 0;
    this.scenarioCount = 0;
    this.adjustmentCountValue = 0;
    this.currentScenarioOptions = undefined;
    this.nextAdjustmentSequence = 1;
  }

  validate(): void {
    assertNonEmpty(this.name, 'AdaptiveScenarioEngine name');
    this.validateBaseOptions(this.baseOptions);
    this.difficultyController.validate();
    for (const adjustment of this.adjustments) {
      if (!Object.values(Difficulty).includes(adjustment.difficulty)) {
        throw new Error(
          `Adaptive scenario adjustment has invalid difficulty "${adjustment.difficulty}".`,
        );
      }
      if (!isRecord(adjustment.scenarioOptions)) {
        throw new Error('Adaptive scenario adjustment scenarioOptions must be an object.');
      }
    }
  }

  createSnapshot(): AdaptiveScenarioEngineSnapshot {
    const currentDifficulty = this.getCurrentDifficulty();
    const currentScenarioOptions = this.getCurrentScenarioOptions();
    const lastAdjustment = this.getLastAdjustment();

    return {
      name: this.name,
      currentDifficulty,
      scenarioCount: this.scenarioCount,
      adjustmentCount: this.adjustmentCountValue,
      currentScenarioOptions,
      lastAdjustment,
      summary: [
        this.name,
        `difficulty=${currentDifficulty}`,
        `scenarios=${this.scenarioCount}`,
        `adjustments=${this.adjustmentCountValue}`,
      ].join(' | '),
    };
  }

  private buildScenarioOptionsForDifficulty(
    difficulty: Difficulty,
    seed?: number,
  ): ScenarioGeneratorOptions {
    const config = mapDifficultyToScenarioConfig(difficulty);
    return {
      organizationSize: this.baseOptions.organizationSize,
      objective: this.baseOptions.objective,
      networkComplexity: config.networkComplexity,
      attackerProfile: config.attackerProfile,
      vulnerabilityLevel: config.vulnerabilityLevel,
      defenseLevel: config.defenseLevel,
      difficulty: config.generatorDifficulty,
      seed: seed ?? Date.now(),
    };
  }

  private validateBaseOptions(options: AdaptiveScenarioBaseOptions): void {
    if (!isRecord(options)) {
      throw new Error('AdaptiveScenarioEngine base options must be an object.');
    }
    if (!VALID_ORGANIZATION_SIZES.includes(options.organizationSize)) {
      throw new Error(
        `Invalid organization size "${options.organizationSize}".`,
      );
    }
    if (!VALID_OBJECTIVES.includes(options.objective)) {
      throw new Error(`Invalid scenario objective "${options.objective}".`);
    }
  }
}
