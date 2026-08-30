import { describe, it, expect } from 'vitest';
import { SchemaRegistry } from '../SchemaRegistry.js';
import { CyreSerializer } from '../CyreSerializer.js';
import { ScenarioSerializer } from '../ScenarioSerializer.js';
import { ProjectSerializer, type CyreProjectData } from '../ProjectSerializer.js';
import { ScenarioEditor, ScenarioDefinition } from '../../scenario/index.js';

function createScenario(): ScenarioDefinition {
  return new ScenarioEditor()
    .setId('serial-test')
    .setName('Serialization Test Scenario')
    .setOrganization('Test Org', 'Technology')
    .addNetworkNode('internet', 'internet')
    .addNetworkNode('host', 'client')
    .addNetworkEdge('internet', 'host')
    .addAsset('asset1', 'Test Asset', 'server', 100)
    .addUser('user1', 'Test User')
    .setAttacker('attacker1', 'Test Attacker', 'Test objective', 'low')
    .setDefense([], 'basic')
    .setAttackPath('internet', 'host', ['internet', 'host'])
    .addEvidence('e1', 'log', 'Test Evidence', 'Evidence description')
    .addObjective('o1', 'Identify test objective')
    .addTimelineEvent('t1', 'event', 100, { sourceId: 'host' })
    .setTimeLimit(600000)
    .setSeed(42)
    .build();
}

function createProject(): CyreProjectData {
  return {
    id: 'project-test',
    name: 'Test Cyber Project',
    description: 'A project used to verify CYRE serialization.',
    scenarioIds: ['serial-test'],
    missionIds: ['mission-001'],
    engineVersion: '1.0.0',
    settings: {
      theme: 'dark',
    },
  };
}

describe('SchemaRegistry', () => {
  it('registers and retrieves a schema', () => {
    const registry = new SchemaRegistry();
    registry.register({
      name: 'test.schema',
      latestVersion: 1,
      validate: () => [],
    });
    expect(registry.has('test.schema')).toBe(true);
    expect(registry.getLatestVersion('test.schema')).toBe(1);
  });

  it('rejects duplicate schema registration', () => {
    const registry = new SchemaRegistry();
    registry.register({ name: 'dup.schema', latestVersion: 1, validate: () => [] });
    expect(() => {
      registry.register({ name: 'dup.schema', latestVersion: 1, validate: () => [] });
    }).toThrow(/already registered/);
  });

  it('rejects an invalid latest version', () => {
    const registry = new SchemaRegistry();
    expect(() => {
      registry.register({ name: 'bad.schema', latestVersion: 0, validate: () => [] });
    }).toThrow(/positive integer/);
  });

  it('migrates through registered versions', () => {
    const registry = new SchemaRegistry();
    registry.register({
      name: 'migratable.schema',
      latestVersion: 2,
      validate: () => [],
      migrate: (_oldVersion, data) => {
        const record = data as Record<string, unknown>;
        return {
          version: 2,
          data: { ...record, migrated: true },
        };
      },
    });

    const result = registry.migrateToLatest('migratable.schema', 1, { value: 42 });
    expect(result.version).toBe(2);
    expect((result.data as Record<string, unknown>).migrated).toBe(true);
  });
});

describe('CyreSerializer', () => {
  it('serializes and deserializes a versioned envelope', () => {
    const registry = new SchemaRegistry();
    registry.register({
      name: 'cyre.test',
      latestVersion: 1,
      validate: (data) => {
        if (!data || typeof data !== 'object') return ['test data must be an object'];
        return [];
      },
    });

    const serializer = new CyreSerializer(registry);
    const json = serializer.serialize('cyre.test', 'unit-test', { value: 42 });
    const result = serializer.deserialize<{ value: number }>(json);

    expect(result.data.value).toBe(42);
    expect(result.envelope.schema).toBe('cyre.test');
    expect(result.envelope.version).toBe(1);
    expect(result.envelope.id).toBe('unit-test');
  });

  it('rejects invalid JSON', () => {
    const serializer = new CyreSerializer();
    expect(() => serializer.deserialize('{not-json')).toThrow(/valid JSON/);
  });

  it('rejects an unsupported schema version', () => {
    const registry = new SchemaRegistry();
    registry.register({
      name: 'cyre.test',
      latestVersion: 1,
      validate: () => [],
    });
    const serializer = new CyreSerializer(registry);
    const envelope = {
      schema: 'cyre.test',
      version: 99,
      id: 'test',
      metadata: { createdAt: '2026-08-18T00:00:00.000Z' },
      data: { value: 1 },
    };
    expect(() => serializer.deserialize(JSON.stringify(envelope))).toThrow(/exceeds supported version/);
  });
});

describe('ScenarioSerializer', () => {
  it('round-trips a scenario definition', () => {
    const serializer = new ScenarioSerializer();
    const scenario = createScenario();
    const json = serializer.serialize(scenario);
    const restored = serializer.deserialize(json);

    expect(restored.getId()).toBe(scenario.getId());
    expect(restored.getName()).toBe(scenario.getName());
    expect(restored.getData()).toEqual(scenario.getData());
  });

  it('preserves deterministic scenario seed through serialization', () => {
    const serializer = new ScenarioSerializer();
    const scenario = createScenario();
    const json = serializer.serialize(scenario);
    const restored = serializer.deserialize(json);
    expect(restored.getData().seed).toBe(42);
  });

  it('rejects invalid scenario data during deserialization', () => {
    const serializer = new ScenarioSerializer();
    const envelope = {
      schema: 'cyre.scenario',
      version: 1,
      id: 'bad-scenario',
      metadata: { createdAt: '2026-08-18T00:00:00.000Z' },
      data: {
        id: 'bad-scenario',
        name: 'Bad Scenario',
      },
    };
    expect(() => serializer.deserialize(JSON.stringify(envelope))).toThrow(/validation failed/);
  });
});

describe('ProjectSerializer', () => {
  it('round-trips a project', () => {
    const serializer = new ProjectSerializer();
    const project = createProject();
    const json = serializer.serialize(project);
    const restored = serializer.deserialize(json);

    expect(restored).toEqual(project);
  });

  it('rejects invalid project data', () => {
    const serializer = new ProjectSerializer();
    const envelope = {
      schema: 'cyre.project',
      version: 1,
      id: 'bad-project',
      metadata: { createdAt: '2026-08-18T00:00:00.000Z' },
      data: {
        id: 'bad-project',
        name: 'Bad Project',
      },
    };
    expect(() => serializer.deserialize(JSON.stringify(envelope))).toThrow(/scenarioIds/);
  });
});
