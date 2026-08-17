import { describe, it, expect } from 'vitest';
import {
  DefensiveAction,
  DefenseState,
  ALL_DEFENSIVE_ACTIONS,
  isDefensiveAction,
} from '../index.js';

describe('DefensiveAction', () => {
  it('defines the expected actions', () => {
    expect(ALL_DEFENSIVE_ACTIONS).toHaveLength(10);
    expect(ALL_DEFENSIVE_ACTIONS).toContain(DefensiveAction.Monitor);
    expect(ALL_DEFENSIVE_ACTIONS).toContain(DefensiveAction.Recover);
  });

  it('isDefensiveAction validates values', () => {
    expect(isDefensiveAction('monitor')).toBe(true);
    expect(isDefensiveAction('not_an_action')).toBe(false);
  });
});

describe('DefenseState', () => {
  it('applies and tracks defensive actions', () => {
    const state = new DefenseState();
    const record = state.apply(DefensiveAction.Detect, 100);
    expect(record).toEqual({ action: DefensiveAction.Detect, timestamp: 100 });
    expect(state.hasApplied(DefensiveAction.Detect)).toBe(true);
    expect(state.getTimestamp(DefensiveAction.Detect)).toBe(100);
  });

  it('throws on duplicate action', () => {
    const state = new DefenseState();
    state.apply(DefensiveAction.Monitor, 100);
    expect(() => state.apply(DefensiveAction.Monitor, 200)).toThrow(/already been applied/);
  });

  it('throws on invalid action', () => {
    const state = new DefenseState();
    expect(() => state.apply('invalid' as DefensiveAction)).toThrow(/Invalid defensive action/);
  });

  it('removes an applied action', () => {
    const state = new DefenseState();
    state.apply(DefensiveAction.Isolate, 100);
    expect(state.hasApplied(DefensiveAction.Isolate)).toBe(true);
    state.remove(DefensiveAction.Isolate);
    expect(state.hasApplied(DefensiveAction.Isolate)).toBe(false);
  });

  it('throws when removing non-applied action', () => {
    const state = new DefenseState();
    expect(() => state.remove(DefensiveAction.Patch)).toThrow(/has not been applied/);
  });

  it('resets all actions', () => {
    const state = new DefenseState();
    state.apply(DefensiveAction.Block, 100);
    state.apply(DefensiveAction.Recover, 200);
    state.reset();
    expect(state.getAppliedActions()).toEqual([]);
    expect(state.getHistory()).toEqual([]);
  });

  it('serialises to JSON', () => {
    const state = new DefenseState();
    state.apply(DefensiveAction.Alert, 100);
    const json = state.toJSON();
    expect(json.appliedActions).toBeDefined();
    const actions = json.appliedActions as Array<{ action: string; timestamp: number }>;
    expect(actions).toHaveLength(1);
    expect(actions[0].action).toBe(DefensiveAction.Alert);
    expect(actions[0].timestamp).toBe(100);
  });
});
