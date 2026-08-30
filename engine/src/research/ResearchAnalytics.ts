/**
 * ResearchAnalytics
 * ------------------
 * A real analytics layer over experiment runs: aggregation by condition,
 * descriptive statistics, distribution information, condition comparison and
 * effect-size estimation.
 *
 * Scope is deliberately honest: this computes descriptive statistics, Welch's
 * t and standardised effect sizes (Cohen's d, Hedges' g). It does not perform
 * family-wise error correction, mixed-model analysis, power analysis, or
 * anything requiring a human-subjects protocol.
 */

/** Descriptive statistics and distribution shape for one numeric series. */
export interface SeriesStatistics {
  count: number;
  mean: number;
  median: number;
  min: number;
  max: number;
  /** Sample variance (n-1 denominator); 0 when fewer than two observations. */
  variance: number;
  standardDeviation: number;
  standardError: number;
  quartiles: { q1: number; q2: number; q3: number };
  interquartileRange: number;
  /** Pearson skewness; null when dispersion is zero or n < 3. */
  skewness: number | null;
}

/** Linear-interpolated quantile (type 7, the common default). */
function quantile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];

  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];

  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

/** Computes descriptive statistics for a numeric series. */
export function summarizeSeries(values: readonly number[]): SeriesStatistics {
  const clean = values.filter((value) => Number.isFinite(value));
  const count = clean.length;

  if (count === 0) {
    return {
      count: 0,
      mean: 0,
      median: 0,
      min: 0,
      max: 0,
      variance: 0,
      standardDeviation: 0,
      standardError: 0,
      quartiles: { q1: 0, q2: 0, q3: 0 },
      interquartileRange: 0,
      skewness: null,
    };
  }

  const sorted = [...clean].sort((a, b) => a - b);
  const mean = clean.reduce((sum, value) => sum + value, 0) / count;

  const sumSquaredDeviation = clean.reduce((sum, value) => sum + (value - mean) ** 2, 0);
  const variance = count > 1 ? sumSquaredDeviation / (count - 1) : 0;
  const standardDeviation = Math.sqrt(variance);
  const standardError = count > 0 ? standardDeviation / Math.sqrt(count) : 0;

  const q1 = quantile(sorted, 0.25);
  const q2 = quantile(sorted, 0.5);
  const q3 = quantile(sorted, 0.75);

  let skewness: number | null = null;
  if (count >= 3 && standardDeviation > 0) {
    const cubed = clean.reduce((sum, value) => sum + ((value - mean) / standardDeviation) ** 3, 0);
    skewness = (count / ((count - 1) * (count - 2))) * cubed;
  }

  return {
    count,
    mean,
    median: q2,
    min: sorted[0],
    max: sorted[count - 1],
    variance,
    standardDeviation,
    standardError,
    quartiles: { q1, q2, q3 },
    interquartileRange: q3 - q1,
    skewness,
  };
}

/** A named group of runs plus the per-metric statistics for that group. */
export interface ConditionAggregate {
  conditionId: string;
  label: string;
  runCount: number;
  /** Raw observations per metric, retained so exports stay reproducible. */
  observations: Record<string, number[]>;
  statistics: Record<string, SeriesStatistics>;
}

/** Result of comparing two conditions on one metric. */
export interface ConditionComparison {
  metric: string;
  baselineId: string;
  comparisonId: string;
  baseline: { count: number; mean: number; standardDeviation: number };
  comparison: { count: number; mean: number; standardDeviation: number };
  meanDifference: number;
  /** Fractional change relative to baseline; null when baseline mean is 0. */
  relativeChange: number | null;
  /** Cohen's d using the pooled standard deviation; null when not estimable. */
  cohensD: number | null;
  /** Hedges' g: Cohen's d corrected for small-sample bias. */
  hedgesG: number | null;
  /** Welch's t statistic; null when not estimable. */
  welchT: number | null;
  /** Welch–Satterthwaite degrees of freedom; null when not estimable. */
  degreesOfFreedom: number | null;
  /** Conventional magnitude label for |Cohen's d|. */
  effectMagnitude: 'not-estimable' | 'negligible' | 'small' | 'medium' | 'large';
}

function classifyEffect(d: number | null): ConditionComparison['effectMagnitude'] {
  if (d === null) return 'not-estimable';
  const magnitude = Math.abs(d);
  if (magnitude < 0.2) return 'negligible';
  if (magnitude < 0.5) return 'small';
  if (magnitude < 0.8) return 'medium';
  return 'large';
}

/**
 * Cohen's d with the pooled standard deviation.
 * Returns null when either group has fewer than two observations or the pooled
 * dispersion is zero (in which case a standardised effect is undefined).
 */
export function cohensD(a: readonly number[], b: readonly number[]): number | null {
  const sa = summarizeSeries(a);
  const sb = summarizeSeries(b);
  if (sa.count < 2 || sb.count < 2) return null;

  const df = sa.count + sb.count - 2;
  const pooled = Math.sqrt(((sa.count - 1) * sa.variance + (sb.count - 1) * sb.variance) / df);
  if (!Number.isFinite(pooled) || pooled === 0) return null;

  return (sa.mean - sb.mean) / pooled;
}

/** Hedges' g: Cohen's d with the small-sample bias correction applied. */
export function hedgesG(a: readonly number[], b: readonly number[]): number | null {
  const d = cohensD(a, b);
  if (d === null) return null;

  const n = a.filter(Number.isFinite).length + b.filter(Number.isFinite).length;
  const df = n - 2;
  if (df <= 0) return null;

  const correction = 1 - 3 / (4 * df - 1);
  return d * correction;
}

/**
 * Welch's t-test statistic and Welch–Satterthwaite degrees of freedom.
 * Does not assume equal variances. Returns null when not estimable.
 */
export function welchTTest(
  a: readonly number[],
  b: readonly number[],
): { t: number; degreesOfFreedom: number } | null {
  const sa = summarizeSeries(a);
  const sb = summarizeSeries(b);
  if (sa.count < 2 || sb.count < 2) return null;

  const va = sa.variance / sa.count;
  const vb = sb.variance / sb.count;
  const denominator = Math.sqrt(va + vb);
  if (!Number.isFinite(denominator) || denominator === 0) return null;

  const t = (sa.mean - sb.mean) / denominator;
  const numerator = (va + vb) ** 2;
  const dfDenominator =
    va ** 2 / (sa.count - 1) + vb ** 2 / (sb.count - 1);
  if (!Number.isFinite(dfDenominator) || dfDenominator === 0) return null;

  return { t, degreesOfFreedom: numerator / dfDenominator };
}

/** Compares a condition against a baseline on one metric. */
export function compareConditions(
  metric: string,
  baseline: ConditionAggregate,
  comparison: ConditionAggregate,
): ConditionComparison {
  const baselineValues = baseline.observations[metric] ?? [];
  const comparisonValues = comparison.observations[metric] ?? [];

  const sb = summarizeSeries(baselineValues);
  const sc = summarizeSeries(comparisonValues);

  const d = cohensD(baselineValues, comparisonValues);
  const welch = welchTTest(baselineValues, comparisonValues);
  const meanDifference = sc.mean - sb.mean;

  return {
    metric,
    baselineId: baseline.conditionId,
    comparisonId: comparison.conditionId,
    baseline: {
      count: sb.count,
      mean: sb.mean,
      standardDeviation: sb.standardDeviation,
    },
    comparison: {
      count: sc.count,
      mean: sc.mean,
      standardDeviation: sc.standardDeviation,
    },
    meanDifference,
    relativeChange: sb.mean === 0 ? null : meanDifference / Math.abs(sb.mean),
    cohensD: d,
    hedgesG: hedgesG(baselineValues, comparisonValues),
    welchT: welch?.t ?? null,
    degreesOfFreedom: welch?.degreesOfFreedom ?? null,
    effectMagnitude: classifyEffect(d),
  };
}

/** A single observed run, already reduced to named numeric metrics. */
export interface AnalyticRun {
  runId: string;
  conditionId: string;
  metrics: Record<string, number>;
}

/**
 * Groups runs by condition and computes per-metric statistics for each group.
 * Metric names are discovered from the runs themselves.
 */
export function aggregateRuns(
  runs: readonly AnalyticRun[],
  labels: Record<string, string> = {},
): ConditionAggregate[] {
  const groups = new Map<string, ConditionAggregate>();

  for (const run of runs) {
    if (!run || typeof run.runId !== 'string' || run.runId.trim() === '') {
      throw new Error('Analytic run id must be a non-empty string.');
    }
    if (!run.conditionId || run.conditionId.trim() === '') {
      throw new Error(`Analytic run "${run.runId}" is missing a condition id.`);
    }

    let group = groups.get(run.conditionId);
    if (!group) {
      group = {
        conditionId: run.conditionId,
        label: labels[run.conditionId] ?? run.conditionId,
        runCount: 0,
        observations: {},
        statistics: {},
      };
      groups.set(run.conditionId, group);
    }

    group.runCount += 1;
    for (const [metric, value] of Object.entries(run.metrics ?? {})) {
      if (!Number.isFinite(value)) continue;
      (group.observations[metric] ??= []).push(value);
    }
  }

  for (const group of groups.values()) {
    for (const [metric, values] of Object.entries(group.observations)) {
      group.statistics[metric] = summarizeSeries(values);
    }
  }

  return Array.from(groups.values()).sort((a, b) => a.conditionId.localeCompare(b.conditionId));
}

/** Every metric observed across a set of condition aggregates. */
export function listMetrics(aggregates: readonly ConditionAggregate[]): string[] {
  const metrics = new Set<string>();
  for (const aggregate of aggregates) {
    for (const metric of Object.keys(aggregate.statistics)) metrics.add(metric);
  }
  return Array.from(metrics).sort();
}

/** Compares every condition against a baseline across every shared metric. */
export function compareAgainstBaseline(
  aggregates: readonly ConditionAggregate[],
  baselineId: string,
): ConditionComparison[] {
  const baseline = aggregates.find((aggregate) => aggregate.conditionId === baselineId);
  if (!baseline) {
    throw new Error(`Baseline condition "${baselineId}" is not present in the aggregates.`);
  }

  const comparisons: ConditionComparison[] = [];
  for (const aggregate of aggregates) {
    if (aggregate.conditionId === baselineId) continue;
    for (const metric of listMetrics([baseline, aggregate])) {
      comparisons.push(compareConditions(metric, baseline, aggregate));
    }
  }
  return comparisons;
}

/** The full analytics report for an experiment. */
export interface ResearchAnalyticsReport {
  generatedAt: number;
  runCount: number;
  conditionCount: number;
  metrics: string[];
  conditions: ConditionAggregate[];
  comparisons: ConditionComparison[];
  baselineId: string | null;
}

/** Builds a complete analytics report, optionally against a baseline arm. */
export function buildAnalyticsReport(
  runs: readonly AnalyticRun[],
  options: { baselineId?: string; labels?: Record<string, string>; generatedAt?: number } = {},
): ResearchAnalyticsReport {
  const conditions = aggregateRuns(runs, options.labels);
  const metrics = listMetrics(conditions);

  const baselineId =
    options.baselineId && conditions.some((condition) => condition.conditionId === options.baselineId)
      ? options.baselineId
      : null;

  return {
    generatedAt: options.generatedAt ?? Date.now(),
    runCount: runs.length,
    conditionCount: conditions.length,
    metrics,
    conditions,
    comparisons: baselineId ? compareAgainstBaseline(conditions, baselineId) : [],
    baselineId,
  };
}

/* ------------------------------------------------------------------ export */

const STATISTIC_COLUMNS = [
  'count',
  'mean',
  'median',
  'min',
  'max',
  'variance',
  'standardDeviation',
  'standardError',
  'q1',
  'q3',
  'interquartileRange',
  'skewness',
] as const;

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Condition statistics as CSV, one row per condition/metric pair. */
export function analyticsToCSV(report: ResearchAnalyticsReport): string {
  const header = ['conditionId', 'label', 'metric', ...STATISTIC_COLUMNS];
  const rows: string[][] = [];

  for (const condition of report.conditions) {
    for (const [metric, stats] of Object.entries(condition.statistics)) {
      rows.push([
        condition.conditionId,
        condition.label,
        metric,
        String(stats.count),
        String(stats.mean),
        String(stats.median),
        String(stats.min),
        String(stats.max),
        String(stats.variance),
        String(stats.standardDeviation),
        String(stats.standardError),
        String(stats.quartiles.q1),
        String(stats.quartiles.q3),
        String(stats.interquartileRange),
        stats.skewness === null ? '' : String(stats.skewness),
      ]);
    }
  }

  return [header, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
}

/** Condition comparisons as CSV, one row per metric/condition pair. */
export function comparisonsToCSV(comparisons: readonly ConditionComparison[]): string {
  const header = [
    'metric',
    'baselineId',
    'comparisonId',
    'baselineCount',
    'baselineMean',
    'comparisonCount',
    'comparisonMean',
    'meanDifference',
    'relativeChange',
    'cohensD',
    'hedgesG',
    'welchT',
    'degreesOfFreedom',
    'effectMagnitude',
  ];

  const rows = comparisons.map((comparison) => [
    comparison.metric,
    comparison.baselineId,
    comparison.comparisonId,
    String(comparison.baseline.count),
    String(comparison.baseline.mean),
    String(comparison.comparison.count),
    String(comparison.comparison.mean),
    String(comparison.meanDifference),
    comparison.relativeChange === null ? '' : String(comparison.relativeChange),
    comparison.cohensD === null ? '' : String(comparison.cohensD),
    comparison.hedgesG === null ? '' : String(comparison.hedgesG),
    comparison.welchT === null ? '' : String(comparison.welchT),
    comparison.degreesOfFreedom === null ? '' : String(comparison.degreesOfFreedom),
    comparison.effectMagnitude,
  ]);

  return [header, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
}

/** The whole report as pretty JSON. */
export function analyticsToJSON(report: ResearchAnalyticsReport): string {
  return JSON.stringify(report, null, 2);
}

/** One JSON document per line: a report header followed by each condition. */
export function analyticsToNDJSON(report: ResearchAnalyticsReport): string {
  const lines: string[] = [
    JSON.stringify({
      kind: 'report',
      generatedAt: report.generatedAt,
      runCount: report.runCount,
      conditionCount: report.conditionCount,
      metrics: report.metrics,
      baselineId: report.baselineId,
    }),
  ];

  for (const condition of report.conditions) {
    lines.push(JSON.stringify({ kind: 'condition', ...condition }));
  }
  for (const comparison of report.comparisons) {
    lines.push(JSON.stringify({ kind: 'comparison', ...comparison }));
  }

  return lines.join('\n');
}
