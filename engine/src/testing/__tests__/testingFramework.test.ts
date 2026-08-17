import { describe, it, expect } from 'vitest';
import { DeterminismChecker } from '../DeterminismChecker.js';
import { ScenarioTestHelper } from '../ScenarioTestHelper.js';
import { TestHarness } from '../TestHarness.js';
import { NetworkGraph } from '../../cyber/NetworkGraph.js';

describe('DeterminismChecker', () => {
  it('detects deterministic function', () => {
    expect(DeterminismChecker.isDeterministic(() => 42)).toBe(true);
  });

  it('detects non-deterministic function', () => {
    expect(DeterminismChecker.isDeterministic(() => Math.random())).toBe(false);
  });

  it('throws when expectDeterministic fails', () => {
    expect(() => DeterminismChecker.expectDeterministic(() => Math.random())).toThrow(
      /Expected function to be deterministic/,
    );
  });

  it('throws when runs < 2', () => {
    expect(() => DeterminismChecker.isDeterministic(() => 1, 1)).toThrow(/at least 2/);
  });
});

describe('ScenarioTestHelper', () => {
  it('creates a minimal valid scenario', () => {
    const scenario = ScenarioTestHelper.createMinimalScenario('test-1');
    expect(scenario.getId()).toBe('test-1');
    expect(scenario.getData().network.nodes.length).toBe(4);
    expect(scenario.getData().attackPath.path.length).toBe(4);
  });
});

describe('TestHarness', () => {
  it('creates engine with manual clock and scenario', async () => {
    const scenarioData = ScenarioTestHelper.createMinimalScenario('harness-test').getData();
    const { engine, clock, scenario } = await TestHarness.createWithScenario(scenarioData, 1000);
    expect(engine.getState()).toBe('started');
    expect(clock.now()).toBe(1000);
    expect(scenario.getId()).toBe('harness-test');
    await engine.stop();
    await engine.shutdown();
  });
});
