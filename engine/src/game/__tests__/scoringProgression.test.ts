import { describe, it, expect } from 'vitest';
import {
  ScoreCalculator,
  PlayerProgression,
  DEFAULT_SCORING_WEIGHTS,
  xpRequiredForLevel,
  type ScoringMetrics,
} from '../index.js';

describe('ScoreCalculator', () => {
  const perfectMetrics: ScoringMetrics = {
    accuracy: 1,
    responseTimeMs: 0,
    damage: 0,
    evidenceQuality: 1,
    penalties: 0,
  };

  it('returns max score for perfect metrics', () => {
    const calc = new ScoreCalculator();
    const result = calc.calculate(perfectMetrics);
    expect(result.total).toBeCloseTo(0.95); // sum of positive weights
    expect(result.normalized).toBeCloseTo(1);
    expect(result.penaltiesApplied).toBe(0);
  });

  it('applies penalties', () => {
    const calc = new ScoreCalculator();
    const metrics = { ...perfectMetrics, penalties: 2 };
    const result = calc.calculate(metrics);
    expect(result.penaltiesApplied).toBeGreaterThan(0);
    expect(result.total).toBeLessThan(0.95);
  });

  it('normalizes response time', () => {
    const calc = new ScoreCalculator();
    const metrics = { ...perfectMetrics, responseTimeMs: 600000 };
    const result = calc.calculate(metrics);
    expect(result.total).toBeLessThan(0.95);
  });

  it('does not exceed maxTotal', () => {
    const calc = new ScoreCalculator();
    const metrics = { ...perfectMetrics, damage: 0.5, accuracy: 0.9 };
    const result = calc.calculate(metrics);
    expect(result.total).toBeLessThanOrEqual(calc.getMaxTotal());
  });

  it('throws on invalid accuracy', () => {
    const calc = new ScoreCalculator();
    expect(() => calc.calculate({ ...perfectMetrics, accuracy: 1.5 })).toThrow(/between 0 and 1/);
  });

  it('throws on negative response time', () => {
    const calc = new ScoreCalculator();
    expect(() => calc.calculate({ ...perfectMetrics, responseTimeMs: -10 })).toThrow(/non-negative/);
  });

  it('throws on invalid weights sum', () => {
    expect(
      () =>
        new ScoreCalculator({
          accuracy: 0.5,
          responseTime: 0.5,
          damage: 0.5,
          evidenceQuality: 0.5,
          penalty: 0.5,
        }),
    ).toThrow(/sum to 1/);
  });
});

describe('PlayerProgression', () => {
  it('starts at level 1 with 0 XP', () => {
    const pp = new PlayerProgression();
    expect(pp.getLevel()).toBe(1);
    expect(pp.getXP()).toBe(0);
  });

  it('adds XP and levels up', () => {
    const pp = new PlayerProgression();
    const xpToLevel2 = xpRequiredForLevel(2);
    pp.addXP(xpToLevel2);
    expect(pp.getLevel()).toBe(2);
    expect(pp.getXP()).toBe(xpToLevel2);
  });

  it('levels up multiple times with large XP', () => {
    const pp = new PlayerProgression();
    pp.addXP(999999);
    expect(pp.getLevel()).toBeGreaterThan(1);
  });

  it('throws on negative XP', () => {
    const pp = new PlayerProgression();
    expect(() => pp.addXP(-10)).toThrow(/non-negative/);
  });

  it('tracks achievements and unlocks', () => {
    const pp = new PlayerProgression();
    pp.unlockAchievement('first_mission');
    pp.unlock('advanced_tools');
    expect(pp.hasAchievement('first_mission')).toBe(true);
    expect(pp.hasUnlock('advanced_tools')).toBe(true);
    expect(pp.getAchievements()).toContain('first_mission');
    expect(pp.getUnlocks()).toContain('advanced_tools');
  });

  it('completes mission and adds XP', () => {
    const pp = new PlayerProgression();
    const calc = new ScoreCalculator();
    const perfectResult = calc.calculate({
      accuracy: 1,
      responseTimeMs: 0,
      damage: 0,
      evidenceQuality: 1,
      penalties: 0,
    });
    pp.completeMission(perfectResult);
    expect(pp.getStats().totalMissionsCompleted).toBe(1);
    expect(pp.getStats().totalXP).toBeGreaterThan(0);
    expect(pp.getXP()).toBeGreaterThan(0);
  });

  it('serialises stats', () => {
    const pp = new PlayerProgression();
    pp.addXP(500);
    pp.unlockAchievement('a1');
    const json = pp.toJSON();
    expect(json.level).toBe(1);
    expect(json.totalXP).toBe(500);
    expect(json.achievements).toContain('a1');
  });
});
