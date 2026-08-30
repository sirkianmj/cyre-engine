import { describe, it, expect } from 'vitest';
import {
  ExperimentRunner,
  type ExperimentDefinition,
  type ExperimentOutcomeResolver,
} from '../index.js';
import { ScenarioDefinition } from '../../scenario/index.js';

function createExperiment(): ExperimentDefinition {
  return {
    id: 'exp-runner',
    name: 'Runner Experiment',
    assignmentMethod: 'round-robin',
    baseScenarioOptions: {
      organizationSize: 'small',
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
        name: 'Treatment',
        intervention: 'additional-evidence',
        scenarioOverrides: {
          vulnerabilityLevel: 'high',
        },
      },
    ],
  };
}

const staticResolver: ExperimentOutcomeResolver = {
  completed: true,
  normalizedScore: 0.82,
  timeMs: 95000,
  penalties: 0,
};

describe('ExperimentRunner', () => {
  it('runs a single participant and records outcome, scenario, and manifest', async () => {
    const runner = new ExperimentRunner(createExperiment());
    const result = await runner.runParticipant(
      { participantId: 'p1', seed: 42 },
      staticResolver,
    );

    expect(result.experimentId).toBe('exp-runner');
    expect(result.participantId).toBe('p1');
    expect(result.assignment.assignmentMethod).toBe('round-robin');
    expect(result.scenario).toBeInstanceOf(ScenarioDefinition);
    expect(result.manifest.scenarioId).toBe(result.scenario.getId());
    expect(result.manifest.seed).toBe(42);
    expect(result.outcome.completed).toBe(true);
    expect(result.outcome.normalizedScore).toBe(0.82);
    expect(result.reproducibility.identical).toBe(true);

    expect(runner.getRunCount()).toBe(1);
    expect(runner.getCompletedCount()).toBe(1);
  });

  it('runs a batch of participants sequentially', async () => {
    const runner = new ExperimentRunner(createExperiment());
    const batch = await runner.runBatch(
      [
        { participantId: 'p1', seed: 10 },
        { participantId: 'p2', seed: 20 },
        { participantId: 'p3', seed: 30 },
      ],
      staticResolver,
    );

    expect(batch.runCount).toBe(3);
    expect(batch.completedCount).toBe(3);
    expect(batch.results).toHaveLength(3);
    expect(runner.getRunCount()).toBe(3);
  });

  it('uses a function resolver and receives run context', async () => {
    const runner = new ExperimentRunner(createExperiment());
    const seenParticipants: string[] = [];

    const resolver: ExperimentOutcomeResolver = async (context) => {
      seenParticipants.push(context.participantId);
      expect(context.experimentId).toBe('exp-runner');
      expect(context.scenario).toBeInstanceOf(ScenarioDefinition);
      expect(context.seed).toBeGreaterThan(0);
      return {
        completed: context.armId === 'treatment',
        normalizedScore: context.armId === 'treatment' ? 0.95 : 0.55,
        timeMs: 120000,
        penalties: context.armId === 'treatment' ? 0 : 1,
      };
    };

    const batch = await runner.runBatch(
      [
        { participantId: 'p1', seed: 1 },
        { participantId: 'p2', seed: 2 },
      ],
      resolver,
    );

    expect(seenParticipants).toEqual(['p1', 'p2']);
    expect(batch.results.map((result) => result.outcome.completed)).toContain(true);
    expect(batch.results.map((result) => result.outcome.completed)).toContain(false);
  });

  it('rejects duplicate participant assignments', async () => {
    const runner = new ExperimentRunner(createExperiment());
    await runner.runParticipant({ participantId: 'p1' }, staticResolver);
    await expect(
      runner.runParticipant({ participantId: 'p1' }, staticResolver),
    ).rejects.toThrow(/already assigned/);
  });

  it('rejects invalid participant input and outcome resolver', async () => {
    const runner = new ExperimentRunner(createExperiment());
    await expect(
      runner.runParticipant({ participantId: '' }, staticResolver),
    ).rejects.toThrow(/Participant id/);

    await expect(
      runner.runParticipant({ participantId: 'p1' }, {
        completed: false,
        normalizedScore: 1.5,
      }),
    ).rejects.toThrow(/normalizedScore/);
  });

  it('creates a snapshot and validates cleanly', async () => {
    const runner = new ExperimentRunner(createExperiment(), {
      name: 'Test Runner',
    });
    await runner.runBatch(
      [
        { participantId: 'p1', seed: 1 },
        { participantId: 'p2', seed: 2 },
      ],
      staticResolver,
    );

    const snapshot = runner.createSnapshot();
    expect(snapshot.name).toBe('Test Runner');
    expect(snapshot.experimentId).toBe('exp-runner');
    expect(snapshot.runCount).toBe(2);
    expect(snapshot.completedCount).toBe(2);
    expect(snapshot.assignmentCount).toBe(2);
    expect(snapshot.scenarioCount).toBe(2);
    expect(snapshot.outcomeCount).toBe(2);
    expect(snapshot.manifestCount).toBe(2);
    expect(snapshot.reproducibilityVerificationCount).toBe(2);
    expect(snapshot.summary).toContain('Test Runner');
    expect(() => runner.validate()).not.toThrow();
  });
});
