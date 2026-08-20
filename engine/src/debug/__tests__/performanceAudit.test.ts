import { describe, it, expect } from 'vitest';
import {
  PerformanceAuditSystem,
  PerformanceProfiler,
  ResourceDiagnostics,
} from '../index.js';
import { SimulationProfiler } from '../../simulation/index.js';
import {
  isPerformanceAuditSeverity,
  isPerformanceAuditCategory,
} from '../PerformanceAuditTypes.js';

describe('PerformanceAuditTypes', () => {
  it('exposes severities and categories', () => {
    expect(isPerformanceAuditSeverity('critical')).toBe(true);
    expect(isPerformanceAuditCategory('memory')).toBe(true);
  });
});

describe('PerformanceAuditSystem', () => {
  it('passes clean profilers with no thresholds', () => {
    const audit = new PerformanceAuditSystem({
      performanceProfiler: new PerformanceProfiler({
        getMemoryUsage: () => ({
          heapUsed: 100,
          heapTotal: 200,
          external: 0,
          arrayBuffers: 0,
        }),
      }),
      resourceDiagnostics: new ResourceDiagnostics({
        getMemoryUsage: () => ({
          heapUsed: 100,
          heapTotal: 200,
          external: 0,
          arrayBuffers: 0,
        }),
      }),
      simulationProfiler: new SimulationProfiler(),
    });

    const report = audit.audit();
    expect(report.passed).toBe(true);
    expect(report.criticalCount).toBe(0);
    expect(report.summary).toContain('passed');
    expect(() => audit.validate()).not.toThrow();
  });

  it('detects CPU threshold breach', () => {
    let now = 0;
    const profiler = new PerformanceProfiler({
      now: () => now,
      getMemoryUsage: () => ({
        heapUsed: 100,
        heapTotal: 200,
        external: 0,
        arrayBuffers: 0,
      }),
    });
    now = 0;
    profiler.startSection('work');
    now = 10;
    profiler.endSection('work');

    const audit = new PerformanceAuditSystem({
      performanceProfiler: profiler,
      thresholds: { maxCpuTimeMs: 5 },
    });

    const report = audit.audit();
    expect(report.criticalCount).toBeGreaterThan(0);
    expect(report.issues.some((issue) => issue.category === 'cpu')).toBe(true);
    expect(report.passed).toBe(false);
  });

  it('detects heap threshold breach', () => {
    const diagnostics = new ResourceDiagnostics({
      getMemoryUsage: () => ({
        heapUsed: 10_000,
        heapTotal: 20_000,
        external: 0,
        arrayBuffers: 0,
      }),
    });

    const audit = new PerformanceAuditSystem({
      resourceDiagnostics: diagnostics,
      thresholds: { maxHeapUsed: 100 },
    });

    const report = audit.audit();
    expect(report.criticalCount).toBeGreaterThan(0);
    expect(report.issues.some((issue) => issue.category === 'memory')).toBe(true);
  });

  it('detects simulation queue depth breach', () => {
    const simulation = new SimulationProfiler();
    simulation.recordQueueDepth(50);

    const audit = new PerformanceAuditSystem({
      simulationProfiler: simulation,
      thresholds: { maxQueueDepth: 10 },
    });

    const report = audit.audit();
    expect(report.criticalCount).toBeGreaterThan(0);
    expect(report.issues.some((issue) => issue.category === 'simulation')).toBe(true);
  });

  it('reports simulation tick count warning', () => {
    const simulation = new SimulationProfiler();
    simulation.recordTick(1);
    simulation.recordTick(2);

    const audit = new PerformanceAuditSystem({
      simulationProfiler: simulation,
      thresholds: { maxSimulationTickCount: 1 },
    });

    const report = audit.audit();
    expect(report.warningCount).toBeGreaterThan(0);
    expect(report.issues.some((issue) => issue.category === 'simulation')).toBe(true);
  });

  it('validates cleanly and rejects invalid thresholds', () => {
    expect(() =>
      new PerformanceAuditSystem({ thresholds: { maxHeapUsed: -1 } }).validate(),
    ).toThrow(/non-negative/);

    const audit = new PerformanceAuditSystem();
    expect(() => audit.validate()).not.toThrow();
  });

  it('rejects invalid profiler instances', () => {
    expect(() =>
      new PerformanceAuditSystem({
        performanceProfiler: {} as any,
      }).validate(),
    ).toThrow(/PerformanceProfiler instance/);

    expect(() =>
      new PerformanceAuditSystem({
        resourceDiagnostics: {} as any,
      }).validate(),
    ).toThrow(/ResourceDiagnostics instance/);
  });
});
