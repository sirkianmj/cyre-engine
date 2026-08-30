import { describe, it, expect } from 'vitest';
import { ScenarioEditor } from '../index.js';

describe('ScenarioEditor', () => {
  it('builds a valid scenario using fluent API', () => {
    const editor = new ScenarioEditor()
      .setId('editor-scenario-1')
      .setName('Editor Generated Scenario')
      .setOrganization('Acme Corp', 'Finance')
      .addNetworkNode('internet', 'internet')
      .addNetworkNode('firewall', 'firewall')
      .addNetworkNode('employee-pc', 'client')
      .addNetworkNode('database', 'server')
      .addNetworkEdge('internet', 'firewall')
      .addNetworkEdge('firewall', 'employee-pc')
      .addNetworkEdge('employee-pc', 'database')
      .addAsset('asset1', 'Customer DB', 'database', 100)
      .addUser('user1', 'Alice', { email: 'alice@acme.com', role: 'employee' })
      .setAttacker('attacker1', 'APT42', 'Steal data', 'high')
      .setDefense(['firewall', 'antivirus'], 'basic')
      .setAttackPath('internet', 'database', ['internet', 'firewall', 'employee-pc', 'database'])
      .addEvidence('e1', 'authentication_event', 'Failed login', 'Failed login from suspicious IP', { sourceId: 'firewall', timestamp: 1000 })
      .addObjective('o1', 'Identify compromised host')
      .addTimelineEvent('t1', 'alert', 1000, { sourceId: 'firewall' })
      .setTimeLimit(600000)
      .setSeed(12345);

    const scenario = editor.build();
    expect(scenario.getId()).toBe('editor-scenario-1');
    expect(scenario.getName()).toBe('Editor Generated Scenario');
    expect(scenario.getData().network.nodes).toHaveLength(4);
    expect(scenario.getData().evidence).toHaveLength(1);
    expect(scenario.getData().objectives).toHaveLength(1);
  });

  it('throws when building invalid scenario', () => {
    const editor = new ScenarioEditor()
      .setId('bad')
      .setName('Bad')
      .setOrganization('Org')
      .addNetworkNode('a', 'host')
      .addNetworkNode('b', 'host')
      .addNetworkEdge('a', 'b')
      .setAttacker('attacker1', 'APT', 'Objective', 'low')
      // attack path missing source/target match
      .setAttackPath('a', 'b', ['a', 'b'])
      .addObjective('o1', 'Objective');

    // This should pass; to test failure, omit something essential.
    // Let's test invalid by removing attacker id.
    const invalidEditor = new ScenarioEditor()
      .setId('invalid')
      .setName('Invalid')
      .setOrganization('Org')
      .addNetworkNode('a', 'host')
      .addNetworkNode('b', 'host')
      .addNetworkEdge('a', 'b')
      .setAttacker('', 'APT', 'Objective', 'low')
      .setAttackPath('a', 'b', ['a', 'b'])
      .addObjective('o1', 'Objective');

    expect(() => invalidEditor.build()).toThrow(/validation failed/i);
  });

  it('returns raw data with getData', () => {
    const editor = new ScenarioEditor()
      .setId('scenario-x')
      .setName('X')
      .setOrganization('Org')
      .addNetworkNode('a', 'host');
    const data = editor.getData();
    expect(data.id).toBe('scenario-x');
    expect(data.network.nodes).toHaveLength(1);
  });
});
