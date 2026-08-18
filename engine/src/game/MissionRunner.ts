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
import { DefensiveAction } from '../cyber/index.js';

export class MissionRunner {
  readonly scenario: ScenarioDefinition;
  readonly mission: Mission;
  readonly investigation: InvestigationState;
  readonly evidenceCollection: EvidenceCollection;
  private scoreCalculator: ScoreCalculator;

  constructor(scenario: ScenarioDefinition) {
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

  start(): void {
    this.mission.start();
    this.investigation.startInvestigation();
  }

  acknowledgeAlert(): void {
    const alert = this.investigation.getAlerts()[0];
    if (alert) {
      this.investigation.acknowledgeAlert(alert.id);
    }
  }

  formHypothesis(description: string): void {
    const hypothesis = new Hypothesis(`hyp-${Date.now()}`, description, {
      linkedEvidenceIds: this.investigation.getEvidenceIds(),
    });
    this.investigation.addHypothesis(hypothesis);
  }

  identifyAttackPath(source: string, target: string): void {
    this.investigation.identifyAttackPath(source, target);
  }

  containIncident(): void {
    this.investigation.applyContainment(DefensiveAction.Isolate, 'employee-pc');
    this.investigation.applyContainment(DefensiveAction.Block, 'database');
  }

  recoverIncident(): void {
    this.investigation.applyRecovery(DefensiveAction.Recover, 'employee-pc');
    this.investigation.applyRecovery(DefensiveAction.Recover, 'database');
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

    const metrics: ScoringMetrics = {
      accuracy: 1,
      responseTimeMs: 5000,
      damage: 0.2,
      evidenceQuality: 1,
      penalties: 0,
    };

    return metrics;
  }

  getScore(): number {
    // Compute score based on current state
    const metrics: ScoringMetrics = {
      accuracy: 0.9,
      responseTimeMs: 5000,
      damage: 0.1,
      evidenceQuality: 0.9,
      penalties: 0,
    };
    return this.scoreCalculator.calculate(metrics).total;
  }

  getMissionStatus(): MissionStatus {
    return this.mission.getStatus();
  }
}
