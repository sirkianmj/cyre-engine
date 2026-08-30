/**
 * Timeline
 * ---------
 * Stores a chronological list of events and supports sorting,
 * filtering, and querying by time range, type, or source/target.
 */

import type { TimelineEvent } from './TimelineTypes.js';

export class Timeline {
  private events: TimelineEvent[] = [];

  add(event: TimelineEvent): void {
    if (!event.id || event.id.trim() === '') {
      throw new Error('TimelineEvent id must be a non-empty string.');
    }
    if (!event.type || event.type.trim() === '') {
      throw new Error('TimelineEvent type must be a non-empty string.');
    }
    if (!Number.isInteger(event.timestamp) || event.timestamp < 0) {
      throw new Error('TimelineEvent timestamp must be a non-negative integer.');
    }
    if (this.events.some((e) => e.id === event.id)) {
      throw new Error(`TimelineEvent "${event.id}" already exists.`);
    }
    this.events.push({ ...event });
  }

  addMany(events: TimelineEvent[]): void {
    for (const event of events) {
      this.add(event);
    }
  }

  getEvent(id: string): TimelineEvent | undefined {
    return this.events.find((e) => e.id === id);
  }

  getAll(): TimelineEvent[] {
    return this.sortByTime([...this.events]);
  }

  filterByType(type: string): TimelineEvent[] {
    return this.sortByTime(this.events.filter((e) => e.type === type));
  }

  filterBySource(sourceId: string): TimelineEvent[] {
    return this.sortByTime(this.events.filter((e) => e.sourceId === sourceId));
  }

  filterByTarget(targetId: string): TimelineEvent[] {
    return this.sortByTime(this.events.filter((e) => e.targetId === targetId));
  }

  filterByTimeRange(start: number, end: number): TimelineEvent[] {
    if (start > end) {
      throw new Error('Start time must be less than or equal to end time.');
    }
    return this.sortByTime(
      this.events.filter((e) => e.timestamp >= start && e.timestamp <= end),
    );
  }

  clear(): void {
    this.events.length = 0;
  }

  private sortByTime(events: TimelineEvent[]): TimelineEvent[] {
    return events.sort((a, b) => a.timestamp - b.timestamp);
  }

  toJSON(): TimelineEvent[] {
    return this.getAll();
  }
}
