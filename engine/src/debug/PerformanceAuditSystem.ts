import { PerformanceProfiler } from './PerformanceProfiler.js';
import type {
  PerformanceProfileSnapshot,
  ProfilerMemoryUsage,
} from './PerformanceProfiler.js';
import { ResourceDiagnostics } from './ResourceDiagnostics.js';
import type {
  ResourceDiagnosticsSnapshot,
} from './ResourceDiagnostics.js';
import {
  isPerformanceAuditCategory,
  isPerformanceAuditSeverity,
  type PerformanceAuditCategory,
  type PerformanceAuditIssue,
  type PerformanceAuditReport,
  type PerformanceAuditSeverity,
  type PerformanceAuditSystemOptions,
  type PerformanceAuditThresholds,
} from './PerformanceAuditTypes.js';

interface SimulationProfilerLike {
  validate(): void;
  createSnapshot(): {
    name: string;
    tickCount: number;
    totalTickDurationMs: number;
    operationCount: number;
    queueDepthCurrent: number;
    queueDepthPeak: number;
    eventKindCounts: Record<string, number>;
    summary: string;
  };
}

function isRecord(value: unknown): boolean {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertNonEmpty(value: string, label: string): void {
  if (!value || value.trim() === '') {
    throw new Error(`${label} must be a non-empty string.`);
  }
}

function finiteNonNegative(value: number | undefined, label: string): boolean {
  return value === undefined || (Number.isFinite(value) && value >= 0);
}

export class PerformanceAuditSystem {
  readonly name: string;
  private readonly performanceProfiler?: PerformanceProfiler;
  private readonly resourceDiagnostics?: ResourceDiagnostics;
  private readonly simulationProfiler?: SimulationProfilerLike;
  private readonly thresholds: PerformanceAuditThresholds;
  private issueCounter = 0;

  constructor(options: {
    name?: string;
    performanceProfiler?: PerformanceProfiler;
    resourceDiagnostics?: ResourceDiagnostics;
    simulationProfiler?: SimulationProfilerLike;
    thresholds?: PerformanceAuditThresholds;
  } = {}) {
    this.validateOptions(options);

    this.name = options.name ?? 'CYRE Performance Audit';
    this.performanceProfiler = options.performanceProfiler;
    this.resourceDiagnostics = options.resourceDiagnostics;
    this.simulationProfiler = options.simulationProfiler;
    this.thresholds = options.thresholds ?? {};
  }

  audit(): PerformanceAuditReport {
    const issues: PerformanceAuditIssue[] = [];

    this.auditPerformanceProfiler(issues);
    this.auditResourceDiagnostics(issues);
    this.auditSimulationProfiler(issues);

    const criticalCount = issues.filter((issue) => issue.severity === 'critical').length;
    const warningCount = issues.filter((issue) => issue.severity === 'warning').length;
    const infoCount = issues.filter((issue) => issue.severity === 'info').length;

    return {
      name: this.name,
      timestamp: Date.now(),
      issueCount: issues.length,
      criticalCount,
      warningCount,
      infoCount,
      passed: criticalCount === 0,
      issues,
      summary: [
        this.name,
        `${issues.length} issues`,
        `critical=${criticalCount}`,
        `warning=${warningCount}`,
        `info=${infoCount}`,
        criticalCount === 0 ? 'passed' : 'failed',
      ].join(' | '),
    };
  }

  validate(): void {
    assertNonEmpty(this.name, 'PerformanceAuditSystem name');

    if (
      this.performanceProfiler &&
      !(this.performanceProfiler instanceof PerformanceProfiler)
    ) {
      throw new Error(
        'PerformanceAuditSystem performanceProfiler must be a PerformanceProfiler instance.',
      );
    }
    if (
      this.resourceDiagnostics &&
      !(this.resourceDiagnostics instanceof ResourceDiagnostics)
    ) {
      throw new Error(
        'PerformanceAuditSystem resourceDiagnostics must be a ResourceDiagnostics instance.',
      );
    }
    if (this.simulationProfiler) {
      this.simulationProfiler.validate();
    }

    this.validateThresholds(this.thresholds);
  }

  private auditPerformanceProfiler(issues: PerformanceAuditIssue[]): void {
    if (!this.performanceProfiler) return;

    const snapshot = this.performanceProfiler.createSnapshot();
    const maxCpuTimeMs = this.thresholds.maxCpuTimeMs;
    if (maxCpuTimeMs !== undefined && snapshot.cpuTimeMs > maxCpuTimeMs) {
      this.addIssue(issues, 'cpu', 'critical', {
        message: `CPU time ${snapshot.cpuTimeMs.toFixed(2)}ms exceeds threshold ${maxCpuTimeMs.toFixed(2)}ms.`,
        source: 'performance-profiler',
      });
    }

    if (snapshot.activeSectionCount > 0) {
      this.addIssue(issues, 'cpu', 'warning', {
        message: `${snapshot.activeSectionCount} profiler sections are still running.`,
        source: 'performance-profiler',
      });
    }

    this.auditEventThroughput(snapshot, issues);
  }

  private auditEventThroughput(
    snapshot: PerformanceProfileSnapshot,
    issues: PerformanceAuditIssue[],
  ): void {
    const maxThroughput = this.thresholds.maxEventThroughputPerSecond;
    if (maxThroughput === undefined) return;

    const now = snapshot.timestamp;
    const events = snapshot.recentEvents ?? [];
    const recent = events.filter((event) => event.timestamp >= now - 1000);

    if (recent.length > maxThroughput) {
      this.addIssue(issues, 'event-throughput', 'warning', {
        message: `Event throughput ${recent.length}/sec exceeds threshold ${maxThroughput}/sec.`,
        source: 'performance-profiler',
      });
    }
  }

  private auditResourceDiagnostics(issues: PerformanceAuditIssue[]): void {
    if (!this.resourceDiagnostics) return;

    const snapshot = this.resourceDiagnostics.createSnapshot();
    const maxHeapUsed = this.thresholds.maxHeapUsed;
    if (maxHeapUsed !== undefined && snapshot.currentMemory.heapUsed > maxHeapUsed) {
      this.addIssue(issues, 'memory', 'critical', {
        message: `Heap used ${snapshot.currentMemory.heapUsed} exceeds threshold ${maxHeapUsed}.`,
        source: 'resource-diagnostics',
      });
    }

    const peakGrowth = snapshot.memoryDeltaFromBaseline.heapUsed;
    if (peakGrowth !== undefined && peakGrowth > 0) {
      this.addIssue(issues, 'memory', 'info', {
        message: `Heap usage grew by ${peakGrowth} bytes from baseline.`,
        source: 'resource-diagnostics',
      });
    }

    if (snapshot.growthIssues.length > 0) {
      this.addIssue(issues, 'resource', 'warning', {
        message: `${snapshot.growthIssues.length} resource growth issue(s) detected.`,
        source: 'resource-diagnostics',
      });
    }
  }

  private auditSimulationProfiler(issues: PerformanceAuditIssue[]): void {
    if (!this.simulationProfiler) return;

    const snapshot = this.simulationProfiler.createSnapshot();

    const maxTickCount = this.thresholds.maxSimulationTickCount;
    if (maxTickCount !== undefined && snapshot.tickCount > maxTickCount) {
      this.addIssue(issues, 'simulation', 'warning', {
        message: `Simulation tick count ${snapshot.tickCount} exceeds threshold ${maxTickCount}.`,
        source: 'simulation-profiler',
      });
    }

    const maxQueueDepth = this.thresholds.maxQueueDepth;
    if (maxQueueDepth !== undefined && snapshot.queueDepthPeak > maxQueueDepth) {
      this.addIssue(issues, 'simulation', 'critical', {
        message: `Simulation queue peak depth ${snapshot.queueDepthPeak} exceeds threshold ${maxQueueDepth}.`,
        source: 'simulation-profiler',
      });
    }
  }

  private addIssue(
    issues: PerformanceAuditIssue[],
    category: PerformanceAuditCategory,
    severity: PerformanceAuditSeverity,
    data: { message: string; source?: string },
  ): void {
    assertNonEmpty(category, 'Performance audit category');
    assertNonEmpty(data.message, 'Performance audit message');
    if (!isPerformanceAuditCategory(category)) {
      throw new Error(`Invalid performance audit category "${category}".`);
    }
    if (!isPerformanceAuditSeverity(severity)) {
      throw new Error(`Invalid performance audit severity "${severity}".`);
    }

    this.issueCounter += 1;
    issues.push({
      id: `performance-audit-${this.issueCounter}`,
      category,
      severity,
      message: data.message,
      source: data.source,
    });
  }

  private validateThresholds(thresholds: PerformanceAuditThresholds): void {
    const entries: Array<[string, number | undefined]> = [
      ['maxCpuTimeMs', thresholds.maxCpuTimeMs],
      ['maxHeapUsed', thresholds.maxHeapUsed],
      ['maxEventThroughputPerSecond', thresholds.maxEventThroughputPerSecond],
      ['maxSimulationTickCount', thresholds.maxSimulationTickCount],
      ['maxQueueDepth', thresholds.maxQueueDepth],
    ];

    for (const [label, value] of entries) {
      if (!finiteNonNegative(value, label)) {
        throw new Error(`${label} must be a non-negative finite number.`);
      }
    }
  }

  private validateOptions(options: {
    name?: string;
    performanceProfiler?: PerformanceProfiler;
    resourceDiagnostics?: ResourceDiagnostics;
    simulationProfiler?: SimulationProfilerLike;
    thresholds?: PerformanceAuditThresholds;
  }): void {
    if (!isRecord(options)) {
      throw new Error('PerformanceAuditSystem options must be an object.');
    }
    if (options.name !== undefined && typeof options.name === 'string' && options.name.trim() === '') {
      throw new Error('PerformanceAuditSystem name cannot be empty if provided.');
    }
    if (options.thresholds !== undefined && !isRecord(options.thresholds)) {
      throw new Error('PerformanceAuditSystem thresholds must be an object.');
    }
  }
}
