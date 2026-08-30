/**
 * ExperimentService
 * ------------------
 * Drives the engine's reproducible `CyberSimulationExperimentRunner`:
 * create an experiment definition, run seeded batches, compare runs and
 * export the resulting telemetry.
 */

import {
  CyberSimulationExperimentRunner,
  aggregateRuns,
  analyticsToCSV,
  analyticsToJSON,
  analyticsToNDJSON,
  buildAnalyticsReport,
  compareAgainstBaseline,
  listMetrics,
  summarizeSeries,
} from '@cyre/engine';

import type { AnalyticRun, ResearchAnalyticsReport } from '@cyre/engine';

import type {
  CyberSimulationExperimentDefinition,
  CyberSimulationExperimentOutput,
  CyberSimulationExperimentRunResult,
  CyberSimulationReplayAction,
} from '@cyre/engine';

import type { TelemetryExportFormat } from './TelemetryService';
import { TELEMETRY_EXPORT_MIME } from './TelemetryService';

export interface ExperimentRunSummary {
  participantId: string;
  seed: number;
  success: boolean;
  error: string | null;
  attackerPosition: string;
  attackerPrivileges: string;
  attackStage: string;
  objectiveAchieved: boolean;
  compromisedHosts: number;
  isolatedHosts: number;
  alertCount: number;
  evidenceCount: number;
  blockedPathCount: number;
  eventCount: number;
  telemetryCount: number;
}

export interface ExperimentComparison {
  experimentId: string;
  runCount: number;
  successCount: number;
  objectiveAchievedCount: number;
  meanCompromisedHosts: number;
  meanAlertCount: number;
  meanEventCount: number;
  uniqueFinalStates: number;
  deterministic: boolean;
  runs: ExperimentRunSummary[];
}

export interface StoredExperiment {
  definition: CyberSimulationExperimentDefinition;
  output: CyberSimulationExperimentOutput;
  comparison: ExperimentComparison;
}

const DEFAULT_ACTION_PLAN: CyberSimulationReplayAction[] = [
  { method: 'runRecon' },
  { method: 'discoverServices' },
  { method: 'exploitWebServer' },
  { method: 'escalatePrivileges' },
  { method: 'moveToDatabase' },
  { method: 'accessTarget' },
  { method: 'detectThreats' },
];

export function createExperimentDefinition(
  input: {
    id: string;
    name: string;
    description?: string;
    scenarioId?: string;
    seedStart: number;
    runCount: number;
    actionPlan?: CyberSimulationReplayAction[];
  },
): CyberSimulationExperimentDefinition {
  return {
    id: input.id.trim(),
    name: input.name.trim(),
    description: input.description?.trim() || undefined,
    scenarioId: input.scenarioId?.trim() || undefined,
    seedStart: input.seedStart,
    runCount: input.runCount,
    actionPlan: input.actionPlan ?? DEFAULT_ACTION_PLAN.map((action) => ({ ...action })),
  };
}

export function summarizeRun(
  result: CyberSimulationExperimentRunResult,
): ExperimentRunSummary {
  const state = result.finalState;
  const hosts = Object.values(state?.hosts ?? {});

  return {
    participantId: result.participantId,
    seed: result.seed,
    success: result.success,
    error: result.error ?? null,
    attackerPosition: state?.attacker?.position ?? 'n/a',
    attackerPrivileges: state?.attacker?.privileges ?? 'n/a',
    attackStage: state?.attackStage ?? 'n/a',
    objectiveAchieved: state?.objective?.achieved ?? false,
    compromisedHosts: hosts.filter((host) => host.compromised).length,
    isolatedHosts: hosts.filter((host) => host.isolated).length,
    alertCount: state?.alerts?.length ?? 0,
    evidenceCount: state?.evidence?.length ?? 0,
    blockedPathCount: state?.blockedPaths?.length ?? 0,
    eventCount: result.eventHistory.length,
    telemetryCount: result.telemetry.length,
  };
}

export function compareRuns(
  experimentId: string,
  results: CyberSimulationExperimentRunResult[],
): ExperimentComparison {
  const runs = results.map(summarizeRun);
  const successful = runs.filter((run) => run.success);
  const mean = (values: number[]): number =>
    values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;

  const finalStates = new Set(
    successful.map((run) =>
      [run.attackerPosition, run.attackerPrivileges, run.attackStage, run.compromisedHosts].join('|'),
    ),
  );

  return {
    experimentId,
    runCount: runs.length,
    successCount: successful.length,
    objectiveAchievedCount: successful.filter((run) => run.objectiveAchieved).length,
    meanCompromisedHosts: mean(successful.map((run) => run.compromisedHosts)),
    meanAlertCount: mean(successful.map((run) => run.alertCount)),
    meanEventCount: mean(successful.map((run) => run.eventCount)),
    uniqueFinalStates: finalStates.size,
    deterministic: finalStates.size <= 1,
    runs,
  };
}

export class ExperimentService {
  private readonly runner = new CyberSimulationExperimentRunner();
  private experiments: StoredExperiment[] = [];
  private listeners = new Set<() => void>();

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  list(): StoredExperiment[] {
    return [...this.experiments];
  }

  getLatest(): StoredExperiment | null {
    return this.experiments[this.experiments.length - 1] ?? null;
  }

  /** Validates a definition without running it. */
  validate(definition: CyberSimulationExperimentDefinition): { valid: boolean; error: string | null } {
    try {
      this.runner.runOne(definition, 'validation-probe', definition.seedStart);
      return { valid: true, error: null };
    } catch (error) {
      return { valid: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  run(definition: CyberSimulationExperimentDefinition): StoredExperiment {
    const output = this.runner.run(definition);
    const comparison = compareRuns(definition.id, output.results);
    const stored: StoredExperiment = { definition, output, comparison };

    this.experiments = [...this.experiments, stored].slice(-10);
    this.emit();
    return stored;
  }

  clear(): void {
    if (this.experiments.length === 0) return;
    this.experiments = [];
    this.emit();
  }

  export(format: TelemetryExportFormat, experiment: StoredExperiment = this.requireLatest()): string {
    const results = experiment.output.results;

    if (format === 'json') return this.runner.exportResultsJSON(results);
    if (format === 'csv') return this.runner.exportResultsCSV(results);
    if (format === 'ndjson') return this.runner.exportResultsNDJSON(results);

    throw new Error(`Unsupported experiment export format "${format}".`);
  }

  exportComparison(experiment: StoredExperiment = this.requireLatest()): string {
    return JSON.stringify(experiment.comparison, null, 2);
  }

  /**
   * Flattens stored experiments into analytic runs. Each experiment
   * definition becomes a condition, so two configurations (for example a
   * run with and without detection) can be compared statistically.
   */
  toAnalyticRuns(experiments: StoredExperiment[] = this.experiments): AnalyticRun[] {
    const runs: AnalyticRun[] = [];

    for (const experiment of experiments) {
      for (const result of experiment.output.results) {
        if (!result.success) continue;

        const state = result.finalState;
        const hosts = Object.values(state?.hosts ?? {});

        runs.push({
          runId: result.participantId,
          conditionId: experiment.definition.id,
          metrics: {
            compromisedHosts: hosts.filter((host) => host.compromised).length,
            isolatedHosts: hosts.filter((host) => host.isolated).length,
            alertCount: state?.alerts?.length ?? 0,
            evidenceCount: state?.evidence?.length ?? 0,
            blockedPaths: state?.blockedPaths?.length ?? 0,
            defenderActions: state?.defenderActions?.length ?? 0,
            eventCount: result.eventHistory.length,
            telemetryCount: result.telemetry.length,
            objectiveAchieved: state?.objective?.achieved ? 1 : 0,
          },
        });
      }
    }

    return runs;
  }

  /** Builds the analytics report across all stored experiments. */
  buildAnalytics(options: { baselineId?: string } = {}): ResearchAnalyticsReport {
    const experiments = this.experiments;
    const labels: Record<string, string> = {};
    for (const experiment of experiments) {
      labels[experiment.definition.id] = experiment.definition.name;
    }

    return buildAnalyticsReport(this.toAnalyticRuns(experiments), {
      labels,
      baselineId: options.baselineId ?? experiments[0]?.definition.id,
    });
  }

  /** Exports the analytics report in the requested format. */
  exportAnalytics(
    format: 'json' | 'csv' | 'ndjson' | 'comparisons-csv',
    options: { baselineId?: string } = {},
  ): string {
    const report = this.buildAnalytics(options);

    if (format === 'json') return analyticsToJSON(report);
    if (format === 'csv') return analyticsToCSV(report);
    if (format === 'ndjson') return analyticsToNDJSON(report);
    if (format === 'comparisons-csv') {
      const baselineId = report.baselineId;
      if (!baselineId) return '';
      return comparisonsCSV(report, baselineId);
    }

    throw new Error(`Unsupported analytics export format "${format}".`);
  }

  static get exportMime(): Record<TelemetryExportFormat, string> {
    return TELEMETRY_EXPORT_MIME;
  }

  private requireLatest(): StoredExperiment {
    const latest = this.getLatest();
    if (!latest) throw new Error('No experiment has been run yet.');
    return latest;
  }

  private emit(): void {
    for (const listener of Array.from(this.listeners)) listener();
  }
}


function comparisonsCSV(report: ResearchAnalyticsReport, baselineId: string): string {
  const comparisons = compareAgainstBaseline(report.conditions, baselineId);
  const header = [
    'metric',
    'baselineId',
    'comparisonId',
    'baselineMean',
    'comparisonMean',
    'meanDifference',
    'relativeChange',
    'cohensD',
    'hedgesG',
    'welchT',
    'degreesOfFreedom',
    'effectMagnitude',
  ];

  const rows = comparisons.map((comparison) =>
    [
      comparison.metric,
      comparison.baselineId,
      comparison.comparisonId,
      comparison.baseline.mean,
      comparison.comparison.mean,
      comparison.meanDifference,
      comparison.relativeChange ?? '',
      comparison.cohensD ?? '',
      comparison.hedgesG ?? '',
      comparison.welchT ?? '',
      comparison.degreesOfFreedom ?? '',
      comparison.effectMagnitude,
    ].join(','),
  );

  return [header.join(','), ...rows].join('\n');
}

// Re-exported so the Studio window can render distribution details directly.
export { aggregateRuns, listMetrics, summarizeSeries };
export type { AnalyticRun, ResearchAnalyticsReport };
