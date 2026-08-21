import { describe, expect, it } from 'vitest';
import { RealWorldDeveloperTest } from '../RealWorldDeveloperTest.js';

describe('RealWorldDeveloperTest', () => {
  it('runs the default developer workflow successfully', async () => {
    const test = RealWorldDeveloperTest.createDefault('Default Developer Test');
    const report = await test.run();

    expect(report.passed).toBe(true);
    expect(report.totalSteps).toBeGreaterThanOrEqual(4);
    expect(report.failedSteps).toBe(0);
    expect(report.summary).toContain('Default Developer Test');
  });

  it('collects pass/fail results from custom steps', async () => {
    const test = new RealWorldDeveloperTest('Custom Workflow');

    test.addStep('sync pass', () => {});
    test.addStep('async pass', async () => {});
    test.addStep('sync fail', () => {
      throw new Error('sync boom');
    });
    test.addStep('async fail', async () => {
      throw new Error('async boom');
    });

    const report = await test.run();

    expect(report.totalSteps).toBe(4);
    expect(report.passedSteps).toBe(2);
    expect(report.failedSteps).toBe(2);
    expect(report.passed).toBe(false);
    expect(report.steps.map((step) => step.name)).toEqual([
      'sync pass',
      'async pass',
      'sync fail',
      'async fail',
    ]);
    expect(report.steps.find((step) => step.name === 'sync fail')?.error).toBe('sync boom');
    expect(report.steps.find((step) => step.name === 'async fail')?.error).toBe('async boom');
  });

  it('throws when running a test with no steps', async () => {
    const test = new RealWorldDeveloperTest('Empty');

    await expect(test.run()).rejects.toThrow(/at least one developer step/);
  });

  it('rejects duplicate and empty step names', () => {
    const test = new RealWorldDeveloperTest('Duplicates');
    test.addStep('step', () => {});

    expect(() => test.addStep('step', () => {})).toThrow(/already registered/);
    expect(() => test.addStep('', () => {})).toThrow(/name is required/);
    expect(() => test.addStep('bad', 'not a function' as any)).toThrow(/function/);
  });

  it('lists, checks, and removes steps', () => {
    const test = new RealWorldDeveloperTest('List');
    test.addStep('alpha', () => {});
    test.addStep('beta', () => {});

    expect(test.listStepNames()).toEqual(['alpha', 'beta']);
    expect(test.hasStep('alpha')).toBe(true);

    expect(test.removeStep('alpha')).toBe(true);
    expect(test.hasStep('alpha')).toBe(false);
    expect(test.count()).toBe(1);
  });

  it('clears all steps', () => {
    const test = new RealWorldDeveloperTest('Clear');
    test.addStep('step', () => {});
    test.clear();

    expect(test.count()).toBe(0);
    expect(() => test.validate()).toThrow(/at least one developer step/);
  });

  it('tracks timing through the injected now function', async () => {
    let now = 0;
    const test = new RealWorldDeveloperTest('Timing', {
      now: () => {
        now += 10;
        return now;
      },
    });
    test.addStep('step', () => {});

    const report = await test.run();

    expect(report.durationMs).toBeGreaterThanOrEqual(0);
    expect(report.steps[0].durationMs).toBeGreaterThanOrEqual(0);
  });
});
