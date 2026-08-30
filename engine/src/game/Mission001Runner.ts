/**
 * Mission001Runner
 * -----------------
 * Mission-specific playthrough orchestrator for "The Compromised Employee".
 * It wraps the generic MissionRunner and exposes the intended sequence of
 * player actions while collecting investigation telemetry and a final score.
 */

import { MissionRunner } from './MissionRunner.js';
import { createMission001Scenario } from './Mission001.js';
import { MissionStatus } from './MissionStatus.js';
import { ScoreCalculator } from './ScoreCalculator.js';
import type { ScoringMetrics } from './ScoringTypes.js';
import type {
  MissionPerformanceRecord,
  MissionScoringProfile,
  PerformanceClock,
  ScoringExplanation,
} from './MissionPerformance.js';
import type { ScenarioDefinition } from '../scenario/index.js';

export const MISSION_001_CONSTANTS = {
  missionId: 'mission-001',
  compromisedHost: 'employee-pc',
  attackPathSource: 'internet',
  attackPathTarget: 'database',
  expectedHypothesis:
    'Employee credentials were compromised via VPN and used to reach the database.',
} as const;

export interface Mission001Summary {
  missionId: string;
  status: MissionStatus;
  reviewedEvidenceCount: number;
  totalEvidenceCount: number;
  hypothesisFormed: boolean;
  attackPathIdentified: boolean;
  contained: boolean;
  recovered: boolean;
  completed: boolean;
  score: number;
  normalizedScore: number;
}

export class Mission001Runner {
  readonly runner: MissionRunner;
  readonly scenario: ScenarioDefinition;
  private readonly reviewedEvidenceIds = new Set<string>();
  private readonly evidenceIds: string[];
  private hypothesisFormed = false;
  private attackPathIdentified = false;
  private contained = false;
  private recovered = false;
  private completed = false;
  private scoreCalculator = new ScoreCalculator();

  constructor(
    scenario: ScenarioDefinition = createMission001Scenario(),
    options: { clock?: PerformanceClock; scoringProfile?: MissionScoringProfile } = {},
  ) {
    if (scenario.getId() !== MISSION_001_CONSTANTS.missionId) {
      throw new Error(
        `Mission001Runner requires mission "mission-001", received "${scenario.getId()}".`,
      );
    }

    this.scenario = scenario;
    this.runner = new MissionRunner(scenario, options);
    this.evidenceIds = scenario.getData().evidence.map((evidence) => evidence.id);
  }

  start(): void {
    this.runner.start();
  }

  acknowledgeInitialAlert(): void {
    this.runner.acknowledgeAlert();
  }

  reviewEvidence(evidenceId: string): boolean {
    if (!evidenceId || evidenceId.trim() === '') {
      throw new Error('Evidence ID must be a non-empty string.');
    }

    const found = this.evidenceIds.includes(evidenceId);
    if (!found) {
      throw new Error(`Evidence "${evidenceId}" is not part of Mission 001.`);
    }

    this.reviewedEvidenceIds.add(evidenceId);
    this.runner.reviewEvidence(evidenceId);
    return this.runner.investigation.hasEvidence(evidenceId);
  }

  reviewAllEvidence(): void {
    for (const evidenceId of this.evidenceIds) {
      this.reviewEvidence(evidenceId);
    }
  }

  formHypothesis(description = MISSION_001_CONSTANTS.expectedHypothesis): void {
    if (!description || description.trim() === '') {
      throw new Error('Hypothesis description must be a non-empty string.');
    }
    this.runner.formHypothesis(description);
    this.hypothesisFormed = true;
  }

  identifyAttackPath(): void {
    this.runner.identifyAttackPath(
      MISSION_001_CONSTANTS.attackPathSource,
      MISSION_001_CONSTANTS.attackPathTarget,
    );
    this.attackPathIdentified = true;
  }

  containIncident(): void {
    this.runner.containIncident();
    this.contained = true;
  }

  recoverIncident(): void {
    this.runner.recoverIncident();
    this.recovered = true;
  }

  completeMission(metrics?: ScoringMetrics): ScoringMetrics {
    if (this.completed) {
      throw new Error('Mission 001 has already been completed.');
    }

    const resolved = metrics ?? this.getCompletionMetrics();
    this.scoreCalculator.calculate(resolved);
    this.runner.completeMission();
    this.completed = true;
    return { ...resolved };
  }

  getScore(): number {
    return this.scoreCalculator.calculate(this.getCompletionMetrics()).total;
  }

  getNormalizedScore(): number {
    return this.scoreCalculator.calculate(this.getCompletionMetrics()).normalized;
  }

  /** The behaviour record observed for this playthrough. */
  getPerformanceRecord(): MissionPerformanceRecord {
    return this.runner.getPerformanceRecord();
  }

  /** Derived metrics plus the intermediate terms behind them. */
  explainScore(): ScoringExplanation {
    return this.runner.explainScore();
  }

  getStatus(): MissionStatus {
    return this.runner.getMissionStatus();
  }

  getReviewedEvidenceIds(): string[] {
    return Array.from(this.reviewedEvidenceIds).sort();
  }

  getTotalEvidenceCount(): number {
    return this.evidenceIds.length;
  }

  getSummary(): Mission001Summary {
    const scoreResult = this.scoreCalculator.calculate(this.getCompletionMetrics());

    return {
      missionId: this.scenario.getId(),
      status: this.getStatus(),
      reviewedEvidenceCount: this.reviewedEvidenceIds.size,
      totalEvidenceCount: this.evidenceIds.length,
      hypothesisFormed: this.hypothesisFormed,
      attackPathIdentified: this.attackPathIdentified,
      contained: this.contained,
      recovered: this.recovered,
      completed: this.completed,
      score: scoreResult.total,
      normalizedScore: scoreResult.normalized,
    };
  }

  /**
   * Metrics derived from the observed playthrough. If the mission has already
   * been completed the elapsed time is frozen at completion; while it is still
   * open the clock keeps running, so an idle analyst scores worse over time.
   */
  private getCompletionMetrics(): ScoringMetrics {
    return this.runner.getDerivedMetrics();
  }
}
