import { describe, it, expect } from 'vitest';
import {
  ResearchDashboard,
  ResearchDataset,
} from '../index.js';

function createDataset(): ResearchDataset {
  const dataset = new ResearchDataset();
  dataset.createExperiment('exp-1', 'Experiment One', { createdAt: 1000 });
  dataset.createExperiment('exp-2', 'Experiment Two', { createdAt: 2000 });

  dataset.registerSession('session-1', 'scenario-a', 42, {
    participantId: 'p1',
    experimentId: 'exp-1',
    startTime: 1000,
  });
  dataset.registerSession('session-2', 'scenario-a', 43, {
    participantId: 'p2',
    experimentId: 'exp-1',
    startTime: 2000,
  });
  dataset.registerSession('session-3', 'scenario-b', 44, {
    participantId: 'p3',
    experimentId: 'exp-2',
    startTime: 3000,
  });

  dataset.addEvent('session-1', {
    id: 'event-1',
    sessionId: 'session-1',
    timestamp: 1100,
    type: 'evidence:view',
    evidenceViewed: true,
    responseTimeMs: 5000,
    decision: 'review-evidence',
    investigationPath: ['a', 'b', 'c'],
    success: true,
    failure: false,
  });
  dataset.addEvent('session-1', {
    id: 'event-2',
    sessionId: 'session-1',
    timestamp: 1200,
    type: 'decision:contain',
    decision: 'isolate',
    responseTimeMs: 9000,
    investigationPath: ['a', 'b'],
    success: true,
    failure: false,
  });
  dataset.addEvent('session-1', {
    id: 'event-3',
    sessionId: 'session-1',
    timestamp: 1300,
    type: 'error:timeout',
    responseTimeMs: 12000,
    failure: true,
  });

  dataset.addEvent('session-2', {
    id: 'event-4',
    sessionId: 'session-2',
    timestamp: 2100,
    type: 'evidence:view',
    evidenceViewed: true,
    responseTimeMs: 2500,
    decision: 'review-evidence',
    investigationPath: ['a', 'b'],
    success: true,
    failure: false,
  });
  dataset.addEvent('session-2', {
    id: 'event-5',
    sessionId: 'session-2',
    timestamp: 2200,
    type: 'mission:start',
    responseTimeMs: 1000,
    decision: 'start',
    success: true,
    failure: false,
  });

  dataset.addEvent('session-3', {
    id: 'event-6',
    sessionId: 'session-3',
    timestamp: 3100,
    type: 'evidence:view',
    evidenceViewed: false,
    evidenceIgnored: true,
    responseTimeMs: 7000,
    decision: 'ignore-evidence',
    failure: true,
  });

  dataset.completeSession('session-1', 1500);
  dataset.completeSession('session-2', 2500);
  return dataset;
}

describe('ResearchDashboard', () => {
  it('creates a full dashboard snapshot', () => {
    const dashboard = new ResearchDashboard(createDataset());
    const snapshot = dashboard.createSnapshot();

    expect(snapshot.experimentCount).toBe(2);
    expect(snapshot.sessionCount).toBe(3);
    expect(snapshot.participantCount).toBe(3);
    expect(snapshot.completedSessionCount).toBe(2);
    expect(snapshot.completionRate).toBeCloseTo(2 / 3, 2);
    expect(snapshot.eventCount).toBe(6);
    expect(snapshot.summary).toContain('CYRE Research Dashboard');
  });

  it('calculates response time statistics', () => {
    const dashboard = new ResearchDashboard(createDataset());
    const stats = dashboard.calculateResponseTimeStats();
    expect(stats.count).toBe(6);
    expect(stats.minMs).toBe(1000);
    expect(stats.maxMs).toBe(12000);
    expect(stats.averageMs).toBeGreaterThan(0);
    expect(stats.totalMs).toBe(36500);
  });

  it('calculates decision and event type counts', () => {
    const dashboard = new ResearchDashboard(createDataset());
    const decisions = dashboard.getDecisionCounts();
    expect(decisions).toMatchObject({
      'review-evidence': 2,
      'isolate': 1,
      'start': 1,
      'ignore-evidence': 1,
    });

    const types = dashboard.getEventTypeCounts();
    expect(types).toMatchObject({
      'evidence:view': 3,
      'decision:contain': 1,
      'error:timeout': 1,
      'mission:start': 1,
    });
  });

  it('summarizes errors and outcome counts', () => {
    const dashboard = new ResearchDashboard(createDataset());
    const snapshot = dashboard.createSnapshot();
    const errors = snapshot.errorSummary;
    expect(errors.totalErrors).toBe(2);
    expect(errors.errorEventTypes).toContain('error:timeout');
    expect(snapshot.failureCount).toBe(2);
    expect(snapshot.successCount).toBe(4);
    expect(snapshot.evidenceViewedCount).toBe(2);
    expect(snapshot.evidenceIgnoredCount).toBe(1);
  });

  it('computes scenario performance', () => {
    const dashboard = new ResearchDashboard(createDataset());
    const performance = dashboard.getScenarioPerformance();
    expect(performance).toHaveLength(2);

    const scenarioA = performance.find((entry) => entry.scenarioId === 'scenario-a')!;
    expect(scenarioA.sessionCount).toBe(2);
    expect(scenarioA.completedSessions).toBe(2);
    expect(scenarioA.completionRate).toBe(1);
    expect(scenarioA.eventCount).toBe(5);
    expect(scenarioA.averageEventsPerSession).toBe(2.5);

    const scenarioB = performance.find((entry) => entry.scenarioId === 'scenario-b')!;
    expect(scenarioB.sessionCount).toBe(1);
    expect(scenarioB.completedSessions).toBe(0);
    expect(scenarioB.completionRate).toBe(0);
  });

  it('computes investigation path summary', () => {
    const dashboard = new ResearchDashboard(createDataset());
    const pathSummary = dashboard.getInvestigationPathSummary();

    expect(pathSummary.totalPaths).toBe(3);
    expect(pathSummary.uniquePaths).toBe(2);
    expect(pathSummary.longestPathLength).toBe(3);
    expect(pathSummary.averagePathLength).toBeCloseTo(7 / 3, 2);
    expect(pathSummary.sessionsWithPaths).toBe(2);
    expect(pathSummary.commonPaths[0]).toBe('a|b');
  });

  it('rejects invalid dataset instance', () => {
    expect(() => new ResearchDashboard({} as any)).toThrow(/ResearchDataset/);
  });

  it('validates cleanly', () => {
    const dashboard = new ResearchDashboard(createDataset(), 'Test Dashboard');
    expect(() => dashboard.validate()).not.toThrow();
    const toJson = dashboard.toJSON();
    const snapshot = dashboard.createSnapshot();
    expect({ ...toJson, generatedAt: 0 }).toEqual({ ...snapshot, generatedAt: 0 });
  });
});
