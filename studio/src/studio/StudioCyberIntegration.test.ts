import { describe, expect, it } from 'vitest';
import { StudioApplication } from './StudioApplication';

describe('Studio cyber simulation integration', () => {
  it('initializes deterministic cyber simulation from Studio', () => {
    const app = new StudioApplication();
    app.initializeCyberSimulation(12345);

    const state = app.getState();

    expect(state.cyberSimulationState).not.toBeNull();
    expect(state.cyberSimulationState?.attacker.position).toBe('internet');
    expect(state.cyberSimulationReplay).not.toBeNull();
    expect(state.cyberSimulationReplay?.seed).toBe(12345);
  });

  it('executes engine action and reflects state in snapshot', () => {
    const app = new StudioApplication();
    app.initializeCyberSimulation(42);

    app.executeCyberSimulationAction('runRecon');
    app.executeCyberSimulationAction('discoverServices');
    app.executeCyberSimulationAction('exploitWebServer');

    const state = app.getState();
    expect(state.cyberSimulationState?.hosts['web-server'].compromised).toBe(true);
    expect(state.cyberSimulationState?.attacker.position).toBe('web-server');
  });

  it('executes defender action and blocks lateral movement', () => {
    const app = new StudioApplication();
    app.initializeCyberSimulation(42);

    app.executeCyberSimulationAction('runRecon');
    app.executeCyberSimulationAction('discoverServices');
    app.executeCyberSimulationAction('exploitWebServer');
    app.executeCyberSimulationAction('isolateHost', { hostId: 'web-server' });

    expect(() =>
      app.executeCyberSimulationAction('moveToDatabase'),
    ).toThrowError(/isolated host/i);
  });

  it('replays deterministic cyber simulation through Studio', () => {
    const first = new StudioApplication();
    first.initializeCyberSimulation(123);
    first.executeCyberSimulationAction('runRecon');
    first.executeCyberSimulationAction('discoverServices');
    first.executeCyberSimulationAction('exploitWebServer');

    const replay = first.getState().cyberSimulationReplay;
    expect(replay).not.toBeNull();

    const second = new StudioApplication();
    second.replayCyberSimulation(replay!);

    expect(second.getState().cyberSimulationState).toEqual(
      first.getState().cyberSimulationState,
    );
    expect(
      second.getState().cyberSimulationState?.hosts['web-server'].compromised,
    ).toBe(true);
  });
});
