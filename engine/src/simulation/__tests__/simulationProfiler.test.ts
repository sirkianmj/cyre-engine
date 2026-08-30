import { describe, it, expect } from 'vitest';
import { SimulationProfiler } from '../SimulationProfiler.js';

describe('SimulationProfiler', () => {
  it('tracks simulation runs', () => {
    let now = 100;
    const profiler = new SimulationProfiler({ now: () => now });

    now = 100;
    profiler.beginRun();
    now = 150;
    const duration = profiler.endRun();

    expect(duration).toBe(50);
    expect(profiler.createSnapshot().runCount).toBe(1);
    expect(profiler.createSnapshot().lastRunDurationMs).toBe(50);
  });

  it('records ticks and aggregate tick duration', () => {
    const profiler = new SimulationProfiler({ now: () => 0 });
    profiler.recordTick(5, { phase: 'update' });
    profiler.recordTick(10, { phase: 'render' });

    const snapshot = profiler.createSnapshot();
    expect(snapshot.tickCount).toBe(2);
    expect(snapshot.totalTickDurationMs).toBe(15);
    expect(snapshot.eventKindCounts.tick).toBe(2);
  });

  it('tracks entity changes with current and peak counts', () => {
    const profiler = new SimulationProfiler({ now: () => 0 });
    profiler.recordEntityChange('host', 3);
    profiler.recordEntityChange('host', -1);
    profiler.recordEntityChange('host', 5);
    profiler.recordEntityChange('account', 2);

    const host = profiler.getEntityCounter('host')!;
    expect(host).toMatchObject({
      type: 'host',
      added: 8,
      removed: 1,
      current: 7,
      peak: 7,
    });

    expect(profiler.getEntityCounter('account')).toMatchObject({
      type: 'account',
      added: 2,
      removed: 0,
      current: 2,
      peak: 2,
    });
  });

  it('rejects negative entity count and invalid delta', () => {
    const profiler = new SimulationProfiler();
    profiler.recordEntityChange('host', 1);
    expect(() => profiler.recordEntityChange('host', -2)).toThrow(/negative/);
    expect(() => profiler.recordEntityChange('host', 1.5)).toThrow(/integer/);
  });

  it('tracks queue depth current and peak', () => {
    const profiler = new SimulationProfiler();
    profiler.recordQueueDepth(5);
    profiler.recordQueueDepth(20);
    profiler.recordQueueDepth(8);

    expect(profiler.getQueueDepth()).toEqual({ current: 8, peak: 20 });
  });

  it('tracks network traversal metrics', () => {
    const profiler = new SimulationProfiler();
    profiler.recordNetworkTraversal('shortest-path', 15, 4, 3);
    profiler.recordNetworkTraversal('path-exists', 4, 2, 1);

    const snapshot = profiler.createSnapshot();
    expect(snapshot.networkTraversals).toEqual({
      count: 2,
      totalVisitedNodes: 6,
      totalTraversedEdges: 4,
    });
    expect(snapshot.eventKindCounts['network-traversal']).toBe(2);
  });

  it('tracks attack stages and evidence types', () => {
    const profiler = new SimulationProfiler();
    profiler.recordAttackStage('recon', 10);
    profiler.recordAttackStage('initial_access', 20);
    profiler.recordAttackStage('recon', 5);
    profiler.recordEvidenceGeneration('authentication_event', 3);
    profiler.recordEvidenceGeneration('network_record', 7);

    expect(profiler.getAttackStageCounts()).toEqual({
      recon: 2,
      initial_access: 1,
    });
    expect(profiler.getEvidenceTypeCounts()).toEqual({
      authentication_event: 1,
      network_record: 1,
    });
  });

  it('tracks scenario evaluations and event stats', () => {
    const profiler = new SimulationProfiler();
    profiler.recordScenarioEvaluation('scenario-validator', 40);
    profiler.recordScenarioEvaluation('scenario-solver', 60);

    const snapshot = profiler.createSnapshot();
    expect(snapshot.scenarioEvaluationCount).toBe(2);
    expect(snapshot.eventKindCounts.scenario).toBe(2);
    expect(snapshot.operations).toHaveLength(2);
  });

  it('records generic simulation events with duration stats', () => {
    const profiler = new SimulationProfiler();
    profiler.recordEvent('event', 'process-event', 5, { eventType: 'login' });
    profiler.recordEvent('event', 'process-event', 15);
    profiler.recordEvent('ai', 'defender-decision', 8);

    const processEvent = profiler.listOperations().find(
      (operation) => operation.name === 'process-event',
    );
    expect(processEvent).toMatchObject({
      kind: 'event',
      count: 2,
      totalDurationMs: 20,
      minDurationMs: 5,
      maxDurationMs: 15,
      lastDurationMs: 15,
    });
    expect(profiler.createSnapshot().eventKindCounts.event).toBe(2);
    expect(profiler.createSnapshot().eventKindCounts.ai).toBe(1);
  });

  it('rejects invalid profiler inputs', () => {
    const profiler = new SimulationProfiler();
    expect(() => profiler.recordEvent('invalid' as any, 'x')).toThrow(/kind/);
    expect(() => profiler.recordEvent('event', '', 1)).toThrow(/name/);
    expect(() => profiler.recordEvent('event', 'x', -1)).toThrow(/non-negative/);
    expect(() => profiler.recordTick(-1)).toThrow(/non-negative/);
    expect(() => profiler.recordQueueDepth(-1)).toThrow(/non-negative/);
    expect(() => profiler.recordNetworkTraversal('x', 1, -1, 0)).toThrow(/non-negative/);
    expect(() => profiler.recordAttackStage('', 1)).toThrow(/non-empty/);
    expect(() => profiler.recordEvidenceGeneration('', 1)).toThrow(/non-empty/);
    expect(() => profiler.recordScenarioEvaluation('', 1)).toThrow(/non-empty/);
  });

  it('resets and validates cleanly', () => {
    const profiler = new SimulationProfiler();
    profiler.recordTick(5);
    profiler.recordEntityChange('host', 1);
    profiler.recordQueueDepth(4);
    profiler.recordNetworkTraversal('path', 1, 1, 0);
    profiler.recordAttackStage('recon', 2);
    profiler.recordEvidenceGeneration('log', 2);
    profiler.recordScenarioEvaluation('solver', 2);

    expect(() => profiler.validate()).not.toThrow();

    profiler.reset();
    const snapshot = profiler.createSnapshot();
    expect(snapshot.tickCount).toBe(0);
    expect(snapshot.entityCounters).toHaveLength(0);
    expect(snapshot.operations).toHaveLength(0);
    expect(snapshot.queueDepthPeak).toBe(0);
    expect(snapshot.networkTraversals.count).toBe(0);
    expect(snapshot.attackStageCounts).toEqual({});
    expect(snapshot.evidenceTypeCounts).toEqual({});
    expect(snapshot.scenarioEvaluationCount).toBe(0);
    expect(snapshot.summary).toContain('CYRE Simulation Profiler');
  });
});
