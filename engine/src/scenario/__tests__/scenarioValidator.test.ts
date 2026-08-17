import { describe, it, expect } from 'vitest';
import { ScenarioValidator, ScenarioDefinition } from '../index.js';
import type { Scenario as ScenarioData } from '../ScenarioTypes.js';

const validScenario: ScenarioData = {
  id: 'scenario-1',
  name: 'Valid Scenario',
  organization: { name: 'Acme Corp' },
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
  assets: [{ id: 'asset1', name: 'Customer Database', type: 'database', value: 100 }],
  users: [{ id: 'user1', name: 'Alice', email: 'alice@acme.com' }],
  attacker: { id: 'attacker1', name: 'APT', objective: 'Steal data', sophistication: 'high' },
  defense: { controls: ['firewall'], monitoringLevel: 'basic' },
  attackPath: {
    source: 'internet',
    target: 'database',
    path: ['internet', 'firewall', 'employee-pc', 'database'],
  },
  evidence: [
    { id: 'e1', type: 'log', title: 'Failed login', description: 'Failed login' },
  ],
  objectives: [{ id: 'o1', description: 'Find attacker' }],
  timeline: [{ id: 't1', type: 'event', timestamp: 100 }],
  timeLimitMs: 600000,
};

describe('ScenarioValidator', () => {
  it('returns valid for a correct scenario', () => {
    const validator = new ScenarioValidator();
    const result = validator.validate(validScenario);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('detects missing node in edge', () => {
    const invalid = {
      ...validScenario,
      network: {
        ...validScenario.network,
        edges: [...validScenario.network.edges, { source: 'firewall', target: 'ghost' }],
      },
    };
    const result = new ScenarioValidator().validate(invalid);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('ghost'))).toBe(true);
  });

  it('detects attack path edge not in network', () => {
    const invalid = {
      ...validScenario,
      attackPath: {
        ...validScenario.attackPath,
        path: ['internet', 'firewall', 'database'], // employee-pc edge missing
      },
    };
    const result = new ScenarioValidator().validate(invalid);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('does not exist in network'))).toBe(true);
  });

  it('detects attack path source mismatch', () => {
    const invalid = {
      ...validScenario,
      attackPath: {
        ...validScenario.attackPath,
        path: ['firewall', 'employee-pc', 'database'], // first not source
      },
    };
    const result = new ScenarioValidator().validate(invalid);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('must match source'))).toBe(true);
  });

  it('detects invalid evidence sourceId as warning', () => {
    const invalid = {
      ...validScenario,
      evidence: [
        ...validScenario.evidence,
        { id: 'e2', type: 'log', title: 'Log', description: 'Desc', sourceId: 'unknown' },
      ],
    };
    const result = new ScenarioValidator().validate(invalid);
    expect(result.isValid).toBe(true); // warning only
    expect(result.warnings.some((w) => w.includes('unknown'))).toBe(true);
  });

  it('detects negative timeline timestamp as error', () => {
    const invalid = {
      ...validScenario,
      timeline: [{ id: 't1', type: 'event', timestamp: -10 }],
    };
    const result = new ScenarioValidator().validate(invalid);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('non-negative'))).toBe(true);
  });

  it('detects duplicate asset id', () => {
    const invalid = {
      ...validScenario,
      assets: [
        { id: 'asset1', name: 'A', type: 'database', value: 10 },
        { id: 'asset1', name: 'B', type: 'database', value: 20 },
      ],
    };
    const result = new ScenarioValidator().validate(invalid);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('Duplicate asset id'))).toBe(true);
  });

  it('detects invalid timeLimitMs', () => {
    const invalid = { ...validScenario, timeLimitMs: -5 };
    const result = new ScenarioValidator().validate(invalid);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('positive'))).toBe(true);
  });
});
