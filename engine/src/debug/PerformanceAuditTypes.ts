export const PERFORMANCE_AUDIT_SEVERITIES = [
  'critical',
  'warning',
  'info',
] as const;

export type PerformanceAuditSeverity =
  (typeof PERFORMANCE_AUDIT_SEVERITIES)[number];

export function isPerformanceAuditSeverity(
  value: string,
): value is PerformanceAuditSeverity {
  return (PERFORMANCE_AUDIT_SEVERITIES as readonly string[]).includes(value);
}

export const PERFORMANCE_AUDIT_CATEGORIES = [
  'cpu',
  'memory',
  'event-throughput',
  'simulation',
  'resource',
] as const;

export type PerformanceAuditCategory =
  (typeof PERFORMANCE_AUDIT_CATEGORIES)[number];

export function isPerformanceAuditCategory(
  value: string,
): value is PerformanceAuditCategory {
  return (PERFORMANCE_AUDIT_CATEGORIES as readonly string[]).includes(value);
}

export interface PerformanceAuditIssue {
  id: string;
  category: PerformanceAuditCategory;
  severity: PerformanceAuditSeverity;
  message: string;
  source?: string;
}

export interface PerformanceAuditReport {
  name: string;
  timestamp: number;
  issueCount: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  passed: boolean;
  issues: PerformanceAuditIssue[];
  summary: string;
}

export interface PerformanceAuditThresholds {
  maxCpuTimeMs?: number;
  maxHeapUsed?: number;
  maxEventThroughputPerSecond?: number;
  maxSimulationTickCount?: number;
  maxQueueDepth?: number;
}

export interface PerformanceAuditSystemOptions {
  name?: string;
  thresholds?: PerformanceAuditThresholds;
}
