import { describe, expect, it } from 'vitest';
import { Simulation } from '../Simulation.js';
import type { SimulationAction } from '../SimulationAction.js';

function createRandomAction(id: string): SimulationAction {
  return {
    id,
    type: 'random-draw',
    execute(ctx) {
      const value = ctx.random.nextInt(1000000);
      const draws = ((ctx.getState().draws as number[] | undefined) ?? []).concat(value);
      return { patch: { draws } };
    },
  };
}

function runActionsWithSeed(seed: number, actionIds: string[]): Simulation {
  const sim = new Simulation({ id: 'determinism', name: 'seeded', seed });
  sim.initialize();
  for (const id of actionIds) {
    sim.executeAction(createRandomAction(id));
    sim.advanceTime(1);
  }
  return sim;
}

describe('Simulation determinism', () => {
  it('same seed and same actions produce identical state and event sequence', () => {
    const actionIds = ['a1', 'a2', 'a3', 'a4', 'a5'];

    const simA = runActionsWithSeed(12345, actionIds);
    const simB = runActionsWithSeed(12345, actionIds);

    expect(simA.getTime()).toBe(simB.getTime());
    expect(simA.getState()).toEqual(simB.getState());
    expect(simA.getEvents()).toEqual(simB.getEvents());
  });

  it('serialization and restoration preserves deterministic execution', () => {
    const simA = runActionsWithSeed(42, ['x1', 'x2', 'x3']);
    const restored = Simulation.restore(simA.serialize());

    restored.executeAction(createRandomAction('x4'));
    restored.advanceTime(1);

    const expected = runActionsWithSeed(42, ['x1', 'x2', 'x3', 'x4']);
    expect(restored.getTime()).toBe(expected.getTime());
    expect(restored.getState()).toEqual(expected.getState());
    expect(restored.getEvents()).toEqual(expected.getEvents());
  });

  it('different seeds can produce different stochastic sequences', () => {
    const actionIds = Array.from({ length: 20 }, (_, i) => 'r' + i);

    const simA = runActionsWithSeed(12345, actionIds);
    const simB = runActionsWithSeed(67890, actionIds);

    expect(simA.getTime()).toBe(simB.getTime());
    expect(simA.getState().draws).not.toEqual(simB.getState().draws);
  });

  it('SeededRandom is deterministic for same seed', () => {
    const simA = new Simulation({ id: 'rng', seed: 999 });
    const simB = new Simulation({ id: 'rng', seed: 999 });
    simA.initialize();
    simB.initialize();

    const action: SimulationAction = {
      id: 'draw',
      type: 'draw',
      execute(ctx) {
        return { patch: { value: ctx.random.nextFloat(0, 100) } };
      },
    };

    simA.executeAction(action);
    simB.executeAction(action);

    expect(simA.getState()).toEqual(simB.getState());
  });
});
