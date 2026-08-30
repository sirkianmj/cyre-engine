/**
 * Clock
 * -----
 * Provides a time abstraction to allow deterministic simulations.
 * Default system clock uses Date.now(); manual clock allows controlled time.
 */

export interface Clock {
  /** Returns current time in milliseconds. */
  now(): number;
}

export class SystemClock implements Clock {
  now(): number {
    return Date.now();
  }
}

export class ManualClock implements Clock {
  private current: number;

  constructor(startTime = 0) {
    this.current = startTime;
  }

  now(): number {
    return this.current;
  }

  /** Advance the clock by a given number of milliseconds. */
  advance(ms: number): void {
    if (ms < 0) {
      throw new Error('Cannot advance clock by negative amount.');
    }
    this.current += ms;
  }

  /** Set the clock to an exact time. */
  set(time: number): void {
    if (time < 0) {
      throw new Error('Cannot set clock to negative time.');
    }
    this.current = time;
  }
}
