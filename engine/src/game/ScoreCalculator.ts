import {
  ScoringMetrics,
  ScoringWeights,
  DEFAULT_SCORING_WEIGHTS,
  ScoreResult,
  ScoreComponent,
} from './ScoringTypes.js';

export class ScoreCalculator {
  private weights: ScoringWeights;
  private maxTotal: number;

  constructor(weights: Partial<ScoringWeights> = {}) {
    this.weights = { ...DEFAULT_SCORING_WEIGHTS, ...weights };
    this.validateWeights();
    // The maximum achievable score is the sum of all positive weights
    // (penalty weight is only used to compute penalty deductions)
    this.maxTotal =
      this.weights.accuracy +
      this.weights.responseTime +
      this.weights.damage +
      this.weights.evidenceQuality;
  }

  /**
   * Calculate a mission score from metrics.
   * Each metric is normalized to 0-1, weighted, and summed.
   * Penalties subtract from the total.
   */
  calculate(metrics: ScoringMetrics): ScoreResult {
    this.validateMetrics(metrics);

    // Normalize response time to a score (0-1)
    // Example: 0ms -> 1, 600000ms (10 minutes) -> 0
    const maxResponseTime = 600000;
    const responseScore = Math.max(0, 1 - metrics.responseTimeMs / maxResponseTime);

    const components: ScoreComponent[] = [
      {
        name: 'accuracy',
        raw: metrics.accuracy,
        weighted: metrics.accuracy * this.weights.accuracy,
        max: this.weights.accuracy,
      },
      {
        name: 'responseTime',
        raw: responseScore,
        weighted: responseScore * this.weights.responseTime,
        max: this.weights.responseTime,
      },
      {
        name: 'damage',
        raw: 1 - metrics.damage,
        weighted: (1 - metrics.damage) * this.weights.damage,
        max: this.weights.damage,
      },
      {
        name: 'evidenceQuality',
        raw: metrics.evidenceQuality,
        weighted: metrics.evidenceQuality * this.weights.evidenceQuality,
        max: this.weights.evidenceQuality,
      },
    ];

    const baseTotal = components.reduce((sum, comp) => sum + comp.weighted, 0);
    const penaltyAmount = Math.min(
      metrics.penalties * this.weights.penalty,
      baseTotal, // cannot go below 0
    );

    const total = Math.max(0, baseTotal - penaltyAmount);

    return {
      total,
      maxTotal: this.maxTotal,
      normalized: this.maxTotal > 0 ? total / this.maxTotal : 0,
      components,
      penaltiesApplied: penaltyAmount,
    };
  }

  getWeights(): Readonly<ScoringWeights> {
    return { ...this.weights };
  }

  getMaxTotal(): number {
    return this.maxTotal;
  }

  private validateWeights(): void {
    const sum = Object.values(this.weights).reduce((acc, val) => acc + val, 0);
    if (Math.abs(sum - 1) > 0.0001) {
      throw new Error(`Scoring weights must sum to 1, got ${sum}.`);
    }
    for (const [name, value] of Object.entries(this.weights)) {
      if (typeof value !== 'number' || value < 0 || value > 1) {
        throw new Error(`Invalid weight for "${name}": must be between 0 and 1.`);
      }
    }
  }

  private validateMetrics(metrics: ScoringMetrics): void {
    if (metrics.accuracy < 0 || metrics.accuracy > 1) {
      throw new Error('Accuracy must be between 0 and 1.');
    }
    if (typeof metrics.responseTimeMs !== 'number' || metrics.responseTimeMs < 0) {
      throw new Error('Response time must be a non-negative number.');
    }
    if (metrics.damage < 0 || metrics.damage > 1) {
      throw new Error('Damage must be between 0 and 1.');
    }
    if (metrics.evidenceQuality < 0 || metrics.evidenceQuality > 1) {
      throw new Error('Evidence quality must be between 0 and 1.');
    }
    if (!Number.isInteger(metrics.penalties) || metrics.penalties < 0) {
      throw new Error('Penalties must be a non-negative integer.');
    }
  }
}
