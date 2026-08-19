import { describe, it, expect } from 'vitest';
import {
  ReproducibilityManager,
} from '../index.js';
import {
  ScenarioDefinition,
  ScenarioGenerator,
} from '../../scenario/index.js';

function generatedScenario() {
  const data = new ScenarioGenerator().generate({
    organizationSize: 'small',
    networkComplexity: 'medium',
    attackerProfile: 'apt',
    vulnerabilityLevel: 'high',
    defenseLevel: 'advanced',
    objective: 'credential-theft',
    difficulty: 'medium',
    seed: 42,
  });
  return new ScenarioDefinition(data);
}

describe('ReproducibilityManager', () => {
  it('creates a manifest from scenario data', () => {
    const manager = new ReproducibilityManager();
    const scenario = generatedScenario();

    const manifest = manager.createManifest(
      {
        experimentId: 'exp-001',
        participantId: 'p1',
        armId: 'control',
        assignmentMethod: 'deterministic-hash',
        seed: 42,
        scenarioOptions: {
          organizationSize: 'small',
          networkComplexity: 'medium',
          attackerProfile: 'apt',
          vulnerabilityLevel: 'high',
          defenseLevel: 'advanced',
          objective: 'credential-theft',
          difficulty: 'medium',
        },
        scenarioId: scenario.getId(),
        scenarioName: scenario.getName(),
      },
      scenario.getData(),
    );

    expect(manifest.experimentId).toBe('exp-001');
    expect(manifest.seed).toBe(42);
    expect(manifest.checksum).toMatch(/^fnv1a-/);
    expect(manager.hasManifest(manifest.id)).toBe(true);
    expect(manager.listManifests()).toHaveLength(1);
  });

  it('verifies a manifest as identical through replay', () => {
    const manager = new ReproducibilityManager();
    const scenario = generatedScenario();
    const manifest = manager.createManifest(
      {
        experimentId: 'exp-001',
        participantId: 'p1',
        armId: 'control',
        assignmentMethod: 'deterministic-hash',
        seed: 42,
        scenarioOptions: {
          organizationSize: 'small',
          networkComplexity: 'medium',
          attackerProfile: 'apt',
          vulnerabilityLevel: 'high',
          defenseLevel: 'advanced',
          objective: 'credential-theft',
          difficulty: 'medium',
        },
        scenarioId: scenario.getId(),
        scenarioName: scenario.getName(),
      },
      scenario.getData(),
    );

    const result = manager.verifyManifest(manifest);
    expect(result.identical).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.actualChecksum).toBe(result.expectedChecksum);
  });

  it('detects a corrupted manifest checksum', () => {
    const manager = new ReproducibilityManager();
    const scenario = generatedScenario();
    const manifest = manager.createManifest(
      {
        experimentId: 'exp-001',
        participantId: 'p1',
        armId: 'control',
        assignmentMethod: 'deterministic-hash',
        seed: 42,
        scenarioOptions: {
          organizationSize: 'small',
          networkComplexity: 'medium',
          attackerProfile: 'apt',
          vulnerabilityLevel: 'high',
          defenseLevel: 'advanced',
          objective: 'credential-theft',
          difficulty: 'medium',
        },
        scenarioId: scenario.getId(),
        scenarioName: scenario.getName(),
      },
      scenario.getData(),
    );

    const corrupted = {
      ...manifest,
      checksum: 'fnv1a-deadbeef',
    };
    const result = manager.verifyManifest(corrupted);
    expect(result.identical).toBe(false);
    expect(result.errors.some((error) => error.includes('Checksum mismatch'))).toBe(true);
  });

  it('verifies directly against scenario data', () => {
    const manager = new ReproducibilityManager();
    const scenario = generatedScenario();
    const manifest = manager.createManifest(
      {
        experimentId: 'exp-001',
        participantId: 'p1',
        armId: 'control',
        assignmentMethod: 'deterministic-hash',
        seed: 42,
        scenarioOptions: {
          organizationSize: 'small',
          networkComplexity: 'medium',
          attackerProfile: 'apt',
          vulnerabilityLevel: 'high',
          defenseLevel: 'advanced',
          objective: 'credential-theft',
          difficulty: 'medium',
        },
        scenarioId: scenario.getId(),
        scenarioName: scenario.getName(),
      },
      scenario.getData(),
    );

    const result = manager.verifyManifestDirect(manifest, scenario.getData());
    expect(result.identical).toBe(true);
  });

  it('replays a scenario from a manifest', () => {
    const manager = new ReproducibilityManager();
    const scenario = generatedScenario();
    const manifest = manager.createManifest(
      {
        experimentId: 'exp-001',
        participantId: 'p1',
        armId: 'control',
        assignmentMethod: 'deterministic-hash',
        seed: 42,
        scenarioOptions: {
          organizationSize: 'small',
          networkComplexity: 'medium',
          attackerProfile: 'apt',
          vulnerabilityLevel: 'high',
          defenseLevel: 'advanced',
          objective: 'credential-theft',
          difficulty: 'medium',
        },
        scenarioId: scenario.getId(),
        scenarioName: scenario.getName(),
      },
      scenario.getData(),
    );

    const replay = manager.replayScenario(manifest);
    expect(replay).toBeInstanceOf(ScenarioDefinition);
    expect(replay.getId()).toBe(scenario.getId());
    expect(replay.getName()).toBe(scenario.getName());
  });

  it('rejects invalid manifest input', () => {
    const manager = new ReproducibilityManager();
    const scenario = generatedScenario();
    expect(() =>
      manager.createManifest(
        {
          experimentId: '',
          participantId: 'p1',
          armId: 'control',
          assignmentMethod: 'deterministic-hash',
          seed: 42,
          scenarioOptions: {
            organizationSize: 'small',
            networkComplexity: 'medium',
            attackerProfile: 'apt',
            vulnerabilityLevel: 'high',
            defenseLevel: 'advanced',
            objective: 'credential-theft',
            difficulty: 'medium',
          },
          scenarioId: scenario.getId(),
          scenarioName: scenario.getName(),
        },
        scenario.getData(),
      ),
    ).toThrow(/experiment id/);
  });

  it('rejects scenario id mismatch on manifest creation', () => {
    const manager = new ReproducibilityManager();
    const scenario = generatedScenario();
    expect(() =>
      manager.createManifest(
        {
          experimentId: 'exp-001',
          participantId: 'p1',
          armId: 'control',
          assignmentMethod: 'deterministic-hash',
          seed: 42,
          scenarioOptions: {
            organizationSize: 'small',
            networkComplexity: 'medium',
            attackerProfile: 'apt',
            vulnerabilityLevel: 'high',
            defenseLevel: 'advanced',
            objective: 'credential-theft',
            difficulty: 'medium',
          },
          scenarioId: 'wrong-id',
          scenarioName: scenario.getName(),
        },
        scenario.getData(),
      ),
    ).toThrow(/Scenario id mismatch/);
  });

  it('creates snapshots and validates cleanly', () => {
    const manager = new ReproducibilityManager('Test Reproducibility');
    const scenario = generatedScenario();
    const manifest = manager.createManifest(
      {
        experimentId: 'exp-001',
        participantId: 'p1',
        armId: 'control',
        assignmentMethod: 'deterministic-hash',
        seed: 42,
        scenarioOptions: {
          organizationSize: 'small',
          networkComplexity: 'medium',
          attackerProfile: 'apt',
          vulnerabilityLevel: 'high',
          defenseLevel: 'advanced',
          objective: 'credential-theft',
          difficulty: 'medium',
        },
        scenarioId: scenario.getId(),
        scenarioName: scenario.getName(),
      },
      scenario.getData(),
    );
    manager.verifyManifest(manifest);

    const snapshot = manager.createSnapshot();
    expect(snapshot.name).toBe('Test Reproducibility');
    expect(snapshot.manifestCount).toBe(1);
    expect(snapshot.verificationCount).toBe(1);
    expect(snapshot.manifestIds).toContain(manifest.id);
    expect(snapshot.summary).toContain('Test Reproducibility');
    expect(() => manager.validate()).not.toThrow();
  });
});
