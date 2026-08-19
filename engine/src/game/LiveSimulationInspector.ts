import type { MissionRunner } from './MissionRunner.js';

export interface LiveSimulationEvidenceSummary {
  id: string;
  type: string;
  title: string;
  sourceId?: string;
}

export interface LiveSimulationObjectiveSummary {
  id: string;
  description: string;
  completed: boolean;
}

export interface LiveSimulationSnapshot {
  missionId: string;
  missionName: string;
  missionStatus: string;
  investigationPhase: string;
  evidenceCount: number;
  evidenceIds: string[];
  hypothesisCount: number;
  hypotheses: Array<Record<string, unknown>>;
  alertCount: number;
  alerts: Array<Record<string, unknown>>;
  attackPath: { source: string; target: string } | null;
  containmentActionCount: number;
  recoveryActionCount: number;
  objectives: LiveSimulationObjectiveSummary[];
  scenarioEvidence: LiveSimulationEvidenceSummary[];
  score: number;
}

export class LiveSimulationInspector {
  capture(runner: MissionRunner): LiveSimulationSnapshot {
    if (!runner) {
      throw new Error('Mission runner is required.');
    }

    const scenarioData = runner.scenario.getData();
    const objectives = runner.mission.getObjectives().map((objective) => ({
      id: objective.id,
      description: objective.description,
      completed: objective.isCompleted,
    }));

    const alerts = runner.investigation.getAlerts();
    const hypotheses = runner.investigation.getHypotheses();

    return {
      missionId: runner.scenario.getId(),
      missionName: runner.scenario.getName(),
      missionStatus: String(runner.mission.getStatus()),
      investigationPhase: String(runner.investigation.getPhase()),
      evidenceCount: runner.investigation.getEvidenceIds().length,
      evidenceIds: runner.investigation.getEvidenceIds(),
      hypothesisCount: hypotheses.length,
      hypotheses: hypotheses.map((hypothesis) => hypothesis.toJSON()),
      alertCount: alerts.length,
      alerts: alerts.map((alert) => alert.toJSON()),
      attackPath: runner.investigation.getAttackPath(),
      containmentActionCount: runner.investigation.getContainmentActions().length,
      recoveryActionCount: runner.investigation.getRecoveryActions().length,
      objectives,
      scenarioEvidence: scenarioData.evidence.map((evidence) => ({
        id: evidence.id,
        type: evidence.type,
        title: evidence.title,
        sourceId: evidence.sourceId,
      })),
      score: runner.getScore(),
    };
  }
}
