import { describe, it, expect } from 'vitest';
import {
  ReliabilityChecker,
  type ReliabilityReport,
} from '../ReliabilityChecker.js';

describe('ReliabilityChecker', () => {
  it('runs a reliable sync operation', () => {
    const checker = new ReliabilityChecker('reliable-sync');
    let now = 0;
    let calls = 0;

    const report = checker.run(
      () => {
        calls += 1;
        return calls;
      },
      { runs: 5, collectOutputs: true, now: () => now++ },
    );

    expect(report.runs).toBe(5);
    expect(report.successes).toBe(5);
    expect(report.failures).toBe(0);
    expect(report.successRate).toBe(1);
    expect(report.passed).toBe(true);
    expect(report.deterministicOutputs).toBe(false);
    expect(report.outputs).toEqual([1, 2, 3, 4, 5]);
    expect(report.summary).toContain('reliable-sync');
  });

  it('collects deterministic outputs', () => {
    const checker = new ReliabilityChecker();
    const report = checker.run(
      () => ({ value: 42 }),
      { runs: 4, collectOutputs: true },
    );

    expect(report.deterministicOutputs).toBe(true);
    expect(report.outputs).toEqual([
      { value: 42 },
      { value: 42 },
      { value: 42 },
      { value: 42 },
    ]);
  });

  it('captures failure details and first/last error', () => {
    const checker = new ReliabilityChecker('flaky');
    let call = 0;

    const report = checker.run(
      () => {
        call += 1;
        if (call === 1) throw new Error('first failure');
        if (call === 3) throw new Error('third failure');
        return 'ok';
      },
      { runs: 5, maxFailures: 0 },
    );

    expect(report.failures).toBe(2);
    expect(report.successes).toBe(3);
    expect(report.successRate).toBe(0.6);
    expect(report.firstError).toBe('first failure');
    expect(report.lastError).toBe('third failure');
    expect(report.passed).toBe(false);
    expect(report.summary).toContain('flaky');
  });

  it('allows configured maxFailures', () => {
    const checker = new ReliabilityChecker();
    let call = 0;

    const report = checker.run(
      () => {
        call += 1;
        if (call === 1) throw new Error('allowed failure');
        return 'ok';
      },
      { runs: 5, maxFailures: 1 },
    );

    expect(report.failures).toBe(1);
    expect(report.passed).toBe(true);
  });

  it('supports async operations', async () => {
    const checker = new ReliabilityChecker('async');
    let now = 0;

    const report = await checker.runAsync(
      async () => {
        return { status: 'ok' };
      },
      { runs: 4, now: () => now++ },
    );

    expect(report.successes).toBe(4);
    expect(report.failures).toBe(0);
    expect(report.passed).toBe(true);
    expect(report.deterministicOutputs).toBe(true);
  });

  it('expectReliable throws on failure and returns report on success', () => {
    const checker = new ReliabilityChecker();
    const goodReport = checker.expectReliable(() => 'ok', { runs: 2 });
    expect(goodReport.passed).toBe(true);

    expect(() =>
      checker.expectReliable(
        () => {
          throw new Error('boom');
        },
        { runs: 2 },
      ),
    ).toThrow(/failed reliability check/);
  });

  it('expectReliableAsync works for async failures', async () => {
    const checker = new ReliabilityChecker();
    await expect(
      checker.expectReliableAsync(async () => {
        throw new Error('async boom');
      }, { runs: 2 }),
    ).rejects.toThrow(/failed reliability check/);
  });

  it('rejects invalid options', () => {
    const checker = new ReliabilityChecker();
    expect(() => checker.run(() => 1, { runs: 0 })).toThrow(/positive integer/);
    expect(() => checker.run(() => 1, { maxFailures: -1 })).toThrow(/non-negative/);
    expect(() => checker.run(() => 1, { collectOutputs: 'yes' as any })).toThrow(/boolean/);
    expect(() => checker.run(() => 1, { now: 'now' as any })).toThrow(/function/);
  });

  it('rejects non-function operation', () => {
    const checker = new ReliabilityChecker();
    expect(() => checker.run('bad' as any)).toThrow();
  });

  it('produces average and total duration metrics', () => {
    const checker = new ReliabilityChecker();
    let now = 0;
    const report = checker.run(
      () => 'ok',
      {
        runs: 4,
        now: () => {
          now += 2;
          return now;
        },
      },
    );

    expect(report.totalDurationMs).toBeGreaterThan(0);
    expect(report.averageDurationMs).toBeGreaterThan(0);
  });
});
