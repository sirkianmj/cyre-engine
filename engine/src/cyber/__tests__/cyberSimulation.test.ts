import { describe, expect, it } from 'vitest';
import { CyberSimulation } from '../simulation/CyberSimulation.js';
import { AttackStage } from '../AttackStage.js';

describe('CyberSimulation lab attack chain', () => {
  it('executes the full attack chain with meaningful state changes', () => {
    const sim = new CyberSimulation(123);
    sim.initialize();

    expect(sim.getState().attacker.position).toBe('internet');

    sim.runRecon();
    let state = sim.getState();
    expect(state.attacker.discoveredServices).toContain('gateway:https');
    expect(state.attackStage).toBe(AttackStage.Recon);

    sim.discoverServices();
    state = sim.getState();
    expect(state.attacker.discoveredServices).toEqual([
      'gateway:https',
      'web-server:http',
      'web-server:https',
    ]);

    sim.exploitWebServer();
    state = sim.getState();
    expect(state.hosts['web-server'].compromised).toBe(true);
    expect(state.hosts['web-server'].accessLevel).toBe('user');
    expect(state.attacker.position).toBe('web-server');
    expect(state.attacker.privileges).toBe('user');
    expect(state.attackStage).toBe(AttackStage.InitialAccess);

    sim.escalatePrivileges();
    state = sim.getState();
    expect(state.hosts['web-server'].accessLevel).toBe('admin');
    expect(state.attacker.privileges).toBe('admin');
    expect(state.attackStage).toBe(AttackStage.PrivilegeEscalation);

    sim.moveToDatabase();
    state = sim.getState();
    expect(state.attacker.position).toBe('database-server');
    expect(state.hosts['database-server'].compromised).toBe(true);
    expect(state.hosts['database-server'].accessLevel).toBe('user');
    expect(state.attackStage).toBe(AttackStage.LateralMovement);

    sim.accessTarget();
    state = sim.getState();
    expect(state.objective.achieved).toBe(true);
    expect(state.attackStage).toBe(AttackStage.Exfiltration);

    expect(state.monitoring.logs.map((log) => log.type)).toEqual([
      'recon',
      'service_discovery',
      'exploit',
      'privilege_escalation',
      'lateral_movement',
      'target_access',
    ]);
  });

  it('prevents skipping required attack steps', () => {
    const sim = new CyberSimulation(123);
    sim.initialize();
    expect(() => sim.exploitWebServer()).toThrowError(/must discover web service/i);
    expect(() => sim.escalatePrivileges()).toThrowError(/must have user access/i);
    expect(() => sim.moveToDatabase()).toThrowError(/must have admin privileges/i);
    expect(() => sim.accessTarget()).toThrowError(/must be on database server/i);
  });

  it('generates exact detection evidence and alerts, then defender isolation blocks lateral movement', () => {
    const sim = new CyberSimulation(123);
    sim.initialize();

    sim.runRecon();
    sim.discoverServices();
    sim.exploitWebServer();

    sim.detectThreats();
    let state = sim.getState();

    expect(state.evidence.map((item) => item.type).sort()).toEqual([
      'exploit',
      'recon',
      'service_discovery',
    ]);
    expect(state.alerts.map((item) => item.severity).sort()).toEqual([
      'high',
      'low',
      'low',
    ]);

    const highAlert = state.alerts.find((item) => item.severity === 'high');
    expect(highAlert).toBeDefined();
    expect(highAlert!.title).toContain('exploit');
    expect(highAlert!.sourceId).toBe('internet');
    expect(highAlert!.status).toBe('new');

    sim.investigateAlert(highAlert!.id);
    state = sim.getState();
    expect(
      state.alerts.find((item) => item.id === highAlert!.id)?.status,
    ).toBe('investigating');
    expect(
      state.defenderActions.some(
        (action) =>
          action.action === 'investigate' && action.targetId === highAlert!.id,
      ),
    ).toBe(true);

    sim.isolateHost('web-server');
    state = sim.getState();
    expect(state.hosts['web-server'].isolated).toBe(true);
    expect(
      state.defenderActions.some(
        (action) =>
          action.action === 'isolate' && action.targetId === 'web-server',
      ),
    ).toBe(true);

    expect(() => sim.moveToDatabase()).toThrowError(/isolated host/i);
  });

  it('blocked network path prevents lateral movement', () => {
    const sim = new CyberSimulation(123);
    sim.initialize();
    sim.runRecon();
    sim.discoverServices();
    sim.exploitWebServer();
    sim.escalatePrivileges();

    sim.blockNetworkPath('web-server', 'database-server');

    const state = sim.getState();
    expect(state.blockedPaths).toEqual([
      { source: 'web-server', target: 'database-server' },
    ]);
    expect(
      state.defenderActions.some(
        (action) =>
          action.action === 'block' &&
          action.targetId === 'web-server->database-server',
      ),
    ).toBe(true);

    expect(() => sim.moveToDatabase()).toThrowError(/blocked/i);
  });

  it('restoring an isolated host removes attacker access', () => {
    const sim = new CyberSimulation(123);
    sim.initialize();
    sim.runRecon();
    sim.discoverServices();
    sim.exploitWebServer();
    sim.isolateHost('web-server');

    sim.restoreHost('web-server');

    const state = sim.getState();
    expect(state.hosts['web-server'].isolated).toBe(false);
    expect(state.hosts['web-server'].compromised).toBe(false);
    expect(state.hosts['web-server'].accessLevel).toBe('none');
    expect(state.attacker.position).toBe('internet');
    expect(state.attacker.privileges).toBe('none');
    expect(
      state.defenderActions.some(
        (action) =>
          action.action === 'restore' && action.targetId === 'web-server',
      ),
    ).toBe(true);
  });

  it('rejects invalid defender actions', () => {
    const sim = new CyberSimulation(123);
    sim.initialize();

    expect(() => sim.investigateAlert('missing')).toThrowError(/not found/i);
    expect(() => sim.isolateHost('missing')).toThrowError(/not found/i);
    expect(() => sim.blockNetworkPath('missing', 'internet')).toThrowError(
      /does not exist/i,
    );

    sim.runRecon();
    sim.discoverServices();
    sim.exploitWebServer();
    sim.detectThreats();

    const highAlert = sim
      .getState()
      .alerts.find((item) => item.severity === 'high');

    expect(highAlert).toBeDefined();

    sim.investigateAlert(highAlert!.id);
    expect(() => sim.investigateAlert(highAlert!.id)).toThrowError(
      /cannot investigate alert/i,
    );

    sim.isolateHost('web-server');
    expect(() => sim.isolateHost('web-server')).toThrowError(
      /already isolated/i,
    );

    sim.restoreHost('web-server');
    expect(() => sim.restoreHost('web-server')).toThrowError(
      /already restored/i,
    );
  });
});
