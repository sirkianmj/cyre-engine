import { describe, expect, it } from 'vitest';
import { CyberScenarioSandbox } from '../CyberScenarioSandbox.js';

const VALID_SCENARIO = {
  id: 'sandbox-valid',
  name: 'Valid Sandbox Scenario',
  description: 'Valid scenario for sandbox isolation test.',
  seed: 42,
  targetHostId: 'db',
  nodes: [
    { id: 'internet', name: 'Internet', type: 'internet' },
    { id: 'db', name: 'Database', type: 'database_server' },
  ],
  connectionLogs: [],
};

describe('CyberScenarioSandbox', () => {
  it('executes valid scenario safely', () => {
    const result = CyberScenarioSandbox.execute(JSON.stringify(VALID_SCENARIO));
    expect(result.success).toBe(true);
    expect(result.escaped).toBe(false);
    expect(result.state).toBeDefined();
  });

  it('does not escape on invalid scenario', () => {
    const invalid = { ...VALID_SCENARIO, nodes: [] };
    const result = CyberScenarioSandbox.execute(JSON.stringify(invalid));
    expect(result.success).toBe(false);
    expect(result.escaped).toBe(false);
    expect(result.error).toContain('failed security validation');
  });

  it('does not escape on malformed JSON', () => {
    const result = CyberScenarioSandbox.execute('not-json');
    expect(result.success).toBe(false);
    expect(result.escaped).toBe(false);
    expect(result.error).toContain('Invalid cyber scenario JSON');
  });
});
