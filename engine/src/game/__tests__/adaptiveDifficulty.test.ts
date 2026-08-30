import { describe, it, expect } from 'vitest';
import {
  AdaptiveDifficultyController,
  Difficulty,
  DifficultyManager,
  DifficultyProfile,
  createMission001Scenario,
} from '../index.js';

describe('DifficultyProfile', () => {
  it('creates a valid profile', () => {
    const profile = new DifficultyProfile({
      id: 'custom-hard',
      name: 'Custom Hard',
      difficulty: Difficulty.Hard,
      scoreMultiplier: 0.7,
      timeMultiplier: 0.7,
      ambiguityMultiplier: 1.3,
      description: 'Custom hard profile',
    });

    expect(profile.difficulty).toBe(Difficulty.Hard);
    expect(profile.getSettings()).toMatchObject({
      scoreMultiplier: 0.7,
      timeMultiplier: 0.7,
    });
    expect(() => profile.validate()).not.toThrow();
  });

  it('creates built-in profiles for all difficulties', () => {
    const profiles = DifficultyProfile.createDefaultProfiles();
    expect(profiles).toHaveLength(4);
    const normal = profiles.find((p) => p.difficulty === Difficulty.Normal)!;
    expect(normal.id).toBe('difficulty-normal');
    expect(normal.scoreMultiplier).toBe(1);
    expect(normal.timeMultiplier).toBe(1);
  });

  it('rejects invalid profile data', () => {
    expect(
      () => new DifficultyProfile({
        id: '',
        name: 'x',
        difficulty: Difficulty.Normal,
        scoreMultiplier: 1,
        timeMultiplier: 1,
      }),
    ).toThrow(/id/);
    expect(
      () => new DifficultyProfile({
        id: 'x',
        name: 'x',
        difficulty: 'invalid' as any,
        scoreMultiplier: 1,
        timeMultiplier: 1,
      }),
    ).toThrow(/difficulty/);
    expect(
      () => new DifficultyProfile({
        id: 'x',
        name: 'x',
        difficulty: Difficulty.Normal,
        scoreMultiplier: 0,
        timeMultiplier: 1,
      }),
    ).toThrow(/positive/);
  });

  it('clones and round-trips through JSON', () => {
    const profile = DifficultyProfile.fromBaseDifficulty(Difficulty.Easy);
    const clone = profile.clone();
    clone.validate();
    const restored = DifficultyProfile.fromJSON(profile.toJSON());
    expect(restored.id).toBe('difficulty-easy');
    expect(restored.ambiguityMultiplier).toBe(0.75);
  });
});

describe('AdaptiveDifficultyController', () => {
  it('starts at normal by default', () => {
    const controller = new AdaptiveDifficultyController();
    expect(controller.getCurrentDifficulty()).toBe(Difficulty.Normal);
    expect(controller.getSettings().scoreMultiplier).toBe(1);
    expect(controller.isEnabled()).toBe(true);
  });

  it('does not adjust before minimum samples', () => {
    const controller = new AdaptiveDifficultyController({
      initialDifficulty: Difficulty.Normal,
      minSamplesBeforeAdjustment: 3,
    });

    controller.recordResult({ normalizedScore: 1 });
    controller.recordResult({ normalizedScore: 1 });
    expect(controller.getCurrentDifficulty()).toBe(Difficulty.Normal);
  });

  it('promotes after sustained high performance', () => {
    const controller = new AdaptiveDifficultyController({
      initialDifficulty: Difficulty.Normal,
      minSamplesBeforeAdjustment: 3,
      lookbackWindow: 3,
      promotionThreshold: 0.8,
    });

    controller.recordResult({ normalizedScore: 0.9 });
    controller.recordResult({ normalizedScore: 0.85 });
    controller.recordResult({ normalizedScore: 0.95 });

    expect(controller.getCurrentDifficulty()).toBe(Difficulty.Hard);
    expect(controller.getLastAdjustment()).toMatchObject({
      from: Difficulty.Normal,
      to: Difficulty.Hard,
      reason: expect.stringContaining('promotion'),
    });
  });

  it('demotes after sustained low performance', () => {
    const controller = new AdaptiveDifficultyController({
      initialDifficulty: Difficulty.Hard,
      minSamplesBeforeAdjustment: 3,
      lookbackWindow: 3,
      demotionThreshold: 0.4,
    });

    controller.recordResult({ normalizedScore: 0.2 });
    controller.recordResult({ normalizedScore: 0.35 });
    controller.recordResult({ normalizedScore: 0.3 });

    expect(controller.getCurrentDifficulty()).toBe(Difficulty.Normal);
  });

  it('does not adjust when disabled', () => {
    const controller = new AdaptiveDifficultyController({
      initialDifficulty: Difficulty.Normal,
      enabled: false,
      minSamplesBeforeAdjustment: 1,
    });

    controller.recordResult({ normalizedScore: 1 });
    expect(controller.getCurrentDifficulty()).toBe(Difficulty.Normal);
  });

  it('supports manual difficulty changes', () => {
    const controller = new AdaptiveDifficultyController();
    controller.setDifficulty(Difficulty.Expert);
    expect(controller.getCurrentDifficulty()).toBe(Difficulty.Expert);
    expect(controller.getSettings().timeMultiplier).toBe(0.5);
  });

  it('creates snapshots and resets state', () => {
    const controller = new AdaptiveDifficultyController({
      initialDifficulty: Difficulty.Normal,
      minSamplesBeforeAdjustment: 1,
    });
    controller.recordResult({ normalizedScore: 0.9 });

    const snapshot = controller.createSnapshot();
    expect(snapshot.currentDifficulty).toBe(Difficulty.Hard);
    expect(snapshot.sampleCount).toBe(1);
    expect(snapshot.recentScores).toEqual([0.9]);
    expect(snapshot.summary).toContain('difficulty=hard');

    controller.reset();
    expect(controller.getCurrentDifficulty()).toBe(Difficulty.Normal);
    expect(controller.getSampleCount()).toBe(0);
    expect(controller.getLastAdjustment()).toBeUndefined();
  });

  it('rejects invalid results', () => {
    const controller = new AdaptiveDifficultyController();
    expect(() => controller.recordResult({ normalizedScore: -1 })).toThrow(/between 0 and 1/);
    expect(() => controller.recordResult({ normalizedScore: 1.2 })).toThrow(/between 0 and 1/);
    expect(() => controller.recordResult({ normalizedScore: 0.5, penalties: -1 })).toThrow(/non-negative/);
  });
});

describe('DifficultyManager', () => {
  it('registers default profiles and uses current difficulty', () => {
    const manager = new DifficultyManager();
    expect(manager.listProfileIds()).toContain('difficulty-normal');
    expect(manager.getCurrentDifficulty()).toBe(Difficulty.Normal);
  });

  it('supports custom profiles and profile retrieval', () => {
    const manager = new DifficultyManager();
    const profile = new DifficultyProfile({
      id: 'custom-expert',
      name: 'Custom Expert',
      difficulty: Difficulty.Expert,
      scoreMultiplier: 0.5,
      timeMultiplier: 0.45,
    });
    manager.registerProfile(profile);

    expect(manager.hasProfile('custom-expert')).toBe(true);
    expect(manager.getProfile('custom-expert')!.difficulty).toBe(Difficulty.Expert);
    expect(() => manager.registerProfile(profile)).toThrow(/already registered/);
  });

  it('rejects missing profile operations', () => {
    const manager = new DifficultyManager();
    expect(() => manager.unregisterProfile('missing')).toThrow(/does not exist/);
    expect(() => manager.getProfileForDifficulty('invalid' as any)).toThrow(/difficulty/);
  });

  it('applies difficulty scaling to scenario time limit', () => {
    const manager = new DifficultyManager();
    const scenario = createMission001Scenario();
    const easyScenario = manager.applyDifficultyToScenario(scenario, Difficulty.Easy);
    const expertScenario = manager.applyDifficultyToScenario(scenario, Difficulty.Expert);

    const originalTime = scenario.getData().timeLimitMs ?? 600000;
    expect(easyScenario.getData().timeLimitMs).toBeGreaterThan(originalTime);
    expect(expertScenario.getData().timeLimitMs).toBeLessThan(originalTime);
  });

  it('creates a snapshot', () => {
    const manager = new DifficultyManager();
    manager.setCurrentDifficulty(Difficulty.Hard);
    const snapshot = manager.createSnapshot();

    expect(snapshot.profileCount).toBe(4);
    expect(snapshot.currentDifficulty).toBe(Difficulty.Hard);
    expect(snapshot.summary).toContain('difficulty=hard');
  });

  it('validates cleanly', () => {
    const manager = new DifficultyManager();
    expect(() => manager.validate()).not.toThrow();
  });
});
