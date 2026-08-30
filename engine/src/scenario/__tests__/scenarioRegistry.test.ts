import { describe, it, expect } from 'vitest';
import {
  ScenarioDefinition,
  ScenarioRegistry,
  ScenarioLoader,
} from '../index.js';
import type { Scenario as ScenarioData } from '../ScenarioTypes.js';

const validScenario: ScenarioData = {
  id: 'scenario-1',
  name: 'Phishing Attack',
  organization: { name: 'Acme Corp' },
  network: {
    nodes: [
      { id: 'internet', type: 'internet' },
      { id: 'firewall', type: 'firewall' },
    ],
    edges: [{ source: 'internet', target: 'firewall' }],
  },
  assets: [{ id: 'asset1', name: 'Database', type: 'database', value: 100 }],
  users: [{ id: 'user1', name: 'Alice' }],
  attacker: { id: 'attacker1', name: 'APT', objective: 'Steal data', sophistication: 'low' },
  defense: { controls: [], monitoringLevel: 'none' },
  attackPath: { source: 'internet', target: 'firewall', path: ['internet', 'firewall'] },
  evidence: [
    { id: 'e1', type: 'log', title: 'Log', description: 'Log entry' },
  ],
  objectives: [{ id: 'o1', description: 'Find attacker' }],
  timeline: [{ id: 't1', type: 'event', timestamp: 100 }],
};

const anotherScenario: ScenarioData = {
  ...validScenario,
  id: 'scenario-2',
  name: 'Ransomware',
};

describe('ScenarioRegistry', () => {
  it('registers and retrieves scenarios', () => {
    const registry = new ScenarioRegistry();
    const scenario = new ScenarioDefinition(validScenario);
    registry.register(scenario);
    expect(registry.has('scenario-1')).toBe(true);
    expect(registry.get('scenario-1')).toBe(scenario);
    expect(registry.list()).toHaveLength(1);
  });

  it('throws on duplicate registration', () => {
    const registry = new ScenarioRegistry();
    const scenario = new ScenarioDefinition(validScenario);
    registry.register(scenario);
    expect(() => registry.register(scenario)).toThrow(/already exists/);
  });

  it('unregisters a scenario', () => {
    const registry = new ScenarioRegistry();
    const scenario = new ScenarioDefinition(validScenario);
    registry.register(scenario);
    registry.unregister('scenario-1');
    expect(registry.has('scenario-1')).toBe(false);
    expect(() => registry.unregister('scenario-1')).toThrow(/does not exist/);
  });

  it('loads from JSON and registers', () => {
    const registry = new ScenarioRegistry();
    const json = JSON.stringify(validScenario);
    const scenario = registry.loadFromJSON(json);
    expect(scenario.getId()).toBe('scenario-1');
    expect(registry.has('scenario-1')).toBe(true);
  });

  it('loads from object and registers', () => {
    const registry = new ScenarioRegistry();
    const scenario = registry.loadFromObject(validScenario);
    expect(scenario.getId()).toBe('scenario-1');
    expect(registry.has('scenario-1')).toBe(true);
  });

  it('loads multiple from JSON array', () => {
    const registry = new ScenarioRegistry();
    const json = JSON.stringify([validScenario, anotherScenario]);
    const scenarios = registry.loadAllFromJSONArray(json);
    expect(scenarios).toHaveLength(2);
    expect(registry.list()).toHaveLength(2);
  });

  it('throws on invalid JSON', () => {
    const registry = new ScenarioRegistry();
    expect(() => registry.loadFromJSON('bad json')).toThrow(/Invalid JSON/);
  });

  it('clears registry', () => {
    const registry = new ScenarioRegistry();
    registry.loadFromObject(validScenario);
    expect(registry.list()).toHaveLength(1);
    registry.clear();
    expect(registry.list()).toHaveLength(0);
  });

  it('serialises to JSON', () => {
    const registry = new ScenarioRegistry();
    registry.loadFromObject(validScenario);
    const json = registry.toJSON();
    expect(json).toHaveProperty('scenario-1');
    expect(json['scenario-1'].name).toBe('Phishing Attack');
  });
});
