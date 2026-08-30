import { describe, it, expect } from 'vitest';
import { ResearchDataset } from '../ResearchDataset.js';
import type { TelemetryEvent } from '../../analytics/index.js';

describe('ResearchDataset', () => {
  it('creates experiment and registers session', () => {
    const dataset = new ResearchDataset();
    dataset.createExperiment('exp-1', 'Experiment One', { description: 'Test' });
    const session = dataset.registerSession('sess-1', 'mission-001', 42, {
      participantId: 'participant-1',
      experimentId: 'exp-1',
      startTime: 0,
    });
    expect(session.scenarioId).toBe('mission-001');
    expect(session.seed).toBe(42);
    expect(session.participantId).toBe('participant-1');
    expect(session.experimentId).toBe('exp-1');
    expect(dataset.listExperiments()).toHaveLength(1);
    expect(dataset.getSessions()).toHaveLength(1);
  });

  it('throws on duplicate experiment or session', () => {
    const dataset = new ResearchDataset();
    dataset.createExperiment('exp-1', 'Exp');
    expect(() => dataset.createExperiment('exp-1', 'Duplicate')).toThrow(/already exists/);
    dataset.registerSession('sess-1', 'mission-001', 1);
    expect(() => dataset.registerSession('sess-1', 'mission-001', 1)).toThrow(/already exists/);
  });

  it('throws on invalid seed', () => {
    const dataset = new ResearchDataset();
    expect(() => dataset.registerSession('sess-1', 'mission-001', -1)).toThrow(/non-negative/);
  });

  it('throws on missing experiment for session', () => {
    const dataset = new ResearchDataset();
    expect(() =>
      dataset.registerSession('sess-1', 'mission-001', 1, { experimentId: 'missing' }),
    ).toThrow(/does not exist/);
  });

  it('adds events to session', () => {
    const dataset = new ResearchDataset();
    dataset.registerSession('sess-1', 'mission-001', 42, { startTime: 0 });
    const event: TelemetryEvent = {
      id: 'event-1',
      sessionId: 'sess-1',
      timestamp: 100,
      type: 'action',
    };
    dataset.addEvent('sess-1', event);
    expect(dataset.getSession('sess-1')!.events).toHaveLength(1);
  });

  it('completes session with valid end time', () => {
    const dataset = new ResearchDataset();
    dataset.registerSession('sess-1', 'mission-001', 42, { startTime: 100 });
    dataset.completeSession('sess-1', 200);
    expect(dataset.getSession('sess-1')!.endTime).toBe(200);
    expect(() => dataset.completeSession('sess-1', 300)).toThrow(/already completed/);
  });

  it('throws when completing session with end time before start time', () => {
    const dataset = new ResearchDataset();
    dataset.registerSession('sess-1', 'mission-001', 42, { startTime: 100 });
    expect(() => dataset.completeSession('sess-1', 50)).toThrow(/not less than start time/);
  });

  it('filters sessions by experiment', () => {
    const dataset = new ResearchDataset();
    dataset.createExperiment('exp-1', 'Exp1');
    dataset.createExperiment('exp-2', 'Exp2');
    dataset.registerSession('sess-1', 'mission-001', 1, { experimentId: 'exp-1', startTime: 0 });
    dataset.registerSession('sess-2', 'mission-002', 2, { experimentId: 'exp-2', startTime: 0 });
    expect(dataset.listSessionsForExperiment('exp-1')).toHaveLength(1);
  });

  it('exports JSON and CSV', () => {
    const dataset = new ResearchDataset();
    dataset.createExperiment('exp-1', 'Exp');
    dataset.registerSession('sess-1', 'mission-001', 42, { experimentId: 'exp-1', startTime: 0 });
    const event: TelemetryEvent = {
      id: 'event-1',
      sessionId: 'sess-1',
      timestamp: 100,
      type: 'action',
    };
    dataset.addEvent('sess-1', event);
    const json = dataset.exportJSON();
    expect(JSON.parse(json).experiments).toHaveLength(1);
    expect(JSON.parse(json).sessions).toHaveLength(1);
    const csv = dataset.exportCSV();
    expect(csv.split('\n').length).toBeGreaterThan(1);
  });

  it('clears all data', () => {
    const dataset = new ResearchDataset();
    dataset.createExperiment('exp-1', 'Exp');
    dataset.registerSession('sess-1', 'mission-001', 42, { startTime: 0 });
    dataset.clear();
    expect(dataset.listExperiments()).toEqual([]);
    expect(dataset.getSessions()).toEqual([]);
  });
});
