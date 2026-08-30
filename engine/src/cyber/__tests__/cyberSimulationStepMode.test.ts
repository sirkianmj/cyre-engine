import { describe, expect, it } from 'vitest';

import { CyberSimulation } from '../simulation/CyberSimulation.js';

describe('CyberSimulation deterministic step mode', () => {
  it('exposes the configured seed', () => {
    const simulation = new CyberSimulation(4242);
    simulation.initialize();

    expect(simulation.getSeed()).toBe(4242);
    expect(simulation.createReplay().seed).toBe(4242);
  });

  it('advances the simulation clock one tick per step', () => {
    const simulation = new CyberSimulation(7);
    simulation.initialize();

    const start = simulation.getTime();
    const first = simulation.step();
    const second = simulation.step();

    expect(first).toBeGreaterThan(start);
    expect(second).toBeGreaterThan(first);
    expect(simulation.getTime()).toBe(second);
  });

  it('publishes a simulation.tick event for each step', () => {
    const simulation = new CyberSimulation(11);
    simulation.initialize();

    simulation.step();
    simulation.step();

    const ticks = simulation
      .getEventHistory()
      .filter((event) => event.type === 'simulation.tick');

    expect(ticks).toHaveLength(2);
  });

  it('keeps stepping deterministic for the same seed', () => {
    const left = new CyberSimulation(99);
    left.initialize();
    left.step();
    left.step();
    left.step();

    const right = new CyberSimulation(99);
    right.initialize();
    right.step();
    right.step();
    right.step();

    expect(right.getTime()).toBe(left.getTime());
    expect(right.getState()).toEqual(left.getState());
  });

  it('rejects stepping before initialization', () => {
    const simulation = new CyberSimulation(3);

    expect(() => simulation.step()).toThrow();
  });
});
