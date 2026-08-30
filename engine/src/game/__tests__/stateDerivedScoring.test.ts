import { describe, expect, it } from 'vitest';

import {
  DEFAULT_MISSION_SCORING_PROFILE,
  MissionPerformanceTracker,
  deriveScoringMetrics,
  explainScoring,
} from '../MissionPerformance.js';
import { Mission001Runner } from '../Mission001Runner.js';
import { MissionRunner } from '../MissionRunner.js';
import { createMission001Scenario } from '../Mission001.js';
import { ScoreCalculator } from '../ScoreCalculator.js';

import type { PerformanceClock } from '../MissionPerformance.js';

/** A clock the test advances explicitly, so timing is deterministic. */
function fakeClock(start = 0): PerformanceClock & { advance(ms: number): void } {
  let now = start;
  return {
    now: () => now,
    advance: (ms: number) => {
      now += ms;
    },
  };
}

describe('MissionPerformanceTracker', () => {
  it('measures elapsed time from the injected clock', () => {
    const clock = fakeClock(1_000);
    const tracker = new MissionPerformanceTracker(clock);

    tracker.start();
    clock.advance(45_000);

    expect(tracker.getElapsedMs()).toBe(45_000);

    clock.advance(15_000);
    tracker.complete();

    // Frozen at completion: further clock movement does not extend it.
    clock.advance(60_000);
    expect(tracker.getElapsedMs()).toBe(60_000);
    expect(tracker.getRecord().completedAt).toBe(61_000);
  });

  it('does not double-count repeated evidence reviews', () => {
    const tracker = new MissionPerformanceTracker(fakeClock());
    tracker.setEvidenceTotal(4);

    tracker.reviewEvidence('ev-001');
    tracker.reviewEvidence('ev-001');
    tracker.reviewEvidence('ev-002');

    expect(tracker.getRecord().evidenceReviewed).toEqual(['ev-001', 'ev-002']);
  });

  it('rejects an empty evidence id and a negative total', () => {
    const tracker = new MissionPerformanceTracker(fakeClock());
    expect(() => tracker.reviewEvidence('  ')).toThrow(/non-empty string/);
    expect(() => tracker.setEvidenceTotal(-1)).toThrow(/non-negative integer/);
  });

  it('refuses to start twice or complete before starting', () => {
    const tracker = new MissionPerformanceTracker(fakeClock());
    expect(() => tracker.complete()).toThrow(/has not started/);

    tracker.start();
    expect(() => tracker.start()).toThrow(/already started/);

    tracker.complete();
    expect(() => tracker.complete()).toThrow(/already completed/);
  });
});

describe('deriveScoringMetrics', () => {
  const profile = DEFAULT_MISSION_SCORING_PROFILE;

  function record(overrides: Record<string, unknown> = {}) {
    const tracker = new MissionPerformanceTracker(fakeClock());
    tracker.setEvidenceTotal(4);
    tracker.start();
    return { ...tracker.getRecord(), ...overrides };
  }

  it('scores a thorough, fast, contained response highest', () => {
    const best = deriveScoringMetrics(
      record({
        elapsedMs: 30_000,
        evidenceReviewed: ['a', 'b', 'c', 'd'],
        evidenceTotal: 4,
        hypothesesFormed: 1,
        attackPathIdentified: true,
        attackPathCorrect: true,
        alertAcknowledged: true,
        containmentActions: 2,
        recoveryActions: 2,
        incidentContained: true,
        serviceRestored: true,
        failedActions: 0,
      }),
      profile,
    );

    expect(best.accuracy).toBe(1);
    expect(best.evidenceQuality).toBe(1);
    expect(best.damage).toBe(0);
    expect(best.responseTimeMs).toBe(30_000);
    expect(best.penalties).toBe(0);
  });

  it('reduces accuracy when the attack path is wrong', () => {
    const base = {
      elapsedMs: 30_000,
      evidenceReviewed: ['a', 'b', 'c', 'd'],
      evidenceTotal: 4,
      hypothesesFormed: 1,
      attackPathIdentified: true,
      containmentActions: 2,
      recoveryActions: 2,
      incidentContained: true,
      serviceRestored: true,
      failedActions: 0,
      alertAcknowledged: true,
    };

    const correct = deriveScoringMetrics(record({ ...base, attackPathCorrect: true }), profile);
    const wrong = deriveScoringMetrics(record({ ...base, attackPathCorrect: false }), profile);
    const none = deriveScoringMetrics(record({ ...base, attackPathIdentified: false }), profile);

    expect(correct.accuracy).toBeGreaterThan(wrong.accuracy);
    expect(wrong.accuracy).toBeGreaterThan(none.accuracy);
  });

  it('scales evidence quality with coverage', () => {
    const none = deriveScoringMetrics(record({ evidenceReviewed: [], evidenceTotal: 4 }), profile);
    const half = deriveScoringMetrics(record({ evidenceReviewed: ['a', 'b'], evidenceTotal: 4 }), profile);
    const all = deriveScoringMetrics(
      record({ evidenceReviewed: ['a', 'b', 'c', 'd'], evidenceTotal: 4 }),
      profile,
    );

    expect(none.evidenceQuality).toBe(0);
    expect(half.evidenceQuality).toBe(0.5);
    expect(all.evidenceQuality).toBe(1);
  });

  it('increases damage the longer the incident runs uncontained', () => {
    const fast = deriveScoringMetrics(
      record({ elapsedMs: 30_000, incidentContained: false, containmentActions: 0 }),
      profile,
    );
    const slow = deriveScoringMetrics(
      record({ elapsedMs: 500_000, incidentContained: false, containmentActions: 0 }),
      profile,
    );

    expect(slow.damage).toBeGreaterThan(fast.damage);
    expect(slow.responseTimeMs).toBeGreaterThan(fast.responseTimeMs);
  });

  it('reduces damage when containment and recovery are applied', () => {
    const uncontained = deriveScoringMetrics(
      record({ elapsedMs: 300_000, containmentActions: 0, recoveryActions: 0 }),
      profile,
    );
    const contained = deriveScoringMetrics(
      record({
        elapsedMs: 300_000,
        containmentActions: 2,
        recoveryActions: 2,
        incidentContained: true,
        serviceRestored: true,
      }),
      profile,
    );

    expect(contained.damage).toBeLessThan(uncontained.damage);
  });

  it('counts failed defender actions as penalties', () => {
    const clean = deriveScoringMetrics(record({ failedActions: 0 }), profile);
    const messy = deriveScoringMetrics(record({ failedActions: 3 }), profile);

    expect(clean.penalties).toBe(0);
    expect(messy.penalties).toBe(3);
  });

  it('keeps every metric inside its valid range', () => {
    const metrics = deriveScoringMetrics(
      record({ elapsedMs: 99_999_999, failedActions: 50, containmentActions: 99 }),
      profile,
    );

    expect(metrics.accuracy).toBeGreaterThanOrEqual(0);
    expect(metrics.accuracy).toBeLessThanOrEqual(1);
    expect(metrics.damage).toBeGreaterThanOrEqual(0);
    expect(metrics.damage).toBeLessThanOrEqual(1);
    expect(metrics.evidenceQuality).toBeGreaterThanOrEqual(0);
    expect(metrics.evidenceQuality).toBeLessThanOrEqual(1);

    // Must be accepted by the calculator, which validates ranges strictly.
    expect(() => new ScoreCalculator().calculate(metrics)).not.toThrow();
  });

  it('explains why a score came out the way it did', () => {
    const explanation = explainScoring(
      record({
        evidenceReviewed: ['a'],
        evidenceTotal: 4,
        attackPathIdentified: true,
        attackPathCorrect: false,
        incidentContained: false,
        serviceRestored: false,
        failedActions: 2,
      }),
      profile,
    );

    expect(explanation.evidenceCoverage).toBe(0.25);
    expect(explanation.notes.join(' ')).toMatch(/did not match the scenario/);
    expect(explanation.notes.join(' ')).toMatch(/never contained/);
    expect(explanation.notes.join(' ')).toMatch(/2 failed defender action/);
  });
});

describe('state-derived mission scoring end to end', () => {
  it('produces different scores for different player behaviour', () => {
    const thorough = new Mission001Runner(createMission001Scenario(), { clock: fakeClock() });
    thorough.start();
    thorough.acknowledgeInitialAlert();
    thorough.reviewAllEvidence();
    thorough.formHypothesis();
    thorough.identifyAttackPath();
    thorough.containIncident();
    thorough.recoverIncident();
    thorough.completeMission();

    const careless = new Mission001Runner(createMission001Scenario(), { clock: fakeClock() });
    careless.start();
    careless.completeMission();

    const partial = new Mission001Runner(createMission001Scenario(), { clock: fakeClock() });
    partial.start();
    partial.reviewEvidence('ev-001');
    partial.formHypothesis();
    partial.containIncident();
    partial.completeMission();

    const thoroughScore = thorough.getScore();
    const partialScore = partial.getScore();
    const carelessScore = careless.getScore();

    expect(thoroughScore).toBeGreaterThan(partialScore);
    expect(partialScore).toBeGreaterThan(carelessScore);
  });

  it('scores a slower analyst lower than a faster one', () => {
    const fastClock = fakeClock();
    const fast = new Mission001Runner(createMission001Scenario(), { clock: fastClock });
    fast.start();
    fast.reviewAllEvidence();
    fast.formHypothesis();
    fast.identifyAttackPath();
    fast.containIncident();
    fast.recoverIncident();
    fastClock.advance(20_000);
    fast.completeMission();

    const slowClock = fakeClock();
    const slow = new Mission001Runner(createMission001Scenario(), { clock: slowClock });
    slow.start();
    slow.reviewAllEvidence();
    slow.formHypothesis();
    slow.identifyAttackPath();
    slow.containIncident();
    slow.recoverIncident();
    slowClock.advance(500_000);
    slow.completeMission();

    expect(fast.getScore()).toBeGreaterThan(slow.getScore());
    expect(slow.getPerformanceRecord().elapsedMs).toBe(500_000);
  });

  it('penalises an analyst who never reviews the evidence', () => {
    const reader = new Mission001Runner(createMission001Scenario(), { clock: fakeClock() });
    reader.start();
    reader.reviewAllEvidence();
    reader.formHypothesis();
    reader.identifyAttackPath();
    reader.containIncident();
    reader.recoverIncident();
    reader.completeMission();

    const skipper = new Mission001Runner(createMission001Scenario(), { clock: fakeClock() });
    skipper.start();
    skipper.formHypothesis();
    skipper.identifyAttackPath();
    skipper.containIncident();
    skipper.recoverIncident();
    skipper.completeMission();

    expect(reader.getPerformanceRecord().evidenceReviewed).toHaveLength(4);
    expect(skipper.getPerformanceRecord().evidenceReviewed).toHaveLength(0);
    expect(reader.getScore()).toBeGreaterThan(skipper.getScore());
  });

  it('exposes the derived record through the generic MissionRunner', () => {
    const clock = fakeClock();
    const runner = new MissionRunner(createMission001Scenario(), { clock });
    runner.start();
    runner.reviewEvidence('ev-001');
    runner.acknowledgeAlert();
    runner.formHypothesis('Credentials were compromised.');
    runner.identifyAttackPath('internet', 'database');
    runner.containIncident();
    clock.advance(90_000);

    const record = runner.getPerformanceRecord();
    expect(record.evidenceReviewed).toEqual(['ev-001']);
    expect(record.alertAcknowledged).toBe(true);
    expect(record.hypothesesFormed).toBe(1);
    expect(record.attackPathCorrect).toBe(true);
    expect(record.incidentContained).toBe(true);
    expect(record.elapsedMs).toBe(90_000);

    // The derived metrics are what completion returns, not constants.
    expect(runner.completeMission()).toEqual(runner.getDerivedMetrics());
  });

  it('flags an incorrect attack path against the scenario declaration', () => {
    const runner = new MissionRunner(createMission001Scenario(), { clock: fakeClock() });
    runner.start();
    runner.identifyAttackPath('internet', 'file-server');

    expect(runner.getPerformanceRecord().attackPathCorrect).toBe(false);
  });

  it('records failed defender actions as penalties on the score', () => {
    const clean = new Mission001Runner(createMission001Scenario(), { clock: fakeClock() });
    clean.start();
    clean.reviewAllEvidence();
    clean.formHypothesis();
    clean.identifyAttackPath();
    clean.containIncident();
    clean.recoverIncident();
    clean.completeMission();

    const messy = new Mission001Runner(createMission001Scenario(), { clock: fakeClock() });
    messy.start();
    messy.reviewAllEvidence();
    messy.formHypothesis();
    messy.identifyAttackPath();
    messy.containIncident();
    messy.recoverIncident();
    messy.runner.recordFailedAction();
    messy.runner.recordFailedAction();
    messy.completeMission();

    expect(messy.getPerformanceRecord().failedActions).toBe(2);
    expect(messy.getScore()).toBeLessThan(clean.getScore());
  });
});
