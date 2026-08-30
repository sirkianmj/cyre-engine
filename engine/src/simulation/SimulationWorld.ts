import { SimulationTickScheduler } from './SimulationTickScheduler.js';
import type { ScheduledSimulationAction } from './SimulationTickScheduler.js';
import type { SimulationClock } from './SimulationClock.js';
import type { SimulationEvent } from './SimulationEvent.js';

export interface SimulationWorldEvent {
  time: number;
  actions: Array<{ id: string; type: string }>;
}

export interface SimulationWorldOptions {
  startTime?: number;
  clock?: SimulationClock;
}

export class SimulationWorld<TState extends Record<string, unknown>> {
  private currentTime: number;
  private state: TState;
  private readonly scheduler = new SimulationTickScheduler<TState>();
  private readonly eventLog: SimulationWorldEvent[] = [];
  private readonly events: SimulationEvent[] = [];

  constructor(initialState: TState, options: SimulationWorldOptions = {}) {
    if (!initialState || typeof initialState !== 'object') {
      throw new Error('SimulationWorld initial state must be an object.');
    }

    const initialTime = options.clock !== undefined
      ? options.clock.now()
      : (options.startTime ?? 0);

    if (!Number.isFinite(initialTime) || initialTime < 0) {
      throw new Error('SimulationWorld start time must be a non-negative finite number.');
    }

    this.currentTime = initialTime;
    this.state = { ...initialState };
    this.clockRef = options.clock;
  }

  now(): number {
    return this.currentTime;
  }

  getState(): TState {
    return { ...this.state };
  }

  setState(patch: Partial<TState>): void {
    if (!patch || typeof patch !== 'object') {
      throw new Error('SimulationWorld state patch must be an object.');
    }
    this.state = { ...this.state, ...patch };
  }

  schedule(action: ScheduledSimulationAction<TState>): void {
    this.scheduler.schedule(action);
  }

  /**
   * Advances the world to the next scheduled action time and executes every
   * action due there, in deterministic (due time, then id) order.
   *
   * Returns an empty event when nothing is scheduled.
   */
  step(): SimulationWorldEvent {
    const nextTime = this.scheduler.getNextDueTime();

    if (nextTime === undefined) {
      return { time: this.currentTime, actions: [] };
    }

    // A discrete-event world moves forward to its next scheduled work; it does
    // not stall just because that work is in the future.
    if (nextTime > this.currentTime) {
      this.advanceTime(nextTime - this.currentTime);
    }

    const actions = this.scheduler.processDue(nextTime);

    for (const action of actions) {
      const nextState = action.run(this.state);

      if (nextState && typeof nextState === 'object') {
        this.setState(nextState as Partial<TState>);
      }
    }

    const event: SimulationWorldEvent = {
      time: nextTime,
      actions: actions.map((action) => ({ id: action.id, type: action.type })),
    };

    this.eventLog.push(event);
    return event;
  }

  runUntil(targetTime: number): SimulationWorldEvent[] {
    if (!Number.isFinite(targetTime) || targetTime < this.currentTime) {
      throw new Error('SimulationWorld targetTime must be a finite number >= current time.');
    }

    const events: SimulationWorldEvent[] = [];
    const maxSteps = 10000;
    let steps = 0;

    while (
      this.scheduler.getNextDueTime() !== undefined &&
      this.scheduler.getNextDueTime()! <= targetTime &&
      steps < maxSteps
    ) {
      events.push(this.step());
      steps += 1;
    }

    if (steps >= maxSteps) {
      throw new Error(`SimulationWorld.runUntil exceeded ${maxSteps} steps. Possible infinite loop.`);
    }

    const remaining = targetTime - this.currentTime;
    if (remaining > 0) {
      this.advanceTime(remaining);
      this.currentTime = targetTime;
    }

    return events;
  }

  private advanceTime(ms: number): void {
    if (!Number.isFinite(ms) || ms < 0) {
      return;
    }

    this.currentTime += ms;
    const clock = this.clockRef;

    if (clock && typeof clock.advance === 'function') {
      clock.advance(ms);
    }
  }

  private clockRef?: SimulationClock;

  /**
   * Applies a partial state patch. Provided so a runtime built on this kernel
   * has one authoritative way to mutate world state.
   */
  applyPatch(patch: Partial<TState>): void {
    this.setState(patch);
  }

  /**
   * Advances world time (and the injected clock) without running actions.
   * This is how a runtime models elapsed time between discrete events.
   */
  advance(ms: number): void {
    if (!Number.isFinite(ms) || ms < 0) {
      throw new Error('SimulationWorld advance ms must be a non-negative finite number.');
    }
    if (ms === 0) return;
    this.advanceTime(ms);
  }

  /** Records a canonical simulation event on the world's event log. */
  emit(event: SimulationEvent): void {
    if (!event || typeof event.type !== 'string' || event.type.trim() === '') {
      throw new Error('SimulationEvent type must be a non-empty string.');
    }
    this.events.push({ ...event });
  }

  /** The canonical simulation events recorded so far, in emission order. */
  getEvents(): SimulationEvent[] {
    return this.events.map((event) => ({ ...event }));
  }

  /** Replaces the recorded event history. Used when restoring a snapshot. */
  restoreEvents(events: readonly SimulationEvent[]): void {
    this.events.length = 0;
    for (const event of events) this.events.push({ ...event });
  }

  /** Replaces world state wholesale. Used when restoring a snapshot. */
  replaceState(state: TState): void {
    if (!state || typeof state !== 'object') {
      throw new Error('SimulationWorld state must be an object.');
    }
    this.state = { ...state };
  }

  /** Sets world time directly. Used when restoring a snapshot. */
  setTime(time: number): void {
    if (!Number.isFinite(time) || time < 0) {
      throw new Error('SimulationWorld time must be a non-negative finite number.');
    }
    this.currentTime = time;
    // ManualSimulationClock exposes set(); an opaque clock only needs now().
    const settable = this.clockRef as ({ set?: (t: number) => void } | undefined);
    if (settable && typeof settable.set === 'function') {
      settable.set(time);
    }
  }

  getEventLog(): SimulationWorldEvent[] {
    return this.eventLog.map((event) => ({
      time: event.time,
      actions: event.actions.map((action) => ({ ...action })),
    }));
  }

  getScheduledActionCount(): number {
    return this.scheduler.size();
  }
}
