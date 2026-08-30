import { describe, expect, it } from 'vitest';
import { CyberSimulation } from '../simulation/CyberSimulation.js';

function runOriginal() {
  const sim = new CyberSimulation(12345);
  sim.initialize();
  sim.runRecon();
  sim.discoverServices();
  sim.exploitWebServer();
  sim.detectThreats();

  const highAlert = sim
    .getState()
    .alerts.find((alert) => alert.severity === 'high');

  if (!highAlert) {
    throw new Error('Expected high alert not found.');
  }

  sim.investigateAlert(highAlert.id);
  sim.isolateHost('web-server');
  return sim;
}

describe('CyberSimulation replay', () => {
  it('reproduces final state, time, and event sequence', () => {
    const original = runOriginal();
    const replay = original.createReplay();
    const replayed = CyberSimulation.replay(replay);

    expect(replayed.getTime()).toBe(original.getTime());
    expect(replayed.getState()).toEqual(original.getState());
    expect(replayed.getEventHistory()).toEqual(original.getEventHistory());
  });

  it('reproduces via JSON serialization and deserialization', () => {
    const original = runOriginal();
    const json = JSON.stringify(original.createReplay());
    const loaded = JSON.parse(json) as ReturnType<typeof original.createReplay>;
    const replayed = CyberSimulation.replay(loaded);

    expect(replayed.getTime()).toBe(original.getTime());
    expect(replayed.getState()).toEqual(original.getState());
    expect(replayed.getEventHistory()).toEqual(original.getEventHistory());
  });

  it('rejects malformed replay objects', () => {
    expect(() => CyberSimulation.replay(null as any)).toThrowError(
      /replay must be an object/i,
    );

    expect(() =>
      CyberSimulation.replay({
        formatVersion: 999,
        engineVersion: '1.0.4',
        scenarioId: 'cyber-lab',
        seed: 1,
        actions: [],
      } as any),
    ).toThrowError(/unsupported replay format version/i);

    expect(() =>
      CyberSimulation.replay({
        formatVersion: 1,
        engineVersion: '1.0.4',
        scenarioId: 'cyber-lab',
        seed: -1,
        actions: [],
      } as any),
    ).toThrowError(/seed must be a non-negative integer/i);

    expect(() =>
      CyberSimulation.replay({
        formatVersion: 1,
        engineVersion: '1.0.4',
        scenarioId: 'cyber-lab',
        seed: 1,
        actions: [{ method: '' }],
      } as any),
    ).toThrowError(/method must be a non-empty string/i);
  });

  it('rejects malformed action arguments', () => {
    expect(() =>
      CyberSimulation.replay({
        formatVersion: 1,
        engineVersion: '1.0.4',
        scenarioId: 'cyber-lab',
        seed: 1,
        actions: [{ method: 'isolateHost', args: [] }],
      } as any),
    ).toThrowError(/args must be an object/i);
  });

  it('rejects invalid replay JSON', () => {
    expect(() => CyberSimulation.replayFromJSON('not-json')).toThrowError(
      /invalid replay json/i,
    );
  });

  it('replays full attack chain deterministically', () => {
    const sim = new CyberSimulation(42);
    sim.initialize();
    sim.runRecon();
    sim.discoverServices();
    sim.exploitWebServer();
    sim.escalatePrivileges();
    sim.moveToDatabase();
    sim.accessTarget();

    const replayed = CyberSimulation.replay(sim.createReplay());

    expect(replayed.getState()).toEqual(sim.getState());
    expect(replayed.getTime()).toBe(sim.getTime());
    expect(replayed.getEventHistory()).toEqual(sim.getEventHistory());
  });
});
