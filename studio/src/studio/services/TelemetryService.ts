/**
 * TelemetryService
 * -----------------
 * Records structured telemetry for a Studio session using the engine's
 * `TelemetryRecorder`, and exports it through the engine's
 * `TelemetryExporter` (JSON / CSV) plus newline-delimited JSON.
 */

import { TelemetryExporter, TelemetryRecorder } from '@cyre/engine';

import type { TelemetryEvent } from '@cyre/engine';

export type TelemetryExportFormat = 'json' | 'csv' | 'ndjson';

export const TELEMETRY_EXPORT_FORMATS: readonly TelemetryExportFormat[] = [
  'json',
  'csv',
  'ndjson',
];

export const TELEMETRY_EXPORT_MIME: Record<TelemetryExportFormat, string> = {
  json: 'application/json',
  csv: 'text/csv',
  ndjson: 'application/x-ndjson',
};

export class TelemetryService {
  private recorder: TelemetryRecorder;
  private listeners = new Set<() => void>();
  private actionSequence = 0;

  constructor(sessionId = 'cyre-studio-session') {
    this.recorder = new TelemetryRecorder(sessionId);
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getSessionId(): string {
    return this.recorder.getSessionId();
  }

  /** Starts a fresh telemetry session; returns the new session id. */
  startSession(sessionId: string): string {
    if (!sessionId.trim()) {
      throw new Error('Telemetry session id must be a non-empty string.');
    }
    this.recorder = new TelemetryRecorder(sessionId.trim());
    this.actionSequence = 0;
    this.emit();
    return this.recorder.getSessionId();
  }

  record(type: string, data: Record<string, unknown> = {}): TelemetryEvent {
    const event = this.recorder.record(type, data);
    this.emit();
    return event;
  }

  /**
   * Records a simulation action with the research-oriented fields the
   * engine's telemetry schema defines.
   */
  recordAction(
    action: string,
    context: {
      success: boolean;
      error?: string | null;
      durationMs: number;
      scenarioId: string;
      seed: number;
      attackStage?: string;
      attackerPosition?: string;
      evidenceViewed?: boolean;
      investigationPath?: string[];
    },
  ): TelemetryEvent {
    this.actionSequence += 1;

    const event = this.recorder.record('simulation_action', {
      targetId: action,
      decision: action,
      success: context.success,
      failure: !context.success,
      responseTimeMs: Math.round(context.durationMs),
      evidenceViewed: context.evidenceViewed ?? false,
      investigationPath: context.investigationPath,
      data: {
        sequence: this.actionSequence,
        scenarioId: context.scenarioId,
        seed: context.seed,
        attackStage: context.attackStage,
        attackerPosition: context.attackerPosition,
        error: context.error ?? undefined,
      },
    });

    this.emit();
    return event;
  }

  getEvents(): TelemetryEvent[] {
    return this.recorder.getEvents();
  }

  getEventCount(): number {
    return this.recorder.getEventCount();
  }

  clear(): void {
    this.recorder.clear();
    this.emit();
  }

  export(format: TelemetryExportFormat): string {
    const events = this.recorder.getEvents();

    if (format === 'json') return TelemetryExporter.toJSON(events);
    if (format === 'csv') return TelemetryExporter.toCSV(events);
    if (format === 'ndjson') return TelemetryService.toNDJSON(events);

    throw new Error(`Unsupported telemetry export format "${format}".`);
  }

  static toNDJSON(events: TelemetryEvent[]): string {
    return events.map((event) => JSON.stringify(event)).join('\n');
  }

  private emit(): void {
    for (const listener of Array.from(this.listeners)) listener();
  }
}
