/**
 * WebApplication
 * ---------------
 * Manages mission runners and exposes data for the web server.
 * Acts as the backend for the CYRE web release.
 */

import { MissionFactory } from '../game/index.js';
import { MissionRunner } from '../game/index.js';
import type { ScoringMetrics } from '../game/index.js';

export class WebApplication {
  private runners: Map<string, MissionRunner> = new Map();

  getAvailableMissions(): string[] {
    return MissionFactory.list();
  }

  getMissionInfo(missionId: string): Record<string, unknown> {
    if (!MissionFactory.has(missionId)) {
      throw new Error(`Mission "${missionId}" not found.`);
    }
    const scenario = MissionFactory.create(missionId);
    return {
      id: scenario.getId(),
      name: scenario.getName(),
      description: scenario.getData().description,
      objectives: scenario.getData().objectives,
      evidenceCount: scenario.getData().evidence.length,
      timeLimitMs: scenario.getData().timeLimitMs,
    };
  }

  startMission(missionId: string): Record<string, unknown> {
    if (!MissionFactory.has(missionId)) {
      throw new Error(`Mission "${missionId}" not found.`);
    }
    const scenario = MissionFactory.create(missionId);
    const runner = new MissionRunner(scenario);
    runner.start();
    this.runners.set(missionId, runner);
    return {
      missionId,
      status: runner.getMissionStatus(),
      objectives: scenario.getData().objectives,
      evidenceCount: scenario.getData().evidence.length,
    };
  }

  getMissionState(missionId: string): Record<string, unknown> {
    const runner = this.runners.get(missionId);
    if (!runner) {
      throw new Error(`Mission "${missionId}" is not started.`);
    }
    return {
      missionId,
      status: runner.getMissionStatus(),
      phase: runner.investigation.getPhase(),
      evidenceIds: runner.investigation.getEvidenceIds(),
      hypotheses: runner.investigation.getHypotheses().map((h) => h.toJSON()),
      attackPath: runner.investigation.getAttackPath(),
    };
  }

  completeMission(missionId: string, metrics: ScoringMetrics): Record<string, unknown> {
    const runner = this.runners.get(missionId);
    if (!runner) {
      throw new Error(`Mission "${missionId}" is not started.`);
    }
    runner.completeMission();
    const score = runner.getScore();
    return {
      missionId,
      status: runner.getMissionStatus(),
      score,
      metrics,
    };
  }
}
