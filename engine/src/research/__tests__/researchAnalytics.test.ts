import { describe, expect, it } from 'vitest';

import {
  aggregateRuns,
  analyticsToCSV,
  analyticsToJSON,
  analyticsToNDJSON,
  buildAnalyticsReport,
  cohensD,
  compareAgainstBaseline,
  compareConditions,
  comparisonsToCSV,
  hedgesG,
  listMetrics,
  summarizeSeries,
  welchTTest,
} from '../ResearchAnalytics.js';

import type { AnalyticRun } from '../ResearchAnalytics.js';

describe('summarizeSeries', () => {
  it('computes mean, median and dispersion', () => {
    const stats = summarizeSeries([2, 4, 4, 4, 5, 5, 7, 9]);

    expect(stats.count).toBe(8);
    expect(stats.mean).toBe(5);
    expect(stats.median).toBe(4.5);
    expect(stats.min).toBe(2);
    expect(stats.max).toBe(9);
    // Sample variance of this set is 4.571428...
    expect(stats.variance).toBeCloseTo(32 / 7, 10);
    expect(stats.standardDeviation).toBeCloseTo(Math.sqrt(32 / 7), 10);
    expect(stats.standardError).toBeCloseTo(Math.sqrt(32 / 7) / Math.sqrt(8), 10);
  });

  it('computes quartiles and the interquartile range', () => {
    const stats = summarizeSeries([1, 2, 3, 4, 5, 6, 7, 8, 9]);

    expect(stats.quartiles.q1).toBe(3);
    expect(stats.quartiles.q2).toBe(5);
    expect(stats.quartiles.q3).toBe(7);
    expect(stats.interquartileRange).toBe(4);
  });

  it('reports skewness for an asymmetric distribution', () => {
    const symmetric = summarizeSeries([1, 2, 3, 4, 5]);
    const rightSkewed = summarizeSeries([1, 1, 1, 1, 10]);

    expect(symmetric.skewness).not.toBeNull();
    expect(Math.abs(symmetric.skewness as number)).toBeLessThan(0.001);
    expect(rightSkewed.skewness).not.toBeNull();
    expect(rightSkewed.skewness as number).toBeGreaterThan(1);
  });

  it('handles degenerate input without dividing by zero', () => {
    const empty = summarizeSeries([]);
    expect(empty.count).toBe(0);
    expect(empty.skewness).toBeNull();

    const single = summarizeSeries([42]);
    expect(single.count).toBe(1);
    expect(single.mean).toBe(42);
    expect(single.variance).toBe(0);
    expect(single.standardDeviation).toBe(0);
    expect(single.skewness).toBeNull();

    const constant = summarizeSeries([3, 3, 3, 3]);
    expect(constant.variance).toBe(0);
    expect(constant.skewness).toBeNull();
  });

  it('ignores non-finite observations', () => {
    const stats = summarizeSeries([1, Number.NaN, 2, Number.POSITIVE_INFINITY, 3]);
    expect(stats.count).toBe(3);
    expect(stats.mean).toBe(2);
  });
});

describe('effect sizes', () => {
  // Two groups with a known one-pooled-SD separation.
  const low = [10, 11, 12, 13, 14];
  const high = [15, 16, 17, 18, 19];

  it("computes Cohen's d from the pooled standard deviation", () => {
    const d = cohensD(high, low);
    // Means differ by 5; both groups have SD sqrt(2.5), so pooled SD is the same.
    expect(d).toBeCloseTo(5 / Math.sqrt(2.5), 10);
  });

  it("applies the small-sample correction for Hedges' g", () => {
    const d = cohensD(high, low) as number;
    const g = hedgesG(high, low) as number;

    expect(Math.abs(g)).toBeLessThan(Math.abs(d));
    expect(g).toBeCloseTo(d * (1 - 3 / (4 * 8 - 1)), 10);
  });

  it('returns null when an effect size is not estimable', () => {
    expect(cohensD([1], [2, 3])).toBeNull();
    expect(cohensD([5, 5, 5], [5, 5, 5])).toBeNull();
    expect(hedgesG([1], [2, 3])).toBeNull();
  });

  it("is symmetric in magnitude but opposite in sign", () => {
    const forward = cohensD(high, low) as number;
    const backward = cohensD(low, high) as number;

    expect(forward).toBeCloseTo(-backward, 10);
  });

  it("computes Welch's t without assuming equal variance", () => {
    const tight = [10, 10.1, 9.9, 10, 10.05];
    const wide = [20, 25, 15, 22, 18];

    const result = welchTTest(wide, tight);
    expect(result).not.toBeNull();
    expect(result?.t).toBeGreaterThan(0);
    expect(result?.degreesOfFreedom).toBeGreaterThan(0);
    // Unequal variances must shrink the Welch df below the pooled n1+n2-2 = 8.
    expect(result?.degreesOfFreedom).toBeLessThan(8);
  });

  it('returns null for Welch t with too few observations', () => {
    expect(welchTTest([1], [2, 3, 4])).toBeNull();
  });
});

describe('aggregateRuns', () => {
  const runs: AnalyticRun[] = [
    { runId: 'r1', conditionId: 'control', metrics: { score: 0.4, timeMs: 100 } },
    { runId: 'r2', conditionId: 'control', metrics: { score: 0.6, timeMs: 200 } },
    { runId: 'r3', conditionId: 'aided', metrics: { score: 0.8, timeMs: 80 } },
    { runId: 'r4', conditionId: 'aided', metrics: { score: 0.9, timeMs: 90 } },
  ];

  it('groups runs by condition and computes per-metric statistics', () => {
    const aggregates = aggregateRuns(runs, { control: 'Control', aided: 'With decision aid' });

    expect(aggregates).toHaveLength(2);

    const control = aggregates.find((entry) => entry.conditionId === 'control');
    expect(control?.label).toBe('Control');
    expect(control?.runCount).toBe(2);
    expect(control?.statistics.score.mean).toBeCloseTo(0.5, 10);

    const aided = aggregates.find((entry) => entry.conditionId === 'aided');
    expect(aided?.label).toBe('With decision aid');
    expect(aided?.statistics.score.mean).toBeCloseTo(0.85, 10);
  });

  it('falls back to the condition id when no label is supplied', () => {
    const aggregates = aggregateRuns(runs);
    expect(aggregates.map((entry) => entry.label)).toEqual(['aided', 'control']);
  });

  it('discovers metrics from the runs', () => {
    expect(listMetrics(aggregateRuns(runs))).toEqual(['score', 'timeMs']);
  });

  it('retains raw observations so exports stay reproducible', () => {
    const aggregates = aggregateRuns(runs);
    const control = aggregates.find((entry) => entry.conditionId === 'control');
    expect(control?.observations.score).toEqual([0.4, 0.6]);
  });

  it('rejects malformed runs', () => {
    expect(() => aggregateRuns([{ runId: '', conditionId: 'a', metrics: {} }])).toThrow(
      /run id must be a non-empty string/,
    );
    expect(() => aggregateRuns([{ runId: 'r', conditionId: ' ', metrics: {} }])).toThrow(
      /missing a condition id/,
    );
  });
});

describe('condition comparison', () => {
  const runs: AnalyticRun[] = [
    { runId: 'r1', conditionId: 'control', metrics: { score: 0.4 } },
    { runId: 'r2', conditionId: 'control', metrics: { score: 0.5 } },
    { runId: 'r3', conditionId: 'control', metrics: { score: 0.6 } },
    { runId: 'r4', conditionId: 'aided', metrics: { score: 0.8 } },
    { runId: 'r5', conditionId: 'aided', metrics: { score: 0.9 } },
    { runId: 'r6', conditionId: 'aided', metrics: { score: 1.0 } },
  ];

  it('compares a condition against a baseline on one metric', () => {
    const aggregates = aggregateRuns(runs);
    const control = aggregates.find((entry) => entry.conditionId === 'control')!;
    const aided = aggregates.find((entry) => entry.conditionId === 'aided')!;

    const comparison = compareConditions('score', control, aided);

    expect(comparison.metric).toBe('score');
    expect(comparison.baselineId).toBe('control');
    expect(comparison.comparisonId).toBe('aided');
    expect(comparison.baseline.mean).toBeCloseTo(0.5, 10);
    expect(comparison.comparison.mean).toBeCloseTo(0.9, 10);
    expect(comparison.meanDifference).toBeCloseTo(0.4, 10);
    expect(comparison.relativeChange).toBeCloseTo(0.8, 10);
    expect(comparison.cohensD).not.toBeNull();
    expect(comparison.effectMagnitude).toBe('large');
  });

  it('reports a negligible effect when conditions do not differ', () => {
    const same: AnalyticRun[] = [
      { runId: 'a1', conditionId: 'x', metrics: { score: 0.5 } },
      { runId: 'a2', conditionId: 'x', metrics: { score: 0.52 } },
      { runId: 'a3', conditionId: 'x', metrics: { score: 0.48 } },
      { runId: 'b1', conditionId: 'y', metrics: { score: 0.51 } },
      { runId: 'b2', conditionId: 'y', metrics: { score: 0.49 } },
      { runId: 'b3', conditionId: 'y', metrics: { score: 0.5 } },
    ];

    const aggregates = aggregateRuns(same);
    const comparison = compareConditions(
      'score',
      aggregates.find((entry) => entry.conditionId === 'x')!,
      aggregates.find((entry) => entry.conditionId === 'y')!,
    );

    expect(comparison.effectMagnitude).toBe('negligible');
    expect(Math.abs(comparison.cohensD as number)).toBeLessThan(0.2);
  });

  it('compares every condition against the baseline across shared metrics', () => {
    const aggregates = aggregateRuns(runs);
    const comparisons = compareAgainstBaseline(aggregates, 'control');

    expect(comparisons).toHaveLength(1);
    expect(comparisons[0].metric).toBe('score');
  });

  it('rejects a baseline that is not present', () => {
    expect(() => compareAgainstBaseline(aggregateRuns(runs), 'missing')).toThrow(
      /is not present in the aggregates/,
    );
  });
});

describe('buildAnalyticsReport', () => {
  const runs: AnalyticRun[] = [
    { runId: 'r1', conditionId: 'control', metrics: { score: 0.4, errors: 2 } },
    { runId: 'r2', conditionId: 'control', metrics: { score: 0.6, errors: 1 } },
    { runId: 'r3', conditionId: 'aided', metrics: { score: 0.9, errors: 0 } },
    { runId: 'r4', conditionId: 'aided', metrics: { score: 0.85, errors: 1 } },
  ];

  it('builds a report with conditions, metrics and comparisons', () => {
    const report = buildAnalyticsReport(runs, {
      baselineId: 'control',
      generatedAt: 1234,
      labels: { control: 'Control', aided: 'Aided' },
    });

    expect(report.runCount).toBe(4);
    expect(report.conditionCount).toBe(2);
    expect(report.metrics).toEqual(['errors', 'score']);
    expect(report.baselineId).toBe('control');
    expect(report.comparisons.length).toBe(2);
    expect(report.generatedAt).toBe(1234);
  });

  it('omits comparisons when no valid baseline is given', () => {
    const report = buildAnalyticsReport(runs, { baselineId: 'nope' });

    expect(report.baselineId).toBeNull();
    expect(report.comparisons).toHaveLength(0);
  });

  it('serialises to JSON that round-trips', () => {
    const report = buildAnalyticsReport(runs, { baselineId: 'control' });
    const parsed = JSON.parse(analyticsToJSON(report));

    expect(parsed.runCount).toBe(4);
    expect(parsed.conditions).toHaveLength(2);
    expect(parsed.comparisons.length).toBe(2);
  });

  it('serialises condition statistics to CSV with a stable header', () => {
    const report = buildAnalyticsReport(runs, { baselineId: 'control' });
    const csv = analyticsToCSV(report);
    const lines = csv.split('\n');

    expect(lines[0]).toBe(
      'conditionId,label,metric,count,mean,median,min,max,variance,standardDeviation,standardError,q1,q3,interquartileRange,skewness',
    );
    // 2 conditions x 2 metrics
    expect(lines).toHaveLength(1 + 4);
  });

  it('serialises comparisons to CSV', () => {
    const report = buildAnalyticsReport(runs, { baselineId: 'control' });
    const csv = comparisonsToCSV(report.comparisons);
    const lines = csv.split('\n');

    expect(lines[0]).toContain('cohensD');
    expect(lines[0]).toContain('effectMagnitude');
    expect(lines).toHaveLength(1 + report.comparisons.length);
  });

  it('serialises to NDJSON with one document per line', () => {
    const report = buildAnalyticsReport(runs, { baselineId: 'control' });
    const lines = analyticsToNDJSON(report).split('\n');

    // 1 report header + 2 conditions + 2 comparisons
    expect(lines).toHaveLength(5);
    for (const line of lines) {
      expect(() => JSON.parse(line)).not.toThrow();
    }
    expect(JSON.parse(lines[0]).kind).toBe('report');
    expect(JSON.parse(lines[1]).kind).toBe('condition');
    expect(JSON.parse(lines[3]).kind).toBe('comparison');
  });

  it('escapes CSV values containing commas or quotes', () => {
    const report = buildAnalyticsReport(runs, {
      labels: { control: 'Control, unaided', aided: 'The "aided" arm' },
    });
    const csv = analyticsToCSV(report);

    expect(csv).toContain('"Control, unaided"');
    expect(csv).toContain('"The ""aided"" arm"');
  });
});
