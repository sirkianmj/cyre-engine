/**
 * CYRE Debug Module Exports
 * ---------------------------
 * Public API for debug inspection and professional debugging.
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
