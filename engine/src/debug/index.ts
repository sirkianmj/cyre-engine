/**
 * CYRE Debug Module Exports
 * ---------------------------
 * Public API for debug inspection, professional debugging, and profiling.
 */

export type { DebugSnapshot } from './DebugSnapshot.js';
export { DebugInspector } from './DebugInspector.js';
export { DebugBreakpoint } from './DebugBreakpoint.js';
export type {
  DebugBreakpointOptions,
  DebuggerContext,
} from './DebugBreakpoint.js';
export {
  createDebugEventRecord,
} from './DebugEventRecord.js';
export type { DebugEventRecord } from './DebugEventRecord.js';
export { CyreDebugger } from './CyreDebugger.js';
export type {
  CyreDebuggerOptions,
  CyreDebuggerState,
  CyreDebuggerSnapshot,
  EventQuery,
} from './CyreDebugger.js';
export { PerformanceProfiler } from './PerformanceProfiler.js';
export type {
  PerformanceProfilerOptions,
  PerformanceProfileSnapshot,
  ProfilerMemoryUsage,
  ProfilerSectionSnapshot,
  ProfilerOperationStats,
  ProfilerEventRecord,
} from './PerformanceProfiler.js';
export { ResourceDiagnostics } from './ResourceDiagnostics.js';
export type {
  ResourceDiagnosticsOptions,
  ResourceDiagnosticsSnapshot,
  ResourceMetricKey,
  ResourceSample,
  ResourceUsageSnapshot,
  ResourceThresholdResult,
} from './ResourceDiagnostics.js';

export {
  PERFORMANCE_AUDIT_SEVERITIES,
  PERFORMANCE_AUDIT_CATEGORIES,
  isPerformanceAuditSeverity,
  isPerformanceAuditCategory,
} from './PerformanceAuditTypes.js';
export type {
  PerformanceAuditSeverity,
  PerformanceAuditCategory,
  PerformanceAuditIssue,
  PerformanceAuditReport,
  PerformanceAuditThresholds,
  PerformanceAuditSystemOptions,
} from './PerformanceAuditTypes.js';
export { PerformanceAuditSystem } from './PerformanceAuditSystem.js';
