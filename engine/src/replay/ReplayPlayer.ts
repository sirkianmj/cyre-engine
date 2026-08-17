/**
 * ReplayPlayer
 * --------------
 * Replays recorded events in chronological order.
 * Supports start, pause, stop, and jump to a specific index.
 */

import { ReplayEvent } from './ReplayEvent.js';

export class ReplayPlayer {
  private events: ReplayEvent[];
  private currentIndex: number = 0;
  private playing: boolean = false;

  constructor(events: ReplayEvent[]) {
    this.events = [...events].sort((a, b) => a.timestamp - b.timestamp);
  }

  play(onEvent: (event: ReplayEvent, index: number) => void): void {
    if (this.playing) {
      throw new Error('Replay is already playing.');
    }
    if (this.currentIndex >= this.events.length) {
      throw new Error('No more events to replay.');
    }
    this.playing = true;
    // Simulate synchronous playback: call callback for each remaining event
    while (this.playing && this.currentIndex < this.events.length) {
      onEvent(this.events[this.currentIndex], this.currentIndex);
      this.currentIndex++;
    }
    this.playing = false;
  }

  pause(): void {
    this.playing = false;
  }

  stop(): void {
    this.playing = false;
    this.currentIndex = 0;
  }

  jumpTo(index: number): void {
    if (index < 0 || index >= this.events.length) {
      throw new Error(`Replay index ${index} out of bounds.`);
    }
    this.currentIndex = index;
  }

  getCurrentIndex(): number {
    return this.currentIndex;
  }

  getEventsCount(): number {
    return this.events.length;
  }
}
