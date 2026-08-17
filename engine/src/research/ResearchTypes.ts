/**
 * ResearchTypes
 * --------------
 * Type definitions for the CYRE research dataset.
 */

import type { TelemetryEvent } from '../analytics/TelemetryEvent.js';

export interface ExperimentMetadata {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
}

export interface ResearchSession {
  sessionId: string;
  scenarioId: string;
  seed: number;
  participantId?: string;
  experimentId?: string;
  startTime: number;
  endTime?: number;
  events: TelemetryEvent[];
}

export interface ResearchDatasetExport {
  experiments: ExperimentMetadata[];
  sessions: ResearchSession[];
}
