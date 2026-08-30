import { describe, expect, it } from 'vitest';
import { CyberSimulation } from '../../cyber/simulation/index.js';
import type { CyberSimulationReplay } from '../../cyber/simulation/index.js';
import { deserializeCyberScenarioDefinition } from '../../cyber/index.js';

describe('migration compatibility', () => {
  it('loads replay from older engine version 1.0.0', () => {
    const oldReplay: CyberSimulationReplay = {
      formatVersion: 1,
      engineVersion: '1.0.0',
      scenarioId: 'cyber-lab',
      seed: 12345,
      actions: [
        { method: 'runRecon' },
        { method: 'discoverServices' },
        { method: 'exploitWebServer' },
      ],
    };
    const sim = CyberSimulation.replay(oldReplay);
    expect(sim.getState().hosts['web-server'].compromised).toBe(true);
  });

  it('loads scenario definition from older schema without description/seed', () => {
    const oldScenario = {
      id: 'legacy-scenario',
      name: 'Legacy Scenario',
      targetHostId: 'db',
      nodes: [
        { id: 'internet', name: 'Internet', type: 'internet' },
        { id: 'db', name: 'Database', type: 'database_server' },
      ],
      connectionLogs: [],
    };
    const parsed = deserializeCyberScenarioDefinition(JSON.stringify(oldScenario));
    expect(parsed.id).toBe('legacy-scenario');
    expect(parsed.nodes).toHaveLength(2);
  });
});
