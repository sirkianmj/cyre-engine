import { describe, it, expect } from 'vitest';
import {
  MISSION_001_CONSTANTS,
  Mission001Runner,
} from '../Mission001Runner.js';
import { createMission001Scenario } from '../Mission001.js';
import { MissionStatus } from '../MissionStatus.js';

function playFullMission(): Mission001Runner {
  const runner = new Mission001Runner(createMission001Scenario());
  runner.start();
  runner.acknowledgeInitialAlert();
  runner.reviewAllEvidence();
  runner.formHypothesis();
  runner.identifyAttackPath();
  runner.containIncident();
  runner.recoverIncident();
  return runner;
}

describe('Mission001Runner', () => {
  it('rejects a non-mission-001 scenario', () => {
    const scenario = createMission001Scenario();
    Object.defineProperty(scenario, 'data', {
      value: { ...scenario.getData(), id: 'other-mission' },
    });

    expect(() => new Mission001Runner(scenario)).toThrow(/mission "mission-001"/);
  });

  it('starts Mission 001', () => {
    const runner = new Mission001Runner();
    runner.start();
    expect(runner.getStatus()).toBe(MissionStatus.Active);
  });

  it('reviews evidence by id', () => {
    const runner = new Mission001Runner();
    expect(runner.reviewEvidence('ev-001')).toBe(true);
    expect(runner.getReviewedEvidenceIds()).toContain('ev-001');
    expect(() => runner.reviewEvidence('missing')).toThrow(/not part of Mission 001/);
  });

  it('performs a full intended playthrough', () => {
    const runner = playFullMission();

    expect(runner.getStatus()).toBe(MissionStatus.Active);
    expect(runner.getReviewedEvidenceIds()).toHaveLength(4);
    expect(runner.getTotalEvidenceCount()).toBe(4);

    const metrics = runner.completeMission();
    expect(metrics.accuracy).toBe(1);
    expect(runner.getStatus()).toBe(MissionStatus.Completed);
    expect(runner.getSummary().completed).toBe(true);
    expect(runner.getSummary().score).toBeGreaterThan(0);
  });

  it('calculates score based on investigation progress', () => {
    const completeRunner = playFullMission();
    completeRunner.completeMission();
    const fullScore = completeRunner.getScore();

    const partialRunner = new Mission001Runner();
    partialRunner.start();
    partialRunner.completeMission({
      accuracy: 0.5,
      responseTimeMs: 120000,
      damage: 0.4,
      evidenceQuality: 0.25,
      penalties: 1,
    });

    expect(fullScore).toBeGreaterThan(partialRunner.getScore());
  });

  it('produces a summary for an incomplete mission', () => {
    const runner = new Mission001Runner();
    runner.start();

    const summary = runner.getSummary();
    expect(summary.missionId).toBe(MISSION_001_CONSTANTS.missionId);
    expect(summary.status).toBe(MissionStatus.Active);
    expect(summary.completed).toBe(false);
    expect(summary.reviewedEvidenceCount).toBe(0);
    expect(summary.hypothesisFormed).toBe(false);
  });

  it('throws when completing twice', () => {
    const runner = playFullMission();
    runner.completeMission();
    expect(() => runner.completeMission()).toThrow(/already been completed/);
  });

  it('exposes mission constants', () => {
    expect(MISSION_001_CONSTANTS.missionId).toBe('mission-001');
    expect(MISSION_001_CONSTANTS.compromisedHost).toBe('employee-pc');
    expect(MISSION_001_CONSTANTS.attackPathSource).toBe('internet');
    expect(MISSION_001_CONSTANTS.attackPathTarget).toBe('database');
  });
});
