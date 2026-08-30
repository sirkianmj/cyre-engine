import { describe, expect, it } from 'vitest';
import { RegressionSuite } from '../RegressionSuite.js';

describe('RegressionSuite', () => {
  it('runs the built-in regression suite successfully', async () => {
    const suite = RegressionSuite.createWithBuiltIns('Built-In Regression');
    const report = await suite.run();

    expect(report.passed).toBe(true);
    expect(report.totalCases).toBeGreaterThanOrEqual(3);
    expect(report.failedCases).toBe(0);
    expect(report.summary).toContain('Built-In Regression');
  });

  it('collects pass/fail results from custom cases', async () => {
    const suite = new RegressionSuite('Custom');
    suite.addCase('sync pass', () => {});
    suite.addCase('async pass', async () => {});
    suite.addCase('sync fail', () => {
      throw new Error('boom');
    });
    suite.addCase('async fail', async () => {
      throw new Error('async boom');
    });

    const report = await suite.run();

    expect(report.totalCases).toBe(4);
    expect(report.passedCases).toBe(2);
    expect(report.failedCases).toBe(2);
    expect(report.passed).toBe(false);
    expect(report.cases.map((item) => item.name)).toEqual([
      'sync pass',
      'async pass',
      'sync fail',
      'async fail',
    ]);
    expect(report.cases.find((item) => item.name === 'sync fail')?.error).toBe('boom');
    expect(report.cases.find((item) => item.name === 'async fail')?.error).toBe('async boom');
  });

  it('throws when running a suite with no cases', async () => {
    const suite = new RegressionSuite('Empty');

    await expect(suite.run()).rejects.toThrow(/at least one regression case/);
  });

  it('rejects duplicate and empty case names', () => {
    const suite = new RegressionSuite('Duplicates');
    suite.addCase('case', () => {});

    expect(() => suite.addCase('case', () => {})).toThrow(/already registered/);
    expect(() => suite.addCase('', () => {})).toThrow(/name is required/);
    expect(() => suite.addCase('bad', 'not a function' as any)).toThrow(/function/);
  });

  it('lists, checks, and removes cases', () => {
    const suite = new RegressionSuite('List');
    suite.addCase('alpha', () => {});
    suite.addCase('beta', () => {});

    expect(suite.listCaseNames()).toEqual(['alpha', 'beta']);
    expect(suite.hasCase('alpha')).toBe(true);

    expect(suite.removeCase('alpha')).toBe(true);
    expect(suite.hasCase('alpha')).toBe(false);
    expect(suite.count()).toBe(1);
  });

  it('clears all cases', () => {
    const suite = new RegressionSuite('Clear');
    suite.addCase('case', () => {});
    suite.clear();

    expect(suite.count()).toBe(0);
    expect(() => suite.validate()).toThrow(/at least one regression case/);
  });

  it('tracks timing through the injected now function', async () => {
    let now = 0;
    const suite = new RegressionSuite('Timing', {
      now: () => {
        now += 10;
        return now;
      },
    });
    suite.addCase('case', () => {});

    const report = await suite.run();

    expect(report.durationMs).toBeGreaterThanOrEqual(0);
    expect(report.cases[0].durationMs).toBeGreaterThanOrEqual(0);
  });
});
