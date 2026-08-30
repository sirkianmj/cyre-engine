import {
  Difficulty,
  DIFFICULTY_SETTINGS,
  type DifficultySettings,
} from './Difficulty.js';

export interface AdaptiveDifficultyOptions {
  initialDifficulty?: Difficulty;
  enabled?: boolean;
  minSamplesBeforeAdjustment?: number;
  lookbackWindow?: number;
  promotionThreshold?: number;
  demotionThreshold?: number;
}

export interface AdaptiveDifficultyResult {
  normalizedScore: number;
  timeMs?: number;
  penalties?: number;
  completed?: boolean;
}

export interface AdaptiveDifficultyAdjustment {
  from: Difficulty;
  to: Difficulty;
  reason: string;
  averageNormalizedScore: number;
  sampleCount: number;
}

export interface AdaptiveDifficultySnapshot {
  currentDifficulty: Difficulty;
  settings: DifficultySettings;
  enabled: boolean;
  sampleCount: number;
  recentScores: number[];
  averageNormalizedScore: number;
  lastAdjustment?: AdaptiveDifficultyAdjustment;
  summary: string;
}

const DIFFICULTY_ORDER: Difficulty[] = [
  Difficulty.Easy,
  Difficulty.Normal,
  Difficulty.Hard,
  Difficulty.Expert,
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export class AdaptiveDifficultyController {
  private currentDifficulty: Difficulty;
  private readonly enabledValue: boolean;
  private readonly minSamplesBeforeAdjustment: number;
  private readonly lookbackWindow: number;
  private readonly promotionThreshold: number;
  private readonly demotionThreshold: number;
  private readonly initialDifficulty: Difficulty;
  private readonly recentScores: number[] = [];
  private lastAdjustment?: AdaptiveDifficultyAdjustment;

  constructor(options: AdaptiveDifficultyOptions = {}) {
    const initialDifficulty = options.initialDifficulty ?? Difficulty.Normal;
    if (!DIFFICULTY_ORDER.includes(initialDifficulty)) {
      throw new Error(`Invalid initial difficulty "${initialDifficulty}".`);
    }
    if (options.enabled !== undefined && typeof options.enabled !== 'boolean') {
      throw new Error('Adaptive difficulty enabled must be a boolean if provided.');
    }
    const minSamples = options.minSamplesBeforeAdjustment ?? 3;
    if (!Number.isInteger(minSamples) || minSamples < 1) {
      throw new Error('Minimum samples before adjustment must be a positive integer.');
    }
    const window = options.lookbackWindow ?? 5;
    if (!Number.isInteger(window) || window < 1) {
      throw new Error('Lookback window must be a positive integer.');
    }
    const promotionThreshold = options.promotionThreshold ?? 0.8;
    const demotionThreshold = options.demotionThreshold ?? 0.4;
    if (
      !Number.isFinite(promotionThreshold) ||
      !Number.isFinite(demotionThreshold) ||
      promotionThreshold <= demotionThreshold ||
      promotionThreshold < 0 ||
      promotionThreshold > 1 ||
      demotionThreshold < 0 ||
      demotionThreshold > 1
    ) {
      throw new Error(
        'Adaptive difficulty thresholds must satisfy 0 <= demotion < promotion <= 1.',
      );
    }

    this.initialDifficulty = initialDifficulty;
    this.currentDifficulty = initialDifficulty;
    this.enabledValue = options.enabled ?? true;
    this.minSamplesBeforeAdjustment = minSamples;
    this.lookbackWindow = window;
    this.promotionThreshold = promotionThreshold;
    this.demotionThreshold = demotionThreshold;
  }

  getCurrentDifficulty(): Difficulty {
    return this.currentDifficulty;
  }

  getSettings(): DifficultySettings {
    return { ...DIFFICULTY_SETTINGS[this.currentDifficulty] };
  }

  isEnabled(): boolean {
    return this.enabledValue;
  }

  setDifficulty(difficulty: Difficulty): void {
    if (!DIFFICULTY_ORDER.includes(difficulty)) {
      throw new Error(`Invalid difficulty "${difficulty}".`);
    }
    if (difficulty === this.currentDifficulty) {
      return;
    }
    this.lastAdjustment = {
      from: this.currentDifficulty,
      to: difficulty,
      reason: 'Manual difficulty change',
      averageNormalizedScore: this.getAverageNormalizedScore(),
      sampleCount: this.recentScores.length,
    };
    this.currentDifficulty = difficulty;
  }

  recordResult(result: AdaptiveDifficultyResult): Difficulty {
    this.validateResult(result);
    if (!this.enabledValue) {
      return this.currentDifficulty;
    }

    this.recentScores.push(result.normalizedScore);
    if (this.recentScores.length > this.lookbackWindow) {
      this.recentScores.shift();
    }

    if (this.recentScores.length < this.minSamplesBeforeAdjustment) {
      return this.currentDifficulty;
    }

    const average = this.getAverageNormalizedScore();

    if (average >= this.promotionThreshold && this.currentDifficulty !== Difficulty.Expert) {
      this.promote(average);
    } else if (
      average <= this.demotionThreshold &&
      this.currentDifficulty !== Difficulty.Easy
    ) {
      this.demote(average);
    }

    return this.currentDifficulty;
  }

  getRecentScores(): number[] {
    return [...this.recentScores];
  }

  getSampleCount(): number {
    return this.recentScores.length;
  }

  getAverageNormalizedScore(): number {
    if (this.recentScores.length === 0) return 0;
    const sum = this.recentScores.reduce((total, score) => total + score, 0);
    return sum / this.recentScores.length;
  }

  getLastAdjustment(): AdaptiveDifficultyAdjustment | undefined {
    return this.lastAdjustment !== undefined
      ? deepClone(this.lastAdjustment)
      : undefined;
  }

  reset(): void {
    this.currentDifficulty = this.initialDifficulty;
    this.recentScores.length = 0;
    this.lastAdjustment = undefined;
  }

  validate(): void {
    if (!DIFFICULTY_ORDER.includes(this.currentDifficulty)) {
      throw new Error(`Invalid current difficulty "${this.currentDifficulty}".`);
    }
    if (!DIFFICULTY_ORDER.includes(this.initialDifficulty)) {
      throw new Error(`Invalid initial difficulty "${this.initialDifficulty}".`);
    }
    if (!Number.isInteger(this.minSamplesBeforeAdjustment) || this.minSamplesBeforeAdjustment < 1) {
      throw new Error('Minimum samples before adjustment must be a positive integer.');
    }
    if (!Number.isInteger(this.lookbackWindow) || this.lookbackWindow < 1) {
      throw new Error('Lookback window must be a positive integer.');
    }
    if (this.promotionThreshold <= this.demotionThreshold) {
      throw new Error('Promotion threshold must be greater than demotion threshold.');
    }
  }

  createSnapshot(): AdaptiveDifficultySnapshot {
    const average = this.getAverageNormalizedScore();
    const settings = this.getSettings();

    return {
      currentDifficulty: this.currentDifficulty,
      settings,
      enabled: this.enabledValue,
      sampleCount: this.recentScores.length,
      recentScores: [...this.recentScores],
      averageNormalizedScore: average,
      lastAdjustment: this.getLastAdjustment(),
      summary: [
        `difficulty=${this.currentDifficulty}`,
        this.enabledValue ? 'adaptive-enabled' : 'adaptive-disabled',
        `samples=${this.recentScores.length}`,
        `average=${average.toFixed(2)}`,
      ].join(' | '),
    };
  }

  private validateResult(result: AdaptiveDifficultyResult): void {
    if (!isRecord(result)) {
      throw new Error('Adaptive difficulty result must be an object.');
    }
    if (
      typeof result.normalizedScore !== 'number' ||
      !Number.isFinite(result.normalizedScore) ||
      result.normalizedScore < 0 ||
      result.normalizedScore > 1
    ) {
      throw new Error('Adaptive difficulty normalizedScore must be between 0 and 1.');
    }
    if (result.timeMs !== undefined && (!Number.isFinite(result.timeMs) || result.timeMs < 0)) {
      throw new Error('Adaptive difficulty timeMs must be a non-negative finite number if provided.');
    }
    if (
      result.penalties !== undefined &&
      (!Number.isInteger(result.penalties) || result.penalties < 0)
    ) {
      throw new Error('Adaptive difficulty penalties must be a non-negative integer if provided.');
    }
    if (result.completed !== undefined && typeof result.completed !== 'boolean') {
      throw new Error('Adaptive difficulty completed must be a boolean if provided.');
    }
  }

  private promote(average: number): void {
    const from = this.currentDifficulty;
    const nextIndex = DIFFICULTY_ORDER.indexOf(from) + 1;
    const to = DIFFICULTY_ORDER[nextIndex];
    if (!to) return;

    this.lastAdjustment = {
      from,
      to,
      reason: 'Performance exceeded promotion threshold',
      averageNormalizedScore: average,
      sampleCount: this.recentScores.length,
    };
    this.currentDifficulty = to;
  }

  private demote(average: number): void {
    const from = this.currentDifficulty;
    const previousIndex = DIFFICULTY_ORDER.indexOf(from) - 1;
    const to = DIFFICULTY_ORDER[previousIndex];
    if (!to) return;

    this.lastAdjustment = {
      from,
      to,
      reason: 'Performance fell below demotion threshold',
      averageNormalizedScore: average,
      sampleCount: this.recentScores.length,
    };
    this.currentDifficulty = to;
  }
}
