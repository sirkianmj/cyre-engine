/**
 * MissionRunner
 * --------------
 * Runs a mission scenario by integrating InvestigationState,
 * Mission, and ScoreCalculator. It provides a step-by-step API
 * to simulate player decisions.
 */

import { ScenarioDefinition } from '../scenario/index.js';
import { InvestigationState } from './InvestigationState.js';
import { Mission } from './Mission.js';
import { MissionStatus } from './MissionStatus.js';
import { createObjective } from './Objective.js';
import { Alert } from './Alert.js';
import { Hypothesis } from './Hypothesis.js';
import { EvidenceCollection } from './EvidenceCollection.js';
import { createEvidence } from './Evidence.js';
import { EvidenceType } from './EvidenceType.js';
import { ScoreCalculator } from './ScoreCalculator.js';
import type { ScoringMetrics } from './ScoringTypes.js';
import {
  MissionPerformanceTracker,
  deriveScoringMetrics,
  explainScoring,
} from './MissionPerformance.js';
import type {
  MissionPerformanceRecord,
  MissionScoringProfile,
  PerformanceClock,
  ScoringExplanation,
} from './MissionPerformance.js';
import { DEFAULT_MISSION_SCORING_PROFILE } from './MissionPerformance.js';
import { DefensiveAction } from '../cyber/index.js';

export class MissionRunner {
  readonly scenario: ScenarioDefinition;
  readonly mission: Mission;
  readonly investigation: InvestigationState;
  readonly evidenceCollection: EvidenceCollection;
  private scoreCalculator: ScoreCalculator;
  private readonly performance: MissionPerformanceTracker;
  private readonly scoringProfile: MissionScoringProfile;

  constructor(
    scenario: ScenarioDefinition,
    options: { clock?: PerformanceClock; scoringProfile?: MissionScoringProfile } = {},
  ) {
    this.scenario = scenario;
    const data = scenario.getData();

    // Build mission objectives from scenario objectives
    const objectives = data.objectives.map((obj) =>
      createObjective(obj.id, obj.description, { type: obj.type }),
    );
    this.mission = new Mission(`mission-${data.id}`, {
      name: data.name,
      description: data.description,
      objectives,
      timeLimitMs: data.timeLimitMs,
    });

    this.investigation = new InvestigationState();
    this.evidenceCollection = new EvidenceCollection();
    this.performance = new MissionPerformanceTracker(options.clock);
    this.performance.setEvidenceTotal(data.evidence.length);
    this.scoringProfile = options.scoringProfile ?? DEFAULT_MISSION_SCORING_PROFILE;

    // Add evidence from scenario
    for (const ev of data.evidence) {
      this.evidenceCollection.add(
        createEvidence(
          ev.id,
          ev.type as EvidenceType,
          ev.title,
          ev.description,
          {
            sourceId: ev.sourceId,
            timestamp: ev.timestamp,
            data: ev.data,
          },
        ),
      );
      this.investigation.addEvidence(ev.id);
    }

    // Add initial alert
    const firstTimelineEvent = data.timeline[0];
    if (firstTimelineEvent) {
      const alert = new Alert(
        `alert-${firstTimelineEvent.id}`,
        'Anomalous authentication events detected',
        `Multiple anomalous authentication events detected at ${new Date(firstTimelineEvent.timestamp).toISOString()}.`,
        { severity: 'high', timestamp: firstTimelineEvent.timestamp, sourceId: firstTimelineEvent.sourceId },
      );
      this.investigation.addAlert(alert);
    }

    this.scoreCalculator = new ScoreCalculator();
  }

  /** Records evidence the player actually reviewed. */
  reviewEvidence(evidenceId: string): void {
    this.performance.reviewEvidence(evidenceId);
  }

  start(): void {
    if (!this.performance.isStarted()) {
      this.performance.start();
    }
    this.mission.start();
    this.investigation.startInvestigation();
  }

  acknowledgeAlert(): void {
    const alert = this.investigation.getAlerts()[0];
    if (alert) {
      this.investigation.acknowledgeAlert(alert.id);
      this.performance.recordAlertAcknowledged();
    }
  }

  formHypothesis(description: string): void {
    const hypothesis = new Hypothesis(`hyp-${Date.now()}`, description, {
      linkedEvidenceIds: this.investigation.getEvidenceIds(),
    });
    this.investigation.addHypothesis(hypothesis);
    this.performance.recordHypothesis();
  }

  identifyAttackPath(source: string, target: string): void {
    this.investigation.identifyAttackPath(source, target);
    const declared = this.scenario.getData().attackPath;
    const correct = declared.source === source && declared.target === target;
    this.performance.recordAttackPath(correct);
  }

  containIncident(): void {
    this.investigation.applyContainment(DefensiveAction.Isolate, 'employee-pc');
    this.investigation.applyContainment(DefensiveAction.Block, 'database');
    this.performance.recordContainment();
    this.performance.recordContainment();
  }

  recoverIncident(): void {
    this.investigation.applyRecovery(DefensiveAction.Recover, 'employee-pc');
    this.investigation.applyRecovery(DefensiveAction.Recover, 'database');
    this.performance.recordRecovery();
    this.performance.recordRecovery();
  }

  /** Records a defender action that failed or was not applicable. */
  recordFailedAction(): void {
    this.performance.recordFailedAction();
  }

  completeMission(): ScoringMetrics {
    this.investigation.completeInvestigation();

    // Complete all objectives if mission is still active
    if (
      this.mission.getStatus() !== MissionStatus.Completed &&
      this.mission.getStatus() !== MissionStatus.Failed
    ) {
      for (const objective of this.mission.getObjectives()) {
        if (!objective.isCompleted) {
          this.mission.completeObjective(objective.id);
        }
      }
    }

    return this.getDerivedMetrics();
  }

  /** The behaviour record this runner has observed so far. */
  getPerformanceRecord(): MissionPerformanceRecord {
    return this.performance.getRecord();
  }

  /**
   * Metrics derived from what the player actually did. Response time is
   * measured, accuracy follows evidence coverage and analysis correctness,
   * damage follows exposure and containment, penalties are failed actions.
   */
  getDerivedMetrics(): ScoringMetrics {
    return deriveScoringMetrics(this.performance.getRecord(), this.scoringProfile);
  }

  /** Derived metrics plus the intermediate terms, for explaining a score. */
  explainScore(): ScoringExplanation {
    return explainScoring(this.performance.getRecord(), this.scoringProfile);
  }

  getScore(): number {
    return this.scoreCalculator.calculate(this.getDerivedMetrics()).total;
  }

  getMissionStatus(): MissionStatus {
    return this.mission.getStatus();
  }
}
