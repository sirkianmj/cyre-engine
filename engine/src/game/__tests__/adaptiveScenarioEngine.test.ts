import { describe, it, expect } from 'vitest';
import {
  AdaptiveScenarioEngine,
  Difficulty,
  type AdaptiveScenarioEngineOptions,
} from '../index.js';
import { ScenarioDefinition } from '../../scenario/index.js';

function createOptions(
  overrides: Partial<AdaptiveScenarioEngineOptions> = {},
): AdaptiveScenarioEngineOptions {
  return {
    name: 'Test Adaptive Scenario Engine',
    baseOptions: {
      organizationSize: 'medium',
      objective: 'credential-theft',
    },
    ...overrides,
  };
}

describe('AdaptiveScenarioEngine', () => {
  it('creates engine and generates a valid scenario at normal difficulty', () => {
    const engine = new AdaptiveScenarioEngine(createOptions());
    expect(engine.name).toBe('Test Adaptive Scenario Engine');
    expect(engine.getCurrentDifficulty()).toBe(Difficulty.Normal);

    const scenario = engine.generateScenario(42);
    expect(scenario).toBeInstanceOf(ScenarioDefinition);
    expect(engine.getScenarioCount()).toBe(1);
    expect(scenario.getData().network.nodes.length).toBeGreaterThan(0);
    expect(scenario.getData().timeLimitMs).toBeGreaterThan(0);
  });

  it('maps easy difficulty to low complexity and simple attacker', () => {
    const engine = new AdaptiveScenarioEngine(createOptions());
    engine.getDifficultyController().setDifficulty(Difficulty.Easy);
    engine.generateScenario(1);

    const options = engine.getCurrentScenarioOptions()!;
    expect(options.networkComplexity).toBe('low');
    expect(options.attackerProfile).toBe('script-kiddie');
    expect(options.vulnerabilityLevel).toBe('low');
    expect(options.defenseLevel).toBe('advanced');
    expect(options.difficulty).toBe('easy');
  });

  it('maps expert difficulty to high complexity and advanced attacker', () => {
    const engine = new AdaptiveScenarioEngine(createOptions());
    engine.getDifficultyController().setDifficulty(Difficulty.Expert);
    engine.generateScenario(1);

    const options = engine.getCurrentScenarioOptions()!;
    expect(options.networkComplexity).toBe('high');
    expect(options.attackerProfile).toBe('apt');
    expect(options.vulnerabilityLevel).toBe('high');
    expect(options.defenseLevel).toBe('advanced');
    expect(options.difficulty).toBe('hard');
  });

  it('rejects invalid base options', () => {
    expect(() =>
      new AdaptiveScenarioEngine(createOptions({
        baseOptions: {
          organizationSize: 'invalid' as any,
          objective: 'credential-theft',
        },
      })),
    ).toThrow(/organization size/);

    expect(() =>
      new AdaptiveScenarioEngine(createOptions({
        baseOptions: {
          organizationSize: 'medium',
          objective: 'invalid' as any,
        },
      })),
    ).toThrow(/scenario objective/);
  });

  it('records results and promotes difficulty with an adjustment', () => {
    const engine = new AdaptiveScenarioEngine(createOptions({
      adaptiveDifficultyOptions: {
        initialDifficulty: Difficulty.Normal,
        minSamplesBeforeAdjustment: 3,
        promotionThreshold: 0.8,
      },
    }));

    expect(engine.recordResult({ normalizedScore: 0.9 })).toBeUndefined();
    expect(engine.recordResult({ normalizedScore: 0.85 })).toBeUndefined();
    const adjustment = engine.recordResult({ normalizedScore: 0.95 });

    expect(adjustment).toBeDefined();
    expect(adjustment!.difficulty).toBe(Difficulty.Hard);
    expect(adjustment!.averageNormalizedScore).toBeGreaterThan(0.8);
    expect(adjustment!.scenarioOptions.networkComplexity).toBe('high');
    expect(engine.getAdjustmentCount()).toBe(1);
    expect(engine.getAdjustments()).toHaveLength(1);
  });

  it('demotes difficulty after low performance', () => {
    const engine = new AdaptiveScenarioEngine(createOptions({
      adaptiveDifficultyOptions: {
        initialDifficulty: Difficulty.Hard,
        minSamplesBeforeAdjustment: 3,
        demotionThreshold: 0.4,
      },
    }));

    engine.recordResult({ normalizedScore: 0.2 });
    engine.recordResult({ normalizedScore: 0.35 });
    const adjustment = engine.recordResult({ normalizedScore: 0.3 });

    expect(adjustment).toBeDefined();
    expect(adjustment!.difficulty).toBe(Difficulty.Normal);
    expect(engine.getCurrentDifficulty()).toBe(Difficulty.Normal);
  });

  it('does not create adjustment when difficulty is disabled', () => {
    const engine = new AdaptiveScenarioEngine(createOptions({
      adaptiveDifficultyOptions: {
        enabled: false,
        initialDifficulty: Difficulty.Normal,
      },
    }));

    const adjustment = engine.recordResult({ normalizedScore: 0.95 });
    expect(adjustment).toBeUndefined();
    expect(engine.getCurrentDifficulty()).toBe(Difficulty.Normal);
    expect(engine.getAdjustmentCount()).toBe(0);
  });

  it('applies difficulty time scaling to an existing scenario', () => {
    const engine = new AdaptiveScenarioEngine(createOptions());
    const scenario = engine.generateScenario(42);
    const originalTime = scenario.getData().timeLimitMs!;

    engine.getDifficultyController().setDifficulty(Difficulty.Easy);
    const easyScenario = engine.applyDifficultyToScenario(scenario);
    expect(easyScenario.getData().timeLimitMs).toBeGreaterThan(originalTime);

    engine.getDifficultyController().setDifficulty(Difficulty.Expert);
    const expertScenario = engine.applyDifficultyToScenario(scenario);
    expect(expertScenario.getData().timeLimitMs).toBeLessThan(originalTime);
  });

  it('creates a snapshot and validates cleanly', () => {
    const engine = new AdaptiveScenarioEngine(createOptions());
    engine.generateScenario(42);

    const snapshot = engine.createSnapshot();
    expect(snapshot.name).toBe('Test Adaptive Scenario Engine');
    expect(snapshot.currentDifficulty).toBe(Difficulty.Normal);
    expect(snapshot.scenarioCount).toBe(1);
    expect(snapshot.adjustmentCount).toBe(0);
    expect(snapshot.currentScenarioOptions).toBeDefined();
    expect(snapshot.summary).toContain('Test Adaptive Scenario Engine');
    expect(() => engine.validate()).not.toThrow();
  });

  it('resets engine state', () => {
    const engine = new AdaptiveScenarioEngine(createOptions({
      adaptiveDifficultyOptions: {
        initialDifficulty: Difficulty.Hard,
      },
    }));
    engine.generateScenario(1);
    engine.recordResult({ normalizedScore: 0.2 });
    engine.recordResult({ normalizedScore: 0.25 });
    engine.recordResult({ normalizedScore: 0.3 });
    expect(engine.getCurrentDifficulty()).toBe(Difficulty.Normal);
    expect(engine.getAdjustmentCount()).toBeGreaterThan(0);

    engine.reset();
    expect(engine.getCurrentDifficulty()).toBe(Difficulty.Hard);
    expect(engine.getScenarioCount()).toBe(0);
    expect(engine.getAdjustmentCount()).toBe(0);
    expect(engine.getAdjustments()).toHaveLength(0);
    expect(engine.getCurrentScenarioOptions()).toBeUndefined();
  });
});
