import { describe, expect, it } from 'vitest';
import { Simulation } from '../Simulation.js';
import type { SimulationAction } from '../SimulationAction.js';

const incrementAction: SimulationAction = {
  id: 'inc',
  type: 'increment',
  execute(ctx) {
    const current = (ctx.getState().value as number | undefined) ?? 0;
    return {
      patch: { value: current + 1 },
      events: [{ id: 'inc-event', type: 'incremented', timestamp: ctx.now() }],
    };
  },
};

describe('Simulation runtime', () => {
  it('initializes and creates empty state', () => {
    const sim = new Simulation({ id: 'test', name: 'canonical' });
    sim.initialize();
    expect(sim.isInitialized()).toBe(true);
    expect(sim.getState()).toEqual({});
  });

  it('rejects double initialization', () => {
    const sim = new Simulation({ id: 'test', name: 'canonical' });
    sim.initialize();
    expect(() => sim.initialize()).toThrowError(/already initialized/i);
  });

  it('rejects actions before initialization', () => {
    const sim = new Simulation({ id: 'test' });
    expect(() => sim.executeAction(incrementAction)).toThrowError(
      /must be initialized/i,
    );
  });

  it('executes an action, mutates state, and emits custom event', () => {
    const sim = new Simulation({ id: 'test', name: 'canonical' });
    sim.initialize();

    const result = sim.executeAction(incrementAction);

    expect(result.success).toBe(true);
    expect(result.state).toEqual({ value: 1 });
    expect(sim.getState()).toEqual({ value: 1 });
    expect(result.events).toHaveLength(1);
    expect(result.events[0].type).toBe('incremented');
    expect(sim.getEvents().some((event) => event.type === 'incremented')).toBe(
      true,
    );
  });

  it('emits a canonical action event after execution', () => {
    const sim = new Simulation({ id: 'test', name: 'canonical' });
    sim.initialize();

    sim.executeAction(incrementAction);

    const actionEvent = sim
      .getEvents()
      .find((event) => event.type === 'simulation.action');
    expect(actionEvent).toBeDefined();
    expect(actionEvent!.data).toMatchObject({
      actionId: 'inc',
      actionType: 'increment',
    });
  });

  it('step advances simulation time by configured tick duration', () => {
    const sim = new Simulation({
      id: 'test',
      name: 'canonical',
      startTime: 0,
      tickDurationMs: 10,
    });
    sim.initialize();

    const before = sim.getTime();
    const result = sim.step();

    expect(sim.getTime()).toBe(before + 10);
    expect(result.time).toBe(before + 10);
    expect(result.success).toBe(true);
    expect(sim.getEvents().some((event) => event.type === 'simulation.tick')).toBe(
      true,
    );
  });

  it('advanceTime advances by exact amount and emits no custom action event', () => {
    const sim = new Simulation({ id: 'test', startTime: 0 });
    sim.initialize();

    sim.advanceTime(50);

    expect(sim.getTime()).toBe(50);
    expect(sim.getEvents().filter((event) => event.type === 'simulation.tick')).toHaveLength(0);
    expect(sim.getEvents().filter((event) => event.type === 'simulation.action')).toHaveLength(0);
    expect(sim.getEvents().map((event) => event.type)).toEqual(['simulation.initialized']);
  });

  it('serializes and restores state, time, and event history, then continues', () => {
    const sim = new Simulation({ id: 'test', name: 'canonical' });
    sim.initialize();
    sim.executeAction(incrementAction);
    sim.advanceTime(5);
    sim.executeAction(incrementAction);

    const serialized = sim.serialize();
    const restored = Simulation.restore(serialized);

    expect(restored.getTime()).toBe(sim.getTime());
    expect(restored.getState()).toEqual(sim.getState());
    expect(restored.getEvents()).toEqual(sim.getEvents());

    const nextResult = restored.executeAction(incrementAction);
    expect(nextResult.success).toBe(true);
    expect(restored.getState()).toEqual({ value: 3 });
  });

  it('rejects invalid serialization JSON', () => {
    expect(() => Simulation.restore('not-json')).toThrowError(
      /invalid simulation serialization/i,
    );
  });

  it('rejects unsupported serialization version', () => {
    const bad = JSON.stringify({
      version: 999,
      config: { id: 'test' },
      time: 0,
      state: {},
      initialized: true,
      eventHistory: [],
    });
    expect(() => Simulation.restore(bad)).toThrowError(
      /unsupported simulation serialization version/i,
    );
  });

  it('rejects invalid actions', () => {
    const sim = new Simulation({ id: 'test' });
    sim.initialize();

    expect(() =>
      sim.executeAction({
        id: '',
        type: 'bad',
        execute: () => undefined,
      }),
    ).toThrowError(/id must be a non-empty string/i);

    expect(() =>
      sim.executeAction({
        id: 'bad',
        type: '',
        execute: () => undefined,
      }),
    ).toThrowError(/type must be a non-empty string/i);

    expect(() =>
      sim.executeAction({
        id: 'bad',
        type: 'bad',
        execute: undefined as unknown as SimulationAction['execute'],
      }),
    ).toThrowError(/execute must be a function/i);
  });
});
