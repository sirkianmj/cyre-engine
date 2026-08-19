import { describe, it, expect } from 'vitest';
import { PerformanceProfiler } from '../PerformanceProfiler.js';

describe('PerformanceProfiler', () => {
  it('measures section durations with injected clock', () => {
    let now = 0;
    const profiler = new PerformanceProfiler({ now: () => now });

    now = 10;
    profiler.startSection('render');
    now = 35;
    const duration = profiler.endSection('render');

    expect(duration).toBe(25);
    expect(profiler.getSection('render')).toMatchObject({
      name: 'render',
      state: 'stopped',
      startTime: 10,
      endTime: 35,
      durationMs: 25,
    });
  });

  it('records operations and tracks min/max/last durations', () => {
    const profiler = new PerformanceProfiler({ now: () => 0 });

    profiler.recordOperation('network:addNode', 5, { nodes: 1 });
    profiler.recordOperation('network:addNode', 3);
    profiler.recordOperation('network:addNode', 8);

    const operation = profiler.getOperation('network:addNode')!;
    expect(operation.count).toBe(3);
    expect(operation.totalMs).toBe(16);
    expect(operation.minMs).toBe(3);
    expect(operation.maxMs).toBe(8);
    expect(operation.lastMs).toBe(8);
    expect(profiler.getTotalCpuTimeMs()).toBe(16);
  });

  it('measures synchronous functions', () => {
    let now = 100;
    const profiler = new PerformanceProfiler({ now: () => now });
    let sideEffect = false;

    profiler.measure('compute', () => {
      now += 12;
      sideEffect = true;
      return 42;
    });

    expect(sideEffect).toBe(true);
    expect(profiler.getOperation('compute')).toMatchObject({
      count: 1,
      totalMs: 12,
    });
  });

  it('records events and computes throughput', () => {
    let now = 0;
    const profiler = new PerformanceProfiler({ now: () => now });

    profiler.recordEvent('login', 0);
    profiler.recordEvent('alert', 500);
    profiler.recordEvent('alert', 750);

    expect(profiler.getEventCount()).toBe(3);
    expect(profiler.getEventTypeCounts()).toEqual({
      login: 1,
      alert: 2,
    });

    now = 1000;
    expect(profiler.getEventThroughput(1000)).toBe(3);
    expect(profiler.getRecentEvents(2)).toHaveLength(2);
  });

  it('captures memory and creates full snapshot', () => {
    let now = 0;
    const profiler = new PerformanceProfiler({
      name: 'Engine Profiler',
      now: () => now,
      getMemoryUsage: () => ({
        heapUsed: 12345,
        heapTotal: 20000,
        external: 500,
        arrayBuffers: 100,
        rss: 30000,
      }),
    });

    profiler.startSection('simulation');
    now = 5;
    profiler.endSection('simulation');
    profiler.recordOperation('event:process', 2);
    profiler.recordEvent('mission:start');

    const snapshot = profiler.createSnapshot();
    expect(snapshot.name).toBe('Engine Profiler');
    expect(snapshot.cpuTimeMs).toBe(7);
    expect(snapshot.sectionCount).toBe(1);
    expect(snapshot.operationCount).toBe(1);
    expect(snapshot.eventCount).toBe(1);
    expect(snapshot.memory.heapUsed).toBe(12345);
    expect(snapshot.sections[0].durationMs).toBe(5);
    expect(snapshot.operations[0].name).toBe('event:process');
    expect(snapshot.summary).toContain('Engine Profiler');
    expect(snapshot.summary).toContain('heapUsed=12345');
  });

  it('throws on invalid profiler operations', () => {
    const profiler = new PerformanceProfiler();
    profiler.startSection('render');

    expect(() => profiler.startSection('')).toThrow(/name/);
    expect(() => profiler.startSection('render')).toThrow(/already exists/);
    expect(() => profiler.endSection('missing')).toThrow(/does not exist/);
    expect(() => profiler.recordOperation('op', -1)).toThrow(/non-negative/);
    expect(() => profiler.recordEvent('')).toThrow(/type/);
    expect(() => profiler.getEventThroughput(0)).toThrow(/positive/);
    expect(() => profiler.getRecentEvents(-1)).toThrow(/non-negative/);
  });

  it('resets all profiler state', () => {
    const profiler = new PerformanceProfiler();
    profiler.startSection('s');
    profiler.endSection('s');
    profiler.recordOperation('op', 5);
    profiler.recordEvent('event');

    profiler.reset();

    expect(profiler.listSections()).toHaveLength(0);
    expect(profiler.listOperations()).toHaveLength(0);
    expect(profiler.getEventCount()).toBe(0);
    expect(profiler.getTotalCpuTimeMs()).toBe(0);
  });

  it('validates cleanly', () => {
    const profiler = new PerformanceProfiler();
    profiler.startSection('frame');
    profiler.endSection('frame');
    profiler.recordOperation('sim:step', 1);
    profiler.recordEvent('frame:end');
    expect(() => profiler.validate()).not.toThrow();
  });
});
