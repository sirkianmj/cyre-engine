/**
 * ResearchDataset
 * -----------------
 * Manages structured research data: experiments, sessions,
 * participant IDs, scenario seeds, and event telemetry.
 * Supports export to JSON and CSV.
 */

import type { TelemetryEvent } from '../analytics/index.js';
import { TelemetryExporter } from '../analytics/index.js';
import type {
  ExperimentMetadata,
  ResearchSession,
  ResearchDatasetExport,
} from './ResearchTypes.js';

export class ResearchDataset {
  private experiments: Map<string, ExperimentMetadata> = new Map();
  private sessions: Map<string, ResearchSession> = new Map();

  /**
   * Create a new experiment.
   * @throws Error if experiment already exists.
   */
  createExperiment(
    id: string,
    name: string,
    options: { description?: string; createdAt?: number } = {},
  ): ExperimentMetadata {
    if (!id || id.trim() === '') {
      throw new Error('Experiment id must be a non-empty string.');
    }
    if (!name || name.trim() === '') {
      throw new Error('Experiment name must be a non-empty string.');
    }
    if (this.experiments.has(id)) {
      throw new Error(`Experiment "${id}" already exists.`);
    }
    const experiment: ExperimentMetadata = {
      id,
      name,
      description: options.description,
      createdAt: options.createdAt ?? Date.now(),
    };
    this.experiments.set(id, experiment);
    return experiment;
  }

  getExperiment(id: string): ExperimentMetadata | undefined {
    return this.experiments.get(id);
  }

  listExperiments(): ExperimentMetadata[] {
    return Array.from(this.experiments.values());
  }

  /**
   * Register a new research session.
   * @throws Error if session already exists or scenario ID empty.
   */
  registerSession(
    sessionId: string,
    scenarioId: string,
    seed: number,
    options: {
      participantId?: string;
      experimentId?: string;
      startTime?: number;
    } = {},
  ): ResearchSession {
    if (!sessionId || sessionId.trim() === '') {
      throw new Error('Session ID must be a non-empty string.');
    }
    if (!scenarioId || scenarioId.trim() === '') {
      throw new Error('Scenario ID must be a non-empty string.');
    }
    if (!Number.isInteger(seed) || seed < 0) {
      throw new Error('Seed must be a non-negative integer.');
    }
    if (this.sessions.has(sessionId)) {
      throw new Error(`Session "${sessionId}" already exists.`);
    }
    if (options.participantId !== undefined && options.participantId.trim() === '') {
      throw new Error('Participant ID cannot be empty if provided.');
    }
    if (options.experimentId !== undefined) {
      if (!this.experiments.has(options.experimentId)) {
        throw new Error(`Experiment "${options.experimentId}" does not exist.`);
      }
    }
    const session: ResearchSession = {
      sessionId,
      scenarioId,
      seed,
      participantId: options.participantId,
      experimentId: options.experimentId,
      startTime: options.startTime ?? Date.now(),
      events: [],
    };
    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * Add a telemetry event to a session.
   * @throws Error if session does not exist.
   */
  addEvent(sessionId: string, event: TelemetryEvent): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session "${sessionId}" does not exist.`);
    }
    session.events.push(event);
  }

  completeSession(sessionId: string, endTime: number = Date.now()): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session "${sessionId}" does not exist.`);
    }
    if (session.endTime !== undefined) {
      throw new Error(`Session "${sessionId}" is already completed.`);
    }
    if (!Number.isInteger(endTime) || endTime < session.startTime) {
      throw new Error('End time must be an integer not less than start time.');
    }
    session.endTime = endTime;
  }

  getSession(sessionId: string): ResearchSession | undefined {
    return this.sessions.get(sessionId);
  }

  listSessionsForExperiment(experimentId: string): ResearchSession[] {
    return Array.from(this.sessions.values()).filter(
      (session) => session.experimentId === experimentId,
    );
  }

  getSessions(): ResearchSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Export all data as a JSON string.
   */
  exportJSON(): string {
    const data: ResearchDatasetExport = {
      experiments: this.listExperiments(),
      sessions: this.getSessions(),
    };
    return JSON.stringify(data, null, 2);
  }

  /**
   * Export all telemetry events as a CSV string.
   */
  exportCSV(): string {
    const allEvents: TelemetryEvent[] = [];
    for (const session of this.sessions.values()) {
      allEvents.push(...session.events);
    }
    return TelemetryExporter.toCSV(allEvents);
  }

  clear(): void {
    this.experiments.clear();
    this.sessions.clear();
  }

  toJSON(): ResearchDatasetExport {
    return {
      experiments: this.listExperiments(),
      sessions: this.getSessions(),
    };
  }
}
