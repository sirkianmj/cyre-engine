/**
 * TelemetryEvent
 * ---------------
 * A single event recorded during a game/simulation session.
 * Follows a structured schema for research reproducibility.
 */

export interface TelemetryEvent {
  id: string;
  sessionId: string;
  timestamp: number;
  type: string;
  targetId?: string;
  decision?: string;
  evidenceViewed?: boolean;
  evidenceIgnored?: boolean;
  success?: boolean;
  failure?: boolean;
  responseTimeMs?: number;
  investigationPath?: string[];
  finalOutcome?: string;
  data?: Record<string, unknown>;
}
