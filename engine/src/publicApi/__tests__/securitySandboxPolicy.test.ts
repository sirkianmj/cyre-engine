import { describe, expect, it } from 'vitest';
import { SecuritySandboxPolicy } from '../SecuritySandboxPolicy.js';
import { CyberScenarioSandbox } from '../CyberScenarioSandbox.js';

describe('SecuritySandboxPolicy', () => {
  it('accepts a valid scenario input shape', () => {
    expect(
      SecuritySandboxPolicy.validateScenarioInput({
        id: 'scenario-1',
        name: 'Safe Scenario',
        nodes: [{ id: 'node-1' }],
      }),
    ).toEqual([]);
  });

  it('rejects invalid scenario input shapes', () => {
    const violations = SecuritySandboxPolicy.validateScenarioInput({
      id: '',
      name: '',
      nodes: [],
    });
    expect(violations.length).toBeGreaterThan(0);
  });

  it('throws on insecure scenario input', () => {
    expect(() =>
      SecuritySandboxPolicy.assertSecureScenario({
        id: 'bad',
        name: 'Bad',
        nodes: [],
      }),
    ).toThrowError(/failed security validation/i);
  });

  it('rejects prototype pollution keys', () => {
    const maliciousJson = '{"id":"pollution","name":"Pollution Test","targetHostId":"db","nodes":[{"id":"internet","name":"Internet","type":"internet"},{"id":"db","name":"Database","type":"database_server"}],"connectionLogs":[],"__proto__":{"polluted":true}}';
    const result = CyberScenarioSandbox.execute(maliciousJson);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Dangerous key');
  });
});
