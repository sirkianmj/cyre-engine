/**
 * MissionPerformance
 * -------------------
 * Records what a player actually did during a mission and derives scoring
 * metrics from that record. Nothing here is a fixed constant: response time
 * is measured, damage is a function of exposure and containment, accuracy is
 * a function of evidence coverage and whether the analysis was correct, and
 * penalties are the count of actions that failed.
 *
 * The tracker takes an injectable clock so scoring is deterministic under
 * test and under replay.
 */

import type { ScoringMetrics } from './ScoringTypes.js';

/** Injectable time source; defaults to wall-clock time. */
export interface PerformanceClock {
  now(): number;
}

const SYSTEM_CLOCK: PerformanceClock = { now: () => Date.now() };

/** Everything the tracker observed about one playthrough. */
export interface MissionPerformanceRecord {
  /** Clock reading when the mission started. */
  startedAt: number;
  /** Clock reading when the mission was completed, or null if still open. */
  completedAt: number | null;
  /** Total elapsed wall time in milliseconds. */
  elapsedMs: number;
  /** Ids of evidence the player actually reviewed, in review order. */
  evidenceReviewed: string[];
  /** Total evidence available in the scenario. */
  evidenceTotal: number;
  /** How many hypotheses the player formed. */
  hypothesesFormed: number;
  /** Whether the player identified an attack path at all. */
  attackPathIdentified: boolean;
  /** Whether the identified path matched the scenario's real attack path. */
  attackPathCorrect: boolean;
  /** Whether the initial alert was acknowledged. */
  alertAcknowledged: boolean;
  /** Number of containment actions applied. */
  containmentActions: number;
  /** Number of recovery actions applied. */
  recoveryActions: number;
  /** Whether the incident was contained before completion. */
  incidentContained: boolean;
  /** Whether affected services were restored. */
  serviceRestored: boolean;
  /** Number of defender actions attempted that failed or were invalid. */
  failedActions: number;
}

/**
 * Scenario-relative expectations used to normalise behaviour. These describe
 * the shape of a scenario (how much evidence exists, how many containment
 * steps are meaningful, what response time is considered par) — they are not
 * score values, and they do not encode a player's performance.
 */
export interface MissionScoringProfile {
  /** Response time considered par; used to scale the damage term. */
  parResponseTimeMs: number;
  /** Response time beyond which the time term saturates. */
  maxResponseTimeMs: number;
  /** Containment actions expected for a fully contained incident. */
  expectedContainmentActions: number;
  /** Recovery actions expected for a fully restored incident. */
  expectedRecoveryActions: number;
}

export const DEFAULT_MISSION_SCORING_PROFILE: MissionScoringProfile = {
  parResponseTimeMs: 120_000,
  maxResponseTimeMs: 600_000,
  expectedContainmentActions: 2,
  expectedRecoveryActions: 2,
};

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/**
 * A human-readable explanation of how each metric was produced. Exposed so
 * the Studio can show *why* a score changed rather than only the number.
 */
export interface ScoringExplanation {
  metrics: ScoringMetrics;
  evidenceCoverage: number;
  timePressure: number;
  containmentCoverage: number;
  recoveryCoverage: number;
  notes: string[];
}

export class MissionPerformanceTracker {
  private readonly clock: PerformanceClock;
  private startedAt: number | null = null;
  private completedAt: number | null = null;
  private readonly evidenceReviewed: string[] = [];
  private evidenceTotal = 0;
  private hypothesesFormed = 0;
  private attackPathIdentified = false;
  private attackPathCorrect = false;
  private alertAcknowledged = false;
  private containmentActions = 0;
  private recoveryActions = 0;
  private incidentContained = false;
  private serviceRestored = false;
  private failedActions = 0;

  constructor(clock: PerformanceClock = SYSTEM_CLOCK) {
    this.clock = clock;
  }

  /** Declares how much evidence the scenario contains. */
  setEvidenceTotal(total: number): void {
    if (!Number.isInteger(total) || total < 0) {
      throw new Error('Evidence total must be a non-negative integer.');
    }
    this.evidenceTotal = total;
  }

  start(): void {
    if (this.startedAt !== null) {
      throw new Error('Mission performance tracking has already started.');
    }
    this.startedAt = this.clock.now();
  }

  complete(): void {
    if (this.startedAt === null) {
      throw new Error('Mission performance tracking has not started.');
    }
    if (this.completedAt !== null) {
      throw new Error('Mission performance tracking has already completed.');
    }
    this.completedAt = this.clock.now();
  }

  /** Records an evidence review. Repeat reviews do not count twice. */
  reviewEvidence(evidenceId: string): void {
    if (!evidenceId || evidenceId.trim() === '') {
      throw new Error('Evidence id must be a non-empty string.');
    }
    if (this.evidenceReviewed.includes(evidenceId)) return;
    this.evidenceReviewed.push(evidenceId);
  }

  recordHypothesis(): void {
    this.hypothesesFormed += 1;
  }

  recordAttackPath(correct: boolean): void {
    this.attackPathIdentified = true;
    this.attackPathCorrect = correct;
  }

  recordAlertAcknowledged(): void {
    this.alertAcknowledged = true;
  }

  recordContainment(): void {
    this.containmentActions += 1;
    this.incidentContained = true;
  }

  recordRecovery(): void {
    this.recoveryActions += 1;
    this.serviceRestored = true;
  }

  /** Records a defender action that failed or was not applicable. */
  recordFailedAction(): void {
    this.failedActions += 1;
  }

  isStarted(): boolean {
    return this.startedAt !== null;
  }

  isCompleted(): boolean {
    return this.completedAt !== null;
  }

  getElapsedMs(): number {
    if (this.startedAt === null) return 0;
    const end = this.completedAt ?? this.clock.now();
    return Math.max(0, end - this.startedAt);
  }

  getRecord(): MissionPerformanceRecord {
    return {
      startedAt: this.startedAt ?? 0,
      completedAt: this.completedAt,
      elapsedMs: this.getElapsedMs(),
      evidenceReviewed: [...this.evidenceReviewed],
      evidenceTotal: this.evidenceTotal,
      hypothesesFormed: this.hypothesesFormed,
      attackPathIdentified: this.attackPathIdentified,
      attackPathCorrect: this.attackPathCorrect,
      alertAcknowledged: this.alertAcknowledged,
      containmentActions: this.containmentActions,
      recoveryActions: this.recoveryActions,
      incidentContained: this.incidentContained,
      serviceRestored: this.serviceRestored,
      failedActions: this.failedActions,
    };
  }
}

/**
 * Derives scoring metrics from an observed performance record.
 *
 * - `responseTimeMs` is the measured elapsed time, never a constant.
 * - `evidenceQuality` is the fraction of available evidence reviewed.
 * - `accuracy` combines evidence coverage, whether a hypothesis was formed,
 *   and whether the identified attack path matched the scenario.
 * - `damage` scales with how long the incident ran relative to par and is
 *   reduced by containment and recovery actually applied.
 * - `penalties` is the number of failed defender actions.
 */
export function deriveScoringMetrics(
  record: MissionPerformanceRecord,
  profile: MissionScoringProfile = DEFAULT_MISSION_SCORING_PROFILE,
): ScoringMetrics {
  return explainScoring(record, profile).metrics;
}

/** As `deriveScoringMetrics`, but also returns the intermediate terms. */
export function explainScoring(
  record: MissionPerformanceRecord,
  profile: MissionScoringProfile = DEFAULT_MISSION_SCORING_PROFILE,
): ScoringExplanation {
  const notes: string[] = [];

  const evidenceCoverage =
    record.evidenceTotal > 0
      ? clamp01(record.evidenceReviewed.length / record.evidenceTotal)
      : 0;
  if (record.evidenceTotal === 0) {
    notes.push('Scenario declares no evidence, so evidence coverage is 0.');
  }

  // Time pressure: 0 at or before par, 1 at or beyond the maximum.
  const parSpan = Math.max(1, profile.maxResponseTimeMs - profile.parResponseTimeMs);
  const timePressure = clamp01((record.elapsedMs - profile.parResponseTimeMs) / parSpan);

  const containmentCoverage = clamp01(
    record.containmentActions / Math.max(1, profile.expectedContainmentActions),
  );
  const recoveryCoverage = clamp01(
    record.recoveryActions / Math.max(1, profile.expectedRecoveryActions),
  );

  // Accuracy: did the analyst actually reach the right conclusion, and did
  // they look at enough of the evidence to justify it?
  const hypothesisTerm = record.hypothesesFormed > 0 ? 1 : 0;
  const pathTerm = record.attackPathCorrect ? 1 : record.attackPathIdentified ? 0.4 : 0;
  const accuracy = clamp01(0.35 * hypothesisTerm + 0.4 * pathTerm + 0.25 * evidenceCoverage);

  if (!record.attackPathIdentified) notes.push('No attack path identified.');
  else if (!record.attackPathCorrect) notes.push('Attack path identified but did not match the scenario.');

  // Damage: exposure grows with time, containment blunts it, and failing to
  // restore service leaves residual damage.
  const exposure = record.incidentContained
    ? 0.75 * timePressure * (1 - 0.5 * containmentCoverage)
    : 0.75 * Math.max(timePressure, 0.35);
  const residual = 0.25 * (1 - recoveryCoverage);
  const damage = clamp01(exposure + residual);

  if (!record.incidentContained) notes.push('Incident was never contained.');
  if (!record.serviceRestored) notes.push('Affected services were never restored.');

  const metrics: ScoringMetrics = {
    accuracy,
    responseTimeMs: Math.max(0, record.elapsedMs),
    damage,
    evidenceQuality: evidenceCoverage,
    penalties: Math.max(0, Math.trunc(record.failedActions)),
  };

  if (metrics.penalties > 0) {
    notes.push(`${metrics.penalties} failed defender action(s) applied as penalties.`);
  }
  if (!record.alertAcknowledged) notes.push('Initial alert was never acknowledged.');

  return {
    metrics,
    evidenceCoverage,
    timePressure,
    containmentCoverage,
    recoveryCoverage,
    notes,
  };
}
