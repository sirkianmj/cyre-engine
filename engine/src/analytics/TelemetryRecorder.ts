/**
 * TelemetryRecorder
 * -----------------
 * Records structured telemetry events for research and analytics.
 * Events are assigned sequential IDs and can be exported to JSON.
 */

import { TelemetryEvent } from './TelemetryEvent.js';

export class TelemetryRecorder {
  private events: TelemetryEvent[];
  private sessionId: string;
  private counter: number;

  constructor(sessionId: string) {
    if (!sessionId || sessionId.trim() === '') {
      throw new Error('Session ID must be a non-empty string.');
    }
    this.sessionId = sessionId;
    this.events = [];
    this.counter = 0;
  }

  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Record a telemetry event.
   * @param type Event type (e.g., 'action', 'decision', 'evidence_view').
   * @param data Optional additional data for the event.
   */
  record(
    type: string,
    data: Partial<Omit<TelemetryEvent, 'id' | 'sessionId' | 'timestamp' | 'type'>> & {
      timestamp?: number;
    } = {},
  ): TelemetryEvent {
    if (!type || type.trim() === '') {
      throw new Error('Telemetry event type must be a non-empty string.');
    }
    const timestamp = data.timestamp ?? Date.now();
    if (!Number.isInteger(timestamp) || timestamp < 0) {
      throw new Error('Telemetry timestamp must be a non-negative integer.');
    }

    const event: TelemetryEvent = {
      id: `${this.sessionId}-event-${++this.counter}`,
      sessionId: this.sessionId,
      timestamp,
      type,
      ...data,
    };
    this.events.push(event);
    return event;
  }

  getEvents(): TelemetryEvent[] {
    return [...this.events];
  }

  getEventCount(): number {
    return this.events.length;
  }

  clear(): void {
    this.events.length = 0;
    this.counter = 0;
  }

  toJSON(): TelemetryEvent[] {
    return this.getEvents();
  }
}
