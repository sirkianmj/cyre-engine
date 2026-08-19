import { ReplayRecorder } from './ReplayRecorder.js';
import { ReplayPlayer } from './ReplayPlayer.js';
import type { ReplayEvent } from './ReplayEvent.js';

export interface ReplayBookmark {
  id: string;
  index: number;
  label: string;
  createdAt: number;
}

export interface ReplaySnapshotComparison {
  fromIndex: number;
  toIndex: number;
  fromData: unknown;
  toData: unknown;
  changed: boolean;
}

export class ReplayStudio {
  private events: ReplayEvent[] = [];
  private player?: ReplayPlayer;
  private currentIndex = 0;
  private readonly bookmarks = new Map<string, ReplayBookmark>();
  private readonly recorder = new ReplayRecorder();
  private snapshotIndex?: number;
  private snapshotData?: unknown;

  constructor(events: ReplayEvent[] = []) {
    this.load(events);
  }

  load(events: ReplayEvent[]): void {
    if (!Array.isArray(events)) {
      throw new Error('Replay events must be an array.');
    }

    this.events = events
      .map((event) => this.copyEvent(event))
      .sort((a, b) => a.timestamp - b.timestamp || a.id.localeCompare(b.id));

    this.events.forEach((event, index) => {
      this.validateEvent(event, index);
    });

    this.player = new ReplayPlayer(this.events);
    this.currentIndex = 0;
    this.bookmarks.clear();
    this.snapshotIndex = undefined;
    this.snapshotData = undefined;
    this.recorder.clear();
  }

  record(type: string, data?: unknown, timestamp: number = Date.now()): ReplayEvent {
    this.recorder.record(type, data, timestamp);
    const events = this.recorder.getEvents();
    this.load(events);
    return this.events[this.events.length - 1];
  }

  getEventCount(): number {
    return this.events.length;
  }

  listEvents(): ReplayEvent[] {
    return this.events.map((event) => this.copyEvent(event));
  }

  getCurrentIndex(): number {
    return this.currentIndex;
  }

  getCurrentEvent(): ReplayEvent | undefined {
    if (this.currentIndex < 0 || this.currentIndex >= this.events.length) {
      return undefined;
    }
    return this.copyEvent(this.events[this.currentIndex]);
  }

  step(): ReplayEvent | undefined {
    if (this.currentIndex >= this.events.length - 1) {
      return undefined;
    }

    this.setIndex(this.currentIndex + 1);
    return this.getCurrentEvent();
  }

  play(): ReplayEvent | undefined {
    if (this.currentIndex >= this.events.length - 1) {
      return undefined;
    }

    let lastEvent: ReplayEvent | undefined;
    while (this.currentIndex < this.events.length - 1) {
      lastEvent = this.step();
    }

    return lastEvent;
  }

  pause(): void {
    // Playback is synchronous in this domain model.
    // Calling pause does not alter the current position.
  }

  stop(): void {
    this.setIndex(0);
  }

  jumpTo(index: number): ReplayEvent {
    this.setIndex(index);
    const event = this.getCurrentEvent();
    if (!event) {
      throw new Error(`Replay index ${index} is out of bounds.`);
    }
    return event;
  }

  addBookmark(label: string, index = this.currentIndex): ReplayBookmark {
    if (!label || label.trim() === '') {
      throw new Error('Replay bookmark label is required.');
    }

    this.validateIndex(index);

    const bookmark: ReplayBookmark = {
      id: `bookmark-${this.bookmarks.size + 1}`,
      index,
      label,
      createdAt: Date.now(),
    };

    this.bookmarks.set(bookmark.id, bookmark);
    return { ...bookmark };
  }

  removeBookmark(bookmarkId: string): void {
    if (!this.bookmarks.has(bookmarkId)) {
      throw new Error(`Replay bookmark "${bookmarkId}" does not exist.`);
    }
    this.bookmarks.delete(bookmarkId);
  }

  listBookmarks(): ReplayBookmark[] {
    return [...this.bookmarks.values()]
      .map((bookmark) => ({ ...bookmark }))
      .sort((a, b) => a.index - b.index || a.createdAt - b.createdAt);
  }

  gotoBookmark(bookmarkId: string): ReplayEvent {
    const bookmark = this.bookmarks.get(bookmarkId);
    if (!bookmark) {
      throw new Error(`Replay bookmark "${bookmarkId}" does not exist.`);
    }

    this.setIndex(bookmark.index);
    const event = this.getCurrentEvent();
    if (!event) {
      throw new Error(`Replay bookmark "${bookmarkId}" points to an invalid index.`);
    }

    return event;
  }

  takeSnapshot(): void {
    this.validateIndex(this.currentIndex);
    this.snapshotIndex = this.currentIndex;
    this.snapshotData = this.events[this.currentIndex]?.data;
  }

  compareToSnapshot(): ReplaySnapshotComparison | null {
    if (this.snapshotIndex === undefined || this.snapshotData === undefined) {
      return null;
    }

    const fromEvent = this.events[this.snapshotIndex];
    const toEvent = this.events[this.currentIndex];

    return {
      fromIndex: this.snapshotIndex,
      toIndex: this.currentIndex,
      fromData: fromEvent?.data,
      toData: toEvent?.data,
      changed: JSON.stringify(fromEvent?.data) !== JSON.stringify(toEvent?.data),
    };
  }

  getEventAtIndex(index: number): ReplayEvent {
    this.validateIndex(index);
    return this.copyEvent(this.events[index]);
  }

  private setIndex(index: number): void {
    if (!this.player) {
      throw new Error('Replay studio has no events loaded.');
    }

    this.player.jumpTo(index);
    this.currentIndex = this.player.getCurrentIndex();
  }

  private validateIndex(index: number): void {
    if (!Number.isInteger(index) || index < 0 || index >= this.events.length) {
      throw new Error(`Replay index ${index} is out of bounds.`);
    }
  }

  private validateEvent(event: ReplayEvent, index: number): void {
    if (!event || typeof event !== 'object') {
      throw new Error(`Replay event at index ${index} must be an object.`);
    }

    if (!event.id || event.id.trim() === '') {
      throw new Error(`Replay event at index ${index} id is required.`);
    }

    if (!event.type || event.type.trim() === '') {
      throw new Error(`Replay event at index ${index} type is required.`);
    }

    if (!Number.isInteger(event.timestamp) || event.timestamp < 0) {
      throw new Error(`Replay event at index ${index} timestamp must be a non-negative integer.`);
    }
  }

  private copyEvent(event: ReplayEvent): ReplayEvent {
    return {
      id: event.id,
      timestamp: event.timestamp,
      type: event.type,
      data: event.data !== undefined ? JSON.parse(JSON.stringify(event.data)) : undefined,
    };
  }
}
