/**
 * BenchmarkService
 * -----------------
 * Runs the engine's cyber simulation benchmarks and keeps the machine
 * readable reports so the Studio can display and export them.
 */

import {
  runCyberSimulationBenchmark,
  runLargeCyberNetworkBenchmark,
} from '@cyre/engine';

import type {
  CyberSimulationBenchmarkResult,
  LargeNetworkBenchmarkResult,
} from '@cyre/engine';

export type BenchmarkKind = 'simulation' | 'large-network';

export interface BenchmarkReport {
  id: string;
  kind: BenchmarkKind;
  label: string;
  ranAt: number;
  simulation: CyberSimulationBenchmarkResult | null;
  largeNetwork: LargeNetworkBenchmarkResult | null;
}

export class BenchmarkService {
  private reports: BenchmarkReport[] = [];
  private listeners = new Set<() => void>();
  private sequence = 0;

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  list(): BenchmarkReport[] {
    return [...this.reports];
  }

  clear(): void {
    if (this.reports.length === 0) return;
    this.reports = [];
    this.emit();
  }

  runSimulationBenchmark(iterations = 200): BenchmarkReport {
    const result = runCyberSimulationBenchmark(iterations);
    return this.record({
      kind: 'simulation',
      label: `${iterations} seeded cyber simulations`,
      simulation: result,
      largeNetwork: null,
    });
  }

  runLargeNetworkBenchmark(hostCount = 1000): BenchmarkReport {
    const result = runLargeCyberNetworkBenchmark(hostCount);
    return this.record({
      kind: 'large-network',
      label: `${hostCount}-host network initialization`,
      simulation: null,
      largeNetwork: result,
    });
  }

  exportJSON(): string {
    return JSON.stringify(this.reports, null, 2);
  }

  /** Flattened CSV of every recorded benchmark report. */
  exportCSV(): string {
    const headers = [
      'id',
      'kind',
      'label',
      'ranAt',
      'iterations',
      'durationMs',
      'operationsPerSecond',
      'completed',
      'hostCount',
      'initialized',
    ];

    const rows = this.reports.map((report) =>
      [
        report.id,
        report.kind,
        report.label,
        report.ranAt,
        report.simulation?.iterations ?? '',
        report.simulation?.durationMs ?? report.largeNetwork?.durationMs ?? '',
        report.simulation?.operationsPerSecond ?? '',
        report.simulation?.completed ?? '',
        report.largeNetwork?.hostCount ?? '',
        report.largeNetwork?.initialized ?? '',
      ].join(','),
    );

    return [headers.join(','), ...rows].join('\n');
  }

  private record(input: {
    kind: BenchmarkKind;
    label: string;
    simulation: CyberSimulationBenchmarkResult | null;
    largeNetwork: LargeNetworkBenchmarkResult | null;
  }): BenchmarkReport {
    this.sequence += 1;
    const report: BenchmarkReport = {
      id: `benchmark-${this.sequence}`,
      kind: input.kind,
      label: input.label,
      ranAt: Date.now(),
      simulation: input.simulation,
      largeNetwork: input.largeNetwork,
    };

    this.reports = [...this.reports, report];
    this.emit();
    return report;
  }

  private emit(): void {
    for (const listener of Array.from(this.listeners)) listener();
  }
}
