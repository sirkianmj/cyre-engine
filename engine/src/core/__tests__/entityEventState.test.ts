import { describe, it, expect, vi } from 'vitest';
import { Entity } from '../Entity.js';
import { EventBus, type BaseEvent } from '../EventBus.js';
import { StateContainer, type StateChangeEvent } from '../StateContainer.js';
import { ManualClock } from '../Clock.js';

describe('Entity', () => {
  it('creates an entity with required id and type', () => {
    const entity = new Entity('e1', 'Host');
    expect(entity.id).toBe('e1');
    expect(entity.type).toBe('Host');
  });

  it('throws on empty id or type', () => {
    expect(() => new Entity('', 'Host')).toThrow(/non-empty/);
    expect(() => new Entity('e1', '')).toThrow(/non-empty/);
  });

  it('manages data fields', () => {
    const entity = new Entity('e1', 'Server', { os: 'Linux' });
    expect(entity.getData('os')).toBe('Linux');
    entity.setData('ip', '10.0.0.1');
    expect(entity.hasData('ip')).toBe(true);
    expect(entity.getData('ip')).toBe('10.0.0.1');
    entity.removeData('os');
    expect(entity.hasData('os')).toBe(false);
  });
});

describe('EventBus', () => {
  it('subscribes and receives events', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    const unsubscribe = bus.subscribe('test', handler);
    const event: BaseEvent = { type: 'test', timestamp: 123, data: { foo: 'bar' } };
    bus.publish(event);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0]).toMatchObject({ type: 'test', data: { foo: 'bar' } });
    unsubscribe();
    bus.publish(event);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('records event history', () => {
    const bus = new EventBus();
    bus.publish({ type: 'a', timestamp: 1 });
    bus.publish({ type: 'b', timestamp: 2 });
    expect(bus.getHistory()).toHaveLength(2);
    bus.clearHistory();
    expect(bus.getHistory()).toHaveLength(0);
  });
});

describe('StateContainer', () => {
  it('publishes state change events', () => {
    const bus = new EventBus();
    const state = new StateContainer<{ count: number; name: string }>(
      { count: 0, name: 'initial' },
      bus,
    );
    const changeHandler = vi.fn();
    bus.subscribe<StateChangeEvent>('state:change', changeHandler);

    state.set('count', 1);
    expect(changeHandler).toHaveBeenCalledTimes(1);
    const event = changeHandler.mock.calls[0][0] as StateChangeEvent;
    expect(event.key).toBe('count');
    expect(event.oldValue).toBe(0);
    expect(event.newValue).toBe(1);

    state.update({ name: 'updated' });
    expect(changeHandler).toHaveBeenCalledTimes(2);
  });

  it('does not emit if value is unchanged', () => {
    const bus = new EventBus();
    const state = new StateContainer<{ count: number }>({ count: 5 }, bus);
    const changeHandler = vi.fn();
    bus.subscribe('state:change', changeHandler);
    state.set('count', 5);
    expect(changeHandler).not.toHaveBeenCalled();
  });
});

describe('ManualClock', () => {
  it('allows deterministic time control', () => {
    const clock = new ManualClock(100);
    expect(clock.now()).toBe(100);
    clock.advance(50);
    expect(clock.now()).toBe(150);
    clock.set(0);
    expect(clock.now()).toBe(0);
    expect(() => clock.advance(-1)).toThrow(/negative/);
  });
});
