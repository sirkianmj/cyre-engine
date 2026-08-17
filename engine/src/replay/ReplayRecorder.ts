/**
 * ReplayRecorder
 * ---------------
 * Records events with a monotonically increasing timestamp.
 * The timestamp defaults to current time but can be overridden.
 */

import { ReplayEvent } from './ReplayEvent.js';

export class ReplayRecorder {
  private events: ReplayEvent[] = [];

  record(type: string, data?: unknown, timestamp: number = Date.now()): void {
    if (!type || type.trim() === '') {
      throw new Error('ReplayEvent type must be a non-empty string.');
    }
    if (!Number.isInteger(timestamp) || timestamp < 0) {
      throw new Error('ReplayEvent timestamp must be a non-negative integer.');
    }
    const event: ReplayEvent = {
      id: `event-${this.events.length + 1}`,
      timestamp,
      type,
      data,
    };
    this.events.push(event);
  }

  getEvents(): ReplayEvent[] {
    return [...this.events].sort((a, b) => a.timestamp - b.timestamp);
  }

  clear(): void {
    this.events.length = 0;
  }

  toJSON(): ReplayEvent[] {
    return this.getEvents();
  }
}
