import { describe, it, expect } from 'vitest';
import { ResourceDiagnostics } from '../ResourceDiagnostics.js';
import type { ProfilerMemoryUsage } from '../PerformanceProfiler.js';

function makeMemory(overrides: Partial<ProfilerMemoryUsage> = {}): ProfilerMemoryUsage {
  return {
    heapUsed: 1000,
    heapTotal: 2000,
    external: 300,
    arrayBuffers: 50,
    rss: 4000,
    ...overrides,
  };
}

describe('ResourceDiagnostics', () => {
  it('captures and records memory samples with peak tracking', () => {
    let memory = makeMemory();
    const diagnostics = new ResourceDiagnostics({
      now: () => 1000,
      getMemoryUsage: () => memory,
    });

    diagnostics.recordSample();
    memory = makeMemory({ heapUsed: 5000, heapTotal: 8000 });
    diagnostics.recordSample();
    memory = makeMemory({ heapUsed: 2500, external: 1200 });
    diagnostics.recordSample();

    expect(diagnostics.getSampleCount()).toBe(3);
    expect(diagnostics.getLatestSample()!.memory.heapUsed).toBe(2500);
    expect(diagnostics.getPeakMemory()).toMatchObject({
      heapUsed: 5000,
      heapTotal: 8000,
      external: 1200,
      arrayBuffers: 50,
      rss: 4000,
    });
  });

  it('tracks custom resource usage with current and peak values', () => {
    const diagnostics = new ResourceDiagnostics({ now: () => 0 });

    diagnostics.setResourceUsage('active-sessions', 10);
    diagnostics.setResourceUsage('active-sessions', 25);
    diagnostics.setResourceUsage('active-sessions', 8);

    expect(diagnostics.getResourceNames()).toEqual(['active-sessions']);
    expect(diagnostics.getResourceUsage('active-sessions')).toMatchObject({
      name: 'active-sessions',
      current: 8,
      peak: 25,
      totalRecorded: 43,
      updateCount: 3,
    });
  });

  it('records custom resource values during samples', () => {
    const diagnostics = new ResourceDiagnostics({ now: () => 0 });
    diagnostics.recordSample({ connections: 5, activeAgents: 2 });
    diagnostics.recordSample({ connections: 8, activeAgents: 1 });

    expect(diagnostics.getLatestSample()!.customResources).toEqual({
      connections: 8,
      activeAgents: 1,
    });
    expect(diagnostics.getResourceUsage('connections')).toMatchObject({
      current: 8,
      peak: 8,
      updateCount: 2,
      totalRecorded: 13,
    });
  });

  it('detects memory threshold breaches', () => {
    const memory = makeMemory({ heapUsed: 800, heapTotal: 3000, external: 750 });
    const diagnostics = new ResourceDiagnostics({ getMemoryUsage: () => memory });

    const results = diagnostics.evaluateThresholds({
      heapUsed: 500,
      external: 1000,
    });

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      metric: 'heapUsed',
      current: 800,
      threshold: 500,
      exceededBy: 300,
    });
  });

  it('detects growth issues over sample window', () => {
    let heapUsed = 1000;
    const diagnostics = new ResourceDiagnostics({
      now: () => 0,
      getMemoryUsage: () => makeMemory({ heapUsed }),
    });

    for (let i = 0; i < 5; i += 1) {
      heapUsed += 100;
      diagnostics.recordSample();
    }

    heapUsed = 1000 + 20 * 1024;
    diagnostics.recordSample();

    const issues = diagnostics.detectGrowthIssues({
      windowSamples: 6,
      heapUsedGrowthThreshold: 1024,
    });

    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]).toContain('heapUsed grew');
  });

  it('creates a full diagnostics snapshot', () => {
    let memory = makeMemory({ heapUsed: 1000 });
    const diagnostics = new ResourceDiagnostics({
      name: 'CyberWorld Diagnostics',
      now: () => 500,
      getMemoryUsage: () => memory,
    });

    diagnostics.recordSample({ hosts: 3 });
    memory = makeMemory({ heapUsed: 2000 });
    diagnostics.recordSample({ hosts: 5 });
    diagnostics.setResourceUsage('tickets', 2);

    const snapshot = diagnostics.createSnapshot();
    expect(snapshot.name).toBe('CyberWorld Diagnostics');
    expect(snapshot.sampleCount).toBe(2);
    expect(snapshot.currentMemory.heapUsed).toBe(2000);
    expect(snapshot.baselineMemory!.heapUsed).toBe(1000);
    expect(snapshot.memoryDeltaFromBaseline.heapUsed).toBe(1000);
    expect(snapshot.customResources).toHaveLength(2);
    expect(snapshot.summary).toContain('CyberWorld Diagnostics');
    expect(snapshot.summary).toContain('heapUsed=2000');
  });

  it('respects maximum sample count', () => {
    let heapUsed = 1000;
    const diagnostics = new ResourceDiagnostics({
      maxSamples: 3,
      getMemoryUsage: () => makeMemory({ heapUsed }),
    });

    for (let i = 0; i < 5; i += 1) {
      heapUsed += 1;
      diagnostics.recordSample();
    }

    expect(diagnostics.getSampleCount()).toBe(3);
    expect(diagnostics.getSamples()[0].memory.heapUsed).toBe(1003);
  });

  it('rejects invalid inputs and validates cleanly', () => {
    const diagnostics = new ResourceDiagnostics({
      maxSamples: 5,
      getMemoryUsage: () => makeMemory(),
    });

    expect(() => diagnostics.setResourceUsage('', 1)).toThrow(/name/);
    expect(() => diagnostics.setResourceUsage('x', -1)).toThrow(/non-negative/);
    expect(() => diagnostics.recordSample({ bad: -1 })).toThrow(/non-negative/);
    expect(() => diagnostics.evaluateThresholds({ heapUsed: -1 })).toThrow(/non-negative/);
    expect(() => diagnostics.detectGrowthIssues({ windowSamples: 1 })).toThrow(/at least 2/);

    diagnostics.recordSample({ connections: 1 });
    expect(() => diagnostics.validate()).not.toThrow();
  });

  it('resets all diagnostics state', () => {
    const diagnostics = new ResourceDiagnostics({ getMemoryUsage: () => makeMemory() });
    diagnostics.recordSample({ x: 1 });
    diagnostics.setResourceUsage('y', 2);

    diagnostics.reset();

    expect(diagnostics.getSampleCount()).toBe(0);
    expect(diagnostics.getResourceNames()).toHaveLength(0);
    expect(diagnostics.getPeakMemory().heapUsed).toBe(0);
    expect(diagnostics.getBaselineMemory()).toBeUndefined();
  });
});
