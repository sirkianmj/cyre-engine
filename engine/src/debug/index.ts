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
