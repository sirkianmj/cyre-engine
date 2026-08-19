import { describe, it, expect } from 'vitest';
import { CyreDebugger } from '../CyreDebugger.js';
import { DebugBreakpoint } from '../DebugBreakpoint.js';
import { Entity, EventBus, ManualClock, StateContainer } from '../../core/index.js';

describe('DebugBreakpoint', () => {
  it('creates and evaluates breakpoint by event type', () => {
    const breakpoint = new DebugBreakpoint({ id: 'bp-1', eventType: 'auth' });
    expect(
      breakpoint.evaluate(
        { type: 'auth', timestamp: 1 },
        { event: { type: 'auth', timestamp: 1 }, breakpointId: 'bp-1', paused: false },
      ),
    ).toBe(true);
    expect(breakpoint.getHitCount()).toBe(1);
    expect(
      breakpoint.evaluate(
        { type: 'other', timestamp: 1 },
        { event: { type: 'other', timestamp: 1 }, breakpointId: 'bp-1', paused: false },
      ),
    ).toBe(false);
  });

  it('matches partial data and condition', () => {
    const breakpoint = new DebugBreakpoint({
      id: 'bp-2',
      eventType: 'alert',
      dataMatches: { severity: 'high' },
      condition: (event) => event.data !== undefined && (event.data as { confidence?: number }).confidence! > 0.8,
    });

    expect(
      breakpoint.evaluate(
        { type: 'alert', timestamp: 1, data: { severity: 'high', confidence: 0.95 } },
        {
          event: { type: 'alert', timestamp: 1, data: { severity: 'high', confidence: 0.95 } },
          breakpointId: 'bp-2',
          paused: false,
        },
      ),
    ).toBe(true);
  });
});

describe('CyreDebugger', () => {
  it('starts, pauses, resumes, and stops', () => {
    const dbg = new CyreDebugger({ name: 'test' });
    expect(dbg.getState()).toBe('idle');
    dbg.start();
    expect(dbg.getState()).toBe('running');
    dbg.pause();
    expect(dbg.isPaused()).toBe(true);
    dbg.resume();
    expect(dbg.getState()).toBe('running');
    dbg.stop();
    expect(dbg.getState()).toBe('stopped');
  });

  it('processes events and inspects them', () => {
    const dbg = new CyreDebugger();
    dbg.start();
    dbg.processEvent({ type: 'login', timestamp: 10, source: 'vpn', data: { user: 'alice' } });
    dbg.processEvent({ type: 'alert', timestamp: 20, source: 'siem', data: { severity: 'high' } });

    expect(dbg.getEventCount()).toBe(2);
    expect(dbg.queryEvents({ type: 'alert' })).toHaveLength(1);
    expect(dbg.queryEvents({ source: 'siem' })).toHaveLength(1);
    expect(dbg.queryEvents({ fromTimestamp: 15 })).toHaveLength(1);
    expect(dbg.queryEvents({ limit: 1 })).toHaveLength(1);
  });

  it('pauses automatically on breakpoint hit', () => {
    const dbg = new CyreDebugger({ pauseOnBreakpoint: true });
    dbg.addBreakpoint({ id: 'bp-alert', eventType: 'alert' });
    dbg.start();

    expect(dbg.processEvent({ type: 'login', timestamp: 1 })).toBe(false);
    expect(dbg.isPaused()).toBe(false);

    expect(dbg.processEvent({ type: 'alert', timestamp: 2 })).toBe(true);
    expect(dbg.isPaused()).toBe(true);
    expect(dbg.listBreakpoints()[0].getHitCount()).toBe(1);
  });

  it('does not auto-pause when pauseOnBreakpoint is false', () => {
    const dbg = new CyreDebugger({ pauseOnBreakpoint: false });
    dbg.addBreakpoint({ id: 'bp', eventType: 'event' });
    dbg.start();
    dbg.processEvent({ type: 'event', timestamp: 1 });
    expect(dbg.isPaused()).toBe(false);
  });

  it('registers and inspects entities and state containers', () => {
    const dbg = new CyreDebugger();
    const entity = new Entity('e1', 'test', { value: 1 });
    dbg.registerEntity('entity-1', entity);
    expect(dbg.inspectEntity('entity-1')).toMatchObject({ id: 'e1', type: 'test' });

    const bus = new EventBus();
    const state = new StateContainer<Record<string, unknown>>({ health: 100 }, bus);
    dbg.registerState('player', state);
    state.set('health', 80);
    expect(dbg.inspectState('player')).toEqual({ health: 80 });
    expect(Object.keys(dbg.inspectStates())).toContain('player');
  });

  it('steps a manual clock and records step events', () => {
    const clock = new ManualClock(0);
    const dbg = new CyreDebugger({ clock });
    dbg.start();
    const timestamp = dbg.step(25);
    expect(timestamp).toBe(25);
    expect(clock.now()).toBe(25);
    expect(dbg.queryEvents({ type: 'debug:step' })).toHaveLength(1);
  });

  it('creates a snapshot with debugger summary', () => {
    const bus = new EventBus();
    const clock = new ManualClock(1000);
    const dbg = new CyreDebugger({ name: 'Session Debugger', clock });
    dbg.registerEntity('e', { id: 'x', data: { ok: true } });
    dbg.registerState('s', new StateContainer<Record<string, unknown>>({ ready: true }, bus));
    dbg.addBreakpoint({ id: 'bp', eventType: 'debug:step' });
    dbg.start();
    dbg.step(10);

    const snapshot = dbg.createSnapshot();
    expect(snapshot.name).toBe('Session Debugger');
    expect(snapshot.eventCount).toBe(2);
    expect(snapshot.breakpointCount).toBe(1);
    expect(snapshot.entityCount).toBe(1);
    expect(snapshot.stateContainerCount).toBe(1);
    expect(snapshot.summary).toContain('Session Debugger');
    expect(snapshot.breakpoints).toHaveLength(1);
  });

  it('throws on invalid debugger operations', () => {
    const dbg = new CyreDebugger();
    dbg.start();
    expect(() => dbg.pause()).not.toThrow();
    expect(() => dbg.pause()).toThrow(/running/);
    dbg.resume();
    dbg.stop();
    expect(() => dbg.step()).toThrow(/stopped/);
    expect(() => dbg.addBreakpoint({ id: 'x' })).toThrow(/stopped/);
  });
});
