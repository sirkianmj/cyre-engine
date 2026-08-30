export interface ScoringMetrics {
  /** Accuracy of the investigation, 0 to 1 */
  accuracy: number;
  /** Response time in milliseconds */
  responseTimeMs: number;
  /** Damage caused by the incident, 0 to 1 (0 = no damage, 1 = catastrophic) */
  damage: number;
  /** Quality of evidence collected, 0 to 1 */
  evidenceQuality: number;
  /** Number of penalties incurred (e.g., false positives, mistakes) */
  penalties: number;
}

export interface ScoringWeights {
  accuracy: number;
  responseTime: number;
  damage: number;
  evidenceQuality: number;
  penalty: number;
}

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  accuracy: 0.3,
  responseTime: 0.2,
  damage: 0.25,
  evidenceQuality: 0.2,
  penalty: 0.05,
};

export interface ScoreComponent {
  name: string;
  raw: number;
  weighted: number;
  max: number;
}

export interface ScoreResult {
  total: number;
  maxTotal: number;
  normalized: number; // 0-1
  components: ScoreComponent[];
  penaltiesApplied: number;
}
