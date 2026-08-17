/**
 * DebugSnapshot
 * --------------
 * Represents a snapshot of engine state for debugging.
 */

export interface DebugSnapshot {
  timestamp: number;
  sections: Record<string, unknown>;
  summary: string;
}
