import { describe, it, expect } from 'vitest';
import {
  ExperimentalScenarioFramework,
  type ExperimentDefinition,
} from '../index.js';
import { ScenarioDefinition, ScenarioValidator } from '../../scenario/index.js';

function createExperiment(): ExperimentDefinition {
  return {
    id: 'exp-001',
    name: 'Credential Theft Experiment',
    description: 'Study effect of additional evidence on investigation accuracy.',
    assignmentMethod: 'deterministic-hash',
    baseScenarioOptions: {
      organizationSize: 'medium',
      networkComplexity: 'medium',
      attackerProfile: 'apt',
      vulnerabilityLevel: 'high',
      defenseLevel: 'advanced',
      objective: 'credential-theft',
      difficulty: 'medium',
    },
    arms: [
      {
        id: 'control',
        name: 'Control',
        intervention: 'none',
      },
      {
        id: 'treatment',
        name: 'Additional Evidence',
        intervention: 'additional-evidence',
        scenarioOverrides: {
          vulnerabilityLevel: 'high',
          attackerProfile: 'apt',
        },
      },
    ],
  };
}

describe('ExperimentalScenarioFramework', () => {
  it('registers an experiment with valid arms', () => {
    const framework = new ExperimentalScenarioFramework();
    framework.registerExperiment(createExperiment());
    expect(framework.hasExperiment('exp-001')).toBe(true);
    expect(framework.listExperimentIds()).toEqual(['exp-001']);
    expect(framework.getExperiment('exp-001')!.arms).toHaveLength(2);
  });

  it('rejects invalid experiment definitions', () => {
    const framework = new ExperimentalScenarioFramework();
    expect(() => framework.registerExperiment({
      id: '',
      name: 'X',
      assignmentMethod: 'deterministic-hash',
      baseScenarioOptions: {
        organizationSize: 'small',
        networkComplexity: 'low',
        attackerProfile: 'apt',
        vulnerabilityLevel: 'medium',
        defenseLevel: 'basic',
        objective: 'credential-theft',
        difficulty: 'easy',
      },
      arms: [{ id: 'a', name: 'A' }],
    })).toThrow(/Experiment id/);

    expect(() => framework.registerExperiment({
      id: 'exp',
      name: 'X',
      assignmentMethod: 'invalid' as any,
      baseScenarioOptions: {
        organizationSize: 'small',
        networkComplexity: 'low',
        attackerProfile: 'apt',
        vulnerabilityLevel: 'medium',
        defenseLevel: 'basic',
        objective: 'credential-theft',
        difficulty: 'easy',
      },
      arms: [{ id: 'a', name: 'A' }],
    })).toThrow(/assignment method/);

    expect(() => framework.registerExperiment({
      id: 'exp',
      name: 'X',
      assignmentMethod: 'round-robin',
      baseScenarioOptions: {
        organizationSize: 'small',
        networkComplexity: 'low',
        attackerProfile: 'apt',
        vulnerabilityLevel: 'medium',
        defenseLevel: 'basic',
        objective: 'credential-theft',
        difficulty: 'easy',
      },
      arms: [],
    })).toThrow(/at least one arm/);
  });

  it('assigns participants deterministically with hash method', () => {
    const frameworkA = new ExperimentalScenarioFramework();
    const frameworkB = new ExperimentalScenarioFramework();
    frameworkA.registerExperiment(createExperiment());
    frameworkB.registerExperiment(createExperiment());

    const assignmentA = frameworkA.assignParticipant('exp-001', 'participant-a');
    const assignmentB = frameworkB.assignParticipant('exp-001', 'participant-a');

    expect(assignmentA.assignmentMethod).toBe('deterministic-hash');
    expect(assignmentB.assignmentMethod).toBe('deterministic-hash');
    expect(assignmentA.armId).toBe(assignmentB.armId);
    expect(assignmentA.seed).toBe(assignmentB.seed);

    expect(frameworkA.getAssignment('exp-001', 'participant-a')).toEqual(assignmentA);
    expect(frameworkA.listAssignments('exp-001')).toHaveLength(1);
  });

  it('rejects duplicate participant assignment', () => {
    const framework = new ExperimentalScenarioFramework();
    framework.registerExperiment(createExperiment());
    framework.assignParticipant('exp-001', 'participant-a');
    expect(() => framework.assignParticipant('exp-001', 'participant-a')).toThrow(/already assigned/);
  });

  it('assigns participants round-robin', () => {
    const framework = new ExperimentalScenarioFramework();
    const experiment = createExperiment();
    framework.registerExperiment({
      ...experiment,
      assignmentMethod: 'round-robin',
    });

    const p1 = framework.assignParticipant('exp-001', 'p1');
    const p2 = framework.assignParticipant('exp-001', 'p2');
    const p3 = framework.assignParticipant('exp-001', 'p3');

    expect(p1.armId).toBe('control');
    expect(p2.armId).toBe('treatment');
    expect(p3.armId).toBe('control');
    expect(framework.getArmAssignmentCount('exp-001', 'control')).toBe(2);
    expect(framework.getArmAssignmentCount('exp-001', 'treatment')).toBe(1);
  });

  it('creates validated scenarios for assigned participants', () => {
    const framework = new ExperimentalScenarioFramework();
    framework.registerExperiment(createExperiment());
    framework.assignParticipant('exp-001', 'p1', { seed: 42 });

    const record = framework.createScenarioForParticipant('exp-001', 'p1');
    expect(record.scenario).toBeInstanceOf(ScenarioDefinition);

    const scenario = framework.getScenarioForParticipant('exp-001', 'p1')!;
    const validation = new ScenarioValidator().validate(scenario.getData());
    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('reuses existing scenario and assignment', () => {
    const framework = new ExperimentalScenarioFramework();
    framework.registerExperiment(createExperiment());
    framework.assignParticipant('exp-001', 'p1', { seed: 42 });

    const first = framework.createScenarioForParticipant('exp-001', 'p1');
    const second = framework.createScenarioForParticipant('exp-001', 'p1');
    expect(second.generatedAt).toBe(first.generatedAt);
    expect(second.scenario).toBe(first.scenario);
  });

  it('throws when creating scenario without assignment', () => {
    const framework = new ExperimentalScenarioFramework();
    framework.registerExperiment(createExperiment());
    expect(() =>
      framework.createScenarioForParticipant('exp-001', 'missing'),
    ).toThrow(/not assigned/);
  });

  it('records outcomes and validates arm consistency', () => {
    const framework = new ExperimentalScenarioFramework();
    framework.registerExperiment(createExperiment());
    const assignment = framework.assignParticipant('exp-001', 'p1', { seed: 7 });

    framework.recordOutcome({
      experimentId: 'exp-001',
      participantId: 'p1',
      armId: assignment.armId,
      completed: true,
      normalizedScore: 0.88,
      timeMs: 120000,
      penalties: 0,
      recordedAt: 1000,
    });

    const outcome = framework.getOutcome('exp-001', 'p1')!;
    expect(outcome.completed).toBe(true);
    expect(outcome.normalizedScore).toBe(0.88);
    expect(() =>
      framework.recordOutcome({
        experimentId: 'exp-001',
        participantId: 'p1',
        armId: 'wrong-arm',
        completed: true,
        normalizedScore: 0.5,
        recordedAt: 1000,
      }),
    ).toThrow(/does not match assigned arm/);
  });

  it('creates a snapshot and validates cleanly', () => {
    const framework = new ExperimentalScenarioFramework('Test Framework');
    framework.registerExperiment(createExperiment());
    framework.assignParticipant('exp-001', 'p1', { seed: 1 });
    framework.createScenarioForParticipant('exp-001', 'p1');
    framework.recordOutcome({
      experimentId: 'exp-001',
      participantId: 'p1',
      armId: framework.getAssignment('exp-001', 'p1')!.armId,
      completed: true,
      normalizedScore: 0.7,
      recordedAt: 1000,
    });

    const snapshot = framework.createSnapshot();
    expect(snapshot.name).toBe('Test Framework');
    expect(snapshot.experimentCount).toBe(1);
    expect(snapshot.armCount).toBe(2);
    expect(snapshot.assignmentCount).toBe(1);
    expect(snapshot.scenarioCount).toBe(1);
    expect(snapshot.outcomeCount).toBe(1);
    expect(snapshot.summary).toContain('Test Framework');
    expect(() => framework.validate()).not.toThrow();
  });

  it('throws for missing experiment operations', () => {
    const framework = new ExperimentalScenarioFramework();
    expect(() => framework.assignParticipant('missing', 'p1')).toThrow(/does not exist/);
    expect(() => framework.listAssignments('missing')).toThrow(/does not exist/);
    expect(() => framework.unregisterExperiment('missing')).toThrow(/does not exist/);
  });
});
