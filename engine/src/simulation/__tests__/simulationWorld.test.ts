import { describe, expect, it } from 'vitest';

import { SimulationTickScheduler } from '../SimulationTickScheduler.js';
import { SimulationWorld } from '../SimulationWorld.js';
import { ManualSimulationClock } from '../SimulationClock.js';

import type { ScheduledSimulationAction } from '../SimulationTickScheduler.js';

interface CounterState extends Record<string, unknown> {
  value: number;
  log: string[];
}

const initial: CounterState = { value: 0, log: [] };

function action(
  id: string,
  dueTime: number,
  delta: number,
  type = 'increment',
): ScheduledSimulationAction<CounterState> {
  return {
    id,
    dueTime,
    type,
    run: (state) => ({
      value: state.value + delta,
      log: [...state.log, id],
    }),
  };
}

describe('SimulationTickScheduler', () => {
  it('orders queued actions by due time', () => {
    const scheduler = new SimulationTickScheduler<CounterState>();

    scheduler.schedule(action('late', 30, 1));
    scheduler.schedule(action('early', 10, 1));
    scheduler.schedule(action('mid', 20, 1));

    expect(scheduler.getNextDueTime()).toBe(10);
    expect(scheduler.size()).toBe(3);
  });

  it('breaks due-time ties deterministically by id', () => {
    const scheduler = new SimulationTickScheduler<CounterState>();

    // Inserted out of alphabetical order on purpose.
    scheduler.schedule(action('zeta', 5, 1));
    scheduler.schedule(action('alpha', 5, 1));
    scheduler.schedule(action('mid', 5, 1));

    const due = scheduler.processDue(5);
    expect(due.map((entry) => entry.id)).toEqual(['alpha', 'mid', 'zeta']);
  });

  it('processes only actions that are due', () => {
    const scheduler = new SimulationTickScheduler<CounterState>();
    scheduler.schedule(action('now', 0, 1));
    scheduler.schedule(action('later', 100, 1));

    const due = scheduler.processDue(0);
    expect(due.map((entry) => entry.id)).toEqual(['now']);
    expect(scheduler.size()).toBe(1);
  });

  it('clears the queue', () => {
    const scheduler = new SimulationTickScheduler<CounterState>();
    scheduler.schedule(action('a', 1, 1));
    scheduler.clear();

    expect(scheduler.size()).toBe(0);
    expect(scheduler.getNextDueTime()).toBeUndefined();
  });

  it('rejects malformed scheduled actions', () => {
    const scheduler = new SimulationTickScheduler<CounterState>();

    expect(() => scheduler.schedule({ ...action('a', 1, 1), id: '' })).toThrow(/id is required/);
    expect(() => scheduler.schedule({ ...action('a', 1, 1), type: ' ' })).toThrow(
      /type is required/,
    );
    expect(() => scheduler.schedule({ ...action('a', -1, 1) })).toThrow(/dueTime/);
    expect(() =>
      scheduler.schedule({ ...action('a', 1, 1), run: undefined as never }),
    ).toThrow(/run must be a function/);
  });
});

describe('SimulationWorld', () => {
  it('starts at the configured time with the initial state', () => {
    const world = new SimulationWorld<CounterState>(initial, { startTime: 250 });

    expect(world.now()).toBe(250);
    expect(world.getState()).toEqual(initial);
  });

  it('takes its start time from an injected clock when provided', () => {
    const clock = new ManualSimulationClock(1_000);
    const world = new SimulationWorld<CounterState>(initial, { clock });

    expect(world.now()).toBe(1_000);
  });

  it('rejects invalid construction arguments', () => {
    expect(() => new SimulationWorld<CounterState>(null as never)).toThrow(/must be an object/);
    expect(() => new SimulationWorld<CounterState>(initial, { startTime: -1 })).toThrow(
      /non-negative finite number/,
    );
  });

  it('applies state patches without mutating the caller object', () => {
    const world = new SimulationWorld<CounterState>(initial);
    const snapshot = world.getState();

    world.setState({ value: 7 });

    expect(world.getState().value).toBe(7);
    expect(snapshot.value).toBe(0);
    expect(initial.value).toBe(0);
  });

  it('rejects a non-object patch', () => {
    const world = new SimulationWorld<CounterState>(initial);
    expect(() => world.setState(null as never)).toThrow(/must be an object/);
  });

  it('executes scheduled actions and advances time to the due time', () => {
    const world = new SimulationWorld<CounterState>(initial);

    world.schedule(action('a', 10, 5));
    world.schedule(action('b', 20, 3));

    const first = world.step();
    expect(first.time).toBe(10);
    expect(first.actions).toEqual([{ id: 'a', type: 'increment' }]);
    expect(world.now()).toBe(10);
    expect(world.getState().value).toBe(5);

    const second = world.step();
    expect(second.time).toBe(20);
    expect(world.getState().value).toBe(8);
    expect(world.getState().log).toEqual(['a', 'b']);
  });

  it('returns an empty event when nothing is scheduled at all', () => {
    const world = new SimulationWorld<CounterState>(initial, { startTime: 100 });

    const event = world.step();

    expect(event.actions).toEqual([]);
    expect(event.time).toBe(100);
    expect(world.now()).toBe(100);
    expect(world.getState().value).toBe(0);
  });

  it('advances forward to work scheduled in the future', () => {
    const world = new SimulationWorld<CounterState>(initial, { startTime: 100 });
    world.schedule(action('future', 500, 4));

    const event = world.step();

    expect(event.time).toBe(500);
    expect(event.actions).toEqual([{ id: 'future', type: 'increment' }]);
    expect(world.now()).toBe(500);
    expect(world.getState().value).toBe(4);
  });

  it('processes same-tick actions in deterministic id order', () => {
    const world = new SimulationWorld<CounterState>(initial);

    world.schedule(action('zeta', 1, 1));
    world.schedule(action('alpha', 1, 10));
    world.schedule(action('mid', 1, 100));

    const event = world.step();

    expect(event.actions.map((entry) => entry.id)).toEqual(['alpha', 'mid', 'zeta']);
    expect(world.getState().log).toEqual(['alpha', 'mid', 'zeta']);
    expect(world.getState().value).toBe(111);
  });

  it('produces identical results for identical schedules regardless of insert order', () => {
    const forward = new SimulationWorld<CounterState>(initial);
    forward.schedule(action('a', 1, 1));
    forward.schedule(action('b', 1, 2));
    forward.schedule(action('c', 2, 3));

    const reversed = new SimulationWorld<CounterState>(initial);
    reversed.schedule(action('c', 2, 3));
    reversed.schedule(action('b', 1, 2));
    reversed.schedule(action('a', 1, 1));

    for (let i = 0; i < 2; i += 1) {
      forward.step();
      reversed.step();
    }

    expect(reversed.getState()).toEqual(forward.getState());
    expect(reversed.now()).toBe(forward.now());
    expect(reversed.getEventLog()).toEqual(forward.getEventLog());
  });

  it('advances an injected clock alongside world time', () => {
    const clock = new ManualSimulationClock(0);
    const world = new SimulationWorld<CounterState>(initial, { clock });

    world.schedule(action('a', 40, 1));
    world.step();

    expect(world.now()).toBe(40);
    expect(clock.now()).toBe(40);
  });

  it('runs until a target time, processing every due action', () => {
    const world = new SimulationWorld<CounterState>(initial);
    world.schedule(action('a', 5, 1));
    world.schedule(action('b', 15, 2));
    world.schedule(action('c', 25, 4));

    const events = world.runUntil(20);

    expect(events).toHaveLength(2);
    expect(world.now()).toBe(20);
    expect(world.getState().value).toBe(3);
    // The action due at 25 is still pending.
    expect(world.getScheduledActionCount()).toBe(1);
  });

  it('advances to the target time even when no actions are scheduled', () => {
    const world = new SimulationWorld<CounterState>(initial);
    const events = world.runUntil(100);

    expect(events).toHaveLength(0);
    expect(world.now()).toBe(100);
  });

  it('rejects running backwards in time', () => {
    const world = new SimulationWorld<CounterState>(initial, { startTime: 100 });
    expect(() => world.runUntil(50)).toThrow(/>= current time/);
    expect(() => world.runUntil(Number.NaN)).toThrow(/finite number/);
  });

  it('records an event log entry per processed tick', () => {
    const world = new SimulationWorld<CounterState>(initial);
    world.schedule(action('a', 1, 1));
    world.schedule(action('b', 2, 1));
    world.step();
    world.step();

    const log = world.getEventLog();
    expect(log).toEqual([
      { time: 1, actions: [{ id: 'a', type: 'increment' }] },
      { time: 2, actions: [{ id: 'b', type: 'increment' }] },
    ]);
  });

  it('returns a defensive copy of the event log', () => {
    const world = new SimulationWorld<CounterState>(initial);
    world.schedule(action('a', 1, 1));
    world.step();

    const log = world.getEventLog();
    log[0].actions.push({ id: 'forged', type: 'forged' });

    expect(world.getEventLog()[0].actions).toHaveLength(1);
  });

  it('supports actions that mutate state in place', () => {
    const world = new SimulationWorld<CounterState>(initial);
    world.schedule({
      id: 'in-place',
      dueTime: 1,
      type: 'mutate',
      run: (state) => {
        state.value = 99;
      },
    });
    world.step();

    expect(world.getState().value).toBe(99);
  });
});
