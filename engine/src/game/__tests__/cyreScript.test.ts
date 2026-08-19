import { describe, it, expect } from 'vitest';
import { CyreScriptBuilder } from '../CyreScriptBuilder.js';
import { CyreScript } from '../CyreScript.js';
import { CyreScriptRegistry } from '../CyreScriptRegistry.js';
import { CyreScriptEngine } from '../CyreScriptEngine.js';
import { ScenarioDefinition } from '../../scenario/index.js';

function buildScript(): CyreScript {
  return new CyreScriptBuilder()
    .withId('script-credential-theft')
    .withName('Credential Theft Investigation')
    .withDescription('Investigate anomalous VPN authentication.')
    .withOrganization('Acme Healthcare', 'Healthcare')
    .addNetworkNode('internet', 'external')
    .addNetworkNode('vpn', 'vpn-gateway')
    .addNetworkNode('employee-pc', 'workstation')
    .addNetworkNode('database', 'database-server')
    .addNetworkEdge('internet', 'vpn', 'connects')
    .addNetworkEdge('vpn', 'employee-pc', 'connects')
    .addNetworkEdge('employee-pc', 'database', 'connects')
    .addAsset({
      id: 'database-asset',
      name: 'Patient Database',
      type: 'database',
      value: 100,
      metadata: { compliance: 'hipaa' },
    })
    .addUser({
      id: 'user-alice',
      name: 'Alice Johnson',
      email: 'alice.johnson@acme.example',
      role: 'Finance',
      accounts: ['alice'],
    })
    .setAttacker({
      id: 'attacker-1',
      name: 'Threat Actor',
      objective: 'Access sensitive database',
      sophistication: 'advanced',
    })
    .setDefense(['siem', 'firewall'], 'basic')
    .setAttackPath('internet', 'database', ['internet', 'vpn', 'employee-pc', 'database'])
    .addEvidence({
      id: 'evidence-vpn',
      type: 'authentication_event',
      title: 'VPN authentication',
      description: 'Anomalous VPN authentication at 03:17.',
      sourceId: 'vpn',
      timestamp: 1710000000000,
      data: { attempts: 5 },
    })
    .addObjective('obj-identify', 'Identify compromised account')
    .addObjective('obj-contain', 'Contain employee workstation')
    .addTimelineEvent({
      id: 'event-1',
      type: 'anomalous-auth',
      timestamp: 1710000000000,
      sourceId: 'vpn',
      targetId: 'employee-pc',
      data: { severity: 'high' },
    })
    .setTimeLimit(600000)
    .setSeed(42)
    .buildScript();
}

describe('CyreScriptBuilder', () => {
  it('builds a valid script', () => {
    const script = buildScript();
    expect(script.getId()).toBe('script-credential-theft');
    expect(script.getName()).toBe('Credential Theft Investigation');
    expect(script.getDefinition().objectives).toHaveLength(2);
  });

  it('rejects missing required fields', () => {
    expect(() => new CyreScriptBuilder().build()).toThrow(/attacker is required/);
  });

  it('rejects duplicate IDs inside script validation', () => {
    const builder = new CyreScriptBuilder()
      .withId('dup')
      .withName('Duplicate')
      .withOrganization('Org')
      .addNetworkNode('node', 'type')
      .addNetworkNode('node', 'type')
      .setAttacker({ id: 'a', name: 'A', objective: 'O', sophistication: 'low' })
      .setAttackPath('node', 'node', ['node', 'node'])
      .addObjective('obj', 'desc')
      .addObjective('obj', 'desc');

    expect(() => builder.build()).toThrow(/Duplicate/);
  });

  it('rejects attack path missing network node references', () => {
    const builder = new CyreScriptBuilder()
      .withId('bad-path')
      .withName('Bad Path')
      .withOrganization('Org')
      .addNetworkNode('node-a', 'type')
      .addNetworkNode('node-b', 'type')
      .setAttacker({ id: 'a', name: 'A', objective: 'O', sophistication: 'low' })
      .setAttackPath('node-a', 'node-b', ['node-a', 'missing'])
      .addObjective('obj', 'desc');

    expect(() => builder.build()).toThrow(/missing network node/);
  });
});

describe('CyreScript', () => {
  it('creates scenario definition', () => {
    const script = buildScript();
    const scenario = script.toScenarioDefinition();
    expect(scenario).toBeInstanceOf(ScenarioDefinition);
    expect(scenario.getId()).toBe('script-credential-theft');
    expect(scenario.getName()).toBe('Credential Theft Investigation');
    expect(scenario.getData().organization.name).toBe('Acme Healthcare');
    expect(scenario.getData().attackPath.path).toEqual([
      'internet',
      'vpn',
      'employee-pc',
      'database',
    ]);
  });

  it('clones definition and JSON round-trips', () => {
    const script = buildScript();
    const definition = script.getDefinition();
    definition.objectives.push({ id: 'extra', description: 'Extra' });
    expect(script.getDefinition().objectives).toHaveLength(2);

    const restored = CyreScript.fromJSON(script.toJSON());
    expect(restored.getId()).toBe(script.getId());
    expect(restored.toScenarioDefinition().getId()).toBe(script.getId());
  });
});

describe('CyreScriptRegistry', () => {
  it('registers and retrieves scripts with deep copies', () => {
    const registry = new CyreScriptRegistry();
    const script = buildScript();
    registry.register(script);
    expect(registry.has(script.getId())).toBe(true);

    const retrieved = registry.get(script.getId())!;
    retrieved.getDefinition().name = 'Changed';
    expect(registry.get(script.getId())!.getName()).toBe('Credential Theft Investigation');
  });

  it('rejects duplicate registration and missing unregister', () => {
    const registry = new CyreScriptRegistry();
    const script = buildScript();
    registry.register(script);
    expect(() => registry.register(script)).toThrow(/already registered/);
    expect(() => registry.unregister('missing')).toThrow(/does not exist/);
  });

  it('round-trips through JSON', () => {
    const registry = new CyreScriptRegistry();
    registry.register(buildScript());
    const restored = CyreScriptRegistry.fromJSON(registry.toJSON());
    expect(restored.has('script-credential-theft')).toBe(true);
    expect(restored.list()).toHaveLength(1);
  });
});

describe('CyreScriptEngine', () => {
  it('builds scenario and mission runner from script', () => {
    const registry = new CyreScriptRegistry();
    registry.register(buildScript());
    const engine = new CyreScriptEngine(registry);

    const scenario = engine.buildScenario('script-credential-theft');
    expect(scenario).toBeInstanceOf(ScenarioDefinition);

    const missionRunner = engine.createMissionRunner('script-credential-theft');
    expect(missionRunner.mission.id).toBe('mission-script-credential-theft');
  });

  it('accepts a script instance directly', () => {
    const registry = new CyreScriptRegistry();
    const engine = new CyreScriptEngine(registry);
    const script = buildScript();
    expect(engine.buildScenario(script).getId()).toBe('script-credential-theft');
  });

  it('throws for missing script id', () => {
    const registry = new CyreScriptRegistry();
    const engine = new CyreScriptEngine(registry);
    expect(() => engine.buildScenario('missing')).toThrow(/not registered/);
  });
});
