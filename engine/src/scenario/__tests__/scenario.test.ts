import { describe, it, expect } from 'vitest';
import { ScenarioDefinition, ScenarioLoader } from '../index.js';
import type { Scenario as ScenarioData } from '../ScenarioTypes.js';

const validScenario: ScenarioData = {
  id: 'scenario-1',
  name: 'Phishing Attack',
  description: 'Employee clicked phishing email, attacker gained access.',
  organization: {
    name: 'Acme Corp',
    industry: 'Healthcare',
  },
  network: {
    nodes: [
      { id: 'internet', type: 'internet' },
      { id: 'firewall', type: 'firewall' },
      { id: 'employee-pc', type: 'client' },
      { id: 'database', type: 'server' },
    ],
    edges: [
      { source: 'internet', target: 'firewall' },
      { source: 'firewall', target: 'employee-pc' },
      { source: 'employee-pc', target: 'database' },
    ],
  },
  assets: [
    { id: 'asset1', name: 'Customer Database', type: 'database', value: 100 },
  ],
  users: [
    { id: 'user1', name: 'Alice', email: 'alice@acme.com', role: 'employee' },
  ],
  attacker: {
    id: 'attacker1',
    name: 'APT42',
    objective: 'Exfiltrate customer data',
    sophistication: 'advanced',
  },
  defense: {
    controls: ['firewall', 'antivirus'],
    monitoringLevel: 'basic',
  },
  attackPath: {
    source: 'internet',
    target: 'database',
    path: ['internet', 'firewall', 'employee-pc', 'database'],
  },
  evidence: [
    { id: 'e1', type: 'authentication_event', title: 'Failed login', description: 'Failed login from suspicious IP' },
  ],
  objectives: [
    { id: 'o1', description: 'Identify compromised host' },
  ],
  timeline: [
    { id: 't1', type: 'alert', timestamp: 1000, sourceId: 'firewall' },
  ],
  timeLimitMs: 600000,
  seed: 12345,
};

describe('ScenarioDefinition', () => {
  it('creates a valid scenario', () => {
    const scenario = new ScenarioDefinition(validScenario);
    expect(scenario.getId()).toBe('scenario-1');
    expect(scenario.getName()).toBe('Phishing Attack');
    expect(scenario.getData()).toBeDefined();
  });

  it('throws on missing id', () => {
    const invalid = { ...validScenario, id: '' };
    expect(() => new ScenarioDefinition(invalid)).toThrow(/non-empty/);
  });

  it('throws on empty network nodes', () => {
    const invalid = {
      ...validScenario,
      network: { ...validScenario.network, nodes: [] },
    };
    expect(() => new ScenarioDefinition(invalid)).toThrow(/at least one node/);
  });

  it('throws on duplicate evidence ids', () => {
    const invalid = {
      ...validScenario,
      evidence: [
        { id: 'e1', type: 'log', title: 'Log', description: 'Desc' },
        { id: 'e1', type: 'alert', title: 'Alert', description: 'Desc' },
      ],
    };
    expect(() => new ScenarioDefinition(invalid)).toThrow(/Duplicate scenario evidence id/);
  });
});

describe('ScenarioLoader', () => {
  it('loads from JSON string', () => {
    const json = JSON.stringify(validScenario);
    const scenario = ScenarioLoader.fromJSON(json);
    expect(scenario.getId()).toBe('scenario-1');
  });

  it('throws on invalid JSON', () => {
    expect(() => ScenarioLoader.fromJSON('not json')).toThrow(/Invalid JSON/);
  });

  it('loads from object', () => {
    const scenario = ScenarioLoader.fromObject(validScenario);
    expect(scenario.getName()).toBe('Phishing Attack');
  });

  it('loads multiple from JSON array', () => {
    const json = JSON.stringify([validScenario]);
    const scenarios = ScenarioLoader.fromJSONArray(json);
    expect(scenarios).toHaveLength(1);
    expect(scenarios[0].getId()).toBe('scenario-1');
  });
});
