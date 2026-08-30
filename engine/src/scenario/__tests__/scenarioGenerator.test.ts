import { describe, it, expect } from 'vitest';
import {
  ScenarioGenerator,
  type ScenarioGeneratorOptions,
} from '../ScenarioGenerator.js';

const BASE_OPTIONS: ScenarioGeneratorOptions = {
  organizationSize: 'medium',
  networkComplexity: 'medium',
  attackerProfile: 'apt',
  vulnerabilityLevel: 'medium',
  defenseLevel: 'advanced',
  objective: 'data-exfiltration',
  difficulty: 'medium',
  seed: 42,
};

describe('ScenarioGenerator', () => {
  it('generates a valid scenario', () => {
    const scenario = new ScenarioGenerator().generate(BASE_OPTIONS);
    expect(scenario.id).toMatch(/^generated-scenario-/);
    expect(scenario.name).toContain('Data Exfiltration');
    expect(scenario.network.nodes.length).toBeGreaterThanOrEqual(6);
    expect(scenario.network.edges.length).toBeGreaterThanOrEqual(5);
    expect(scenario.attackPath.path.length).toBeGreaterThanOrEqual(2);
    expect(scenario.objectives.length).toBe(3);
    expect(scenario.evidence.length).toBeGreaterThanOrEqual(5);
    expect(scenario.timeline.length).toBeGreaterThanOrEqual(5);
  });

  it('produces deterministic scenarios for the same seed', () => {
    const generator = new ScenarioGenerator();
    const first = generator.generate(BASE_OPTIONS);
    const second = generator.generate(BASE_OPTIONS);
    expect(first).toEqual(second);
  });

  it('produces different scenarios for different seeds', () => {
    const generator = new ScenarioGenerator();
    const first = generator.generate({ ...BASE_OPTIONS, seed: 42 });
    const second = generator.generate({ ...BASE_OPTIONS, seed: 43 });
    expect(first.id).not.toBe(second.id);
  });

  it('generates multiple distinct scenarios', () => {
    const generator = new ScenarioGenerator();
    const scenarios = generator.generateMany(
      {
        organizationSize: 'small',
        networkComplexity: 'low',
        attackerProfile: 'script-kiddie',
        vulnerabilityLevel: 'low',
        defenseLevel: 'basic',
        objective: 'ransomware',
        difficulty: 'easy',
      },
      3,
      100,
    );
    expect(scenarios).toHaveLength(3);
    expect(new Set(scenarios.map((scenario) => scenario.id)).size).toBe(3);
  });

  it('rejects invalid options', () => {
    const generator = new ScenarioGenerator();
    expect(() =>
      generator.generate({
        ...BASE_OPTIONS,
        organizationSize: 'invalid' as any,
      }),
    ).toThrow(/Invalid organization size/);
    expect(() =>
      generator.generate({
        ...BASE_OPTIONS,
        objective: 'invalid' as any,
      }),
    ).toThrow(/Invalid objective/);
  });

  it('rejects invalid seed', () => {
    const generator = new ScenarioGenerator();
    expect(() => generator.generate({ ...BASE_OPTIONS, seed: -1 })).toThrow(/non-negative finite number/);
  });

  it('generates a valid scenario for every supported objective', () => {
    const generator = new ScenarioGenerator();
    const objectives = ['data-exfiltration', 'ransomware', 'credential-theft'] as const;
    for (const objective of objectives) {
      const scenario = generator.generate({ ...BASE_OPTIONS, objective });
      expect(scenario.attacker.objective).toBeDefined();
      expect(scenario.network.nodes.length).toBeGreaterThan(0);
    }
  });

  it('scales network complexity', () => {
    const generator = new ScenarioGenerator();
    const low = generator.generate({ ...BASE_OPTIONS, networkComplexity: 'low' });
    const high = generator.generate({ ...BASE_OPTIONS, networkComplexity: 'high' });
    expect(high.network.nodes.length).toBeGreaterThan(low.network.nodes.length);
  });
});
