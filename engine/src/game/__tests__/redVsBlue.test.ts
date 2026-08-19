import { describe, it, expect } from 'vitest';
import {
  RedVsBlueManager,
  RedVsBlueSession,
  RED_VS_BLUE_TEAMS,
  RED_VS_BLUE_PLAYER_ROLES,
  isRedVsBluePlayerRole,
  isRedVsBlueTeam,
} from '../index.js';
import { DefensiveAction } from '../../cyber/index.js';

describe('RedVsBlueTypes', () => {
  it('exposes teams and player roles', () => {
    expect(RED_VS_BLUE_TEAMS).toEqual(['red', 'blue']);
    expect(RED_VS_BLUE_PLAYER_ROLES).toEqual([
      'red-team',
      'blue-team',
      'observer',
    ]);
    expect(isRedVsBlueTeam('red')).toBe(true);
    expect(isRedVsBlueTeam('green')).toBe(false);
    expect(isRedVsBluePlayerRole('blue-team')).toBe(true);
    expect(isRedVsBluePlayerRole('soc-analyst')).toBe(false);
  });
});

describe('RedVsBlueSession', () => {
  function createSession(): RedVsBlueSession {
    return new RedVsBlueSession({
      id: 'rvb-1',
      missionId: 'mission-001',
      capacity: 6,
      now: () => 1000,
    });
  }

  it('creates a red vs blue session', () => {
    const session = createSession();
    expect(session.getSessionId()).toBe('rvb-1');
    expect(session.missionId).toBe('mission-001');
    expect(session.getMultiplayerSession().getMode()).toBe('red-vs-blue');
    expect(session.getScores()).toEqual({ red: 0, blue: 0 });
  });

  it('joins red and blue players and assigns teams', () => {
    const session = createSession();
    session.joinPlayer({ id: 'r1', name: 'Red One', role: 'red-team' });
    session.joinPlayer({ id: 'b1', name: 'Blue One', role: 'blue-team' });
    session.joinPlayer({ id: 'obs', name: 'Observer', role: 'observer' });

    expect(session.getMultiplayerSession().getPlayerCount()).toBe(3);
    expect(session.getTeamState('red').playerIds).toEqual(['r1']);
    expect(session.getTeamState('blue').playerIds).toEqual(['b1']);
    expect(session.getTeamState('red').score).toBe(0);
  });

  it('rejects invalid red vs blue player role', () => {
    const session = createSession();
    expect(() =>
      session.joinPlayer({ id: 'x', name: 'X', role: 'soc-analyst' as any }),
    ).toThrow(/Red vs Blue player role/);
  });

  it('scores red objectives and blue defenses', () => {
    const session = createSession();
    session.joinPlayer({ id: 'r1', name: 'Red', role: 'red-team' });
    session.joinPlayer({ id: 'b1', name: 'Blue', role: 'blue-team' });
    session.startSession();

    session.completeRedObjective('r1', 'obj-1');
    session.completeRedObjective('r1', 'obj-2');
    session.applyBlueDefense('b1', DefensiveAction.Detect);
    session.applyBlueDefense('b1', DefensiveAction.Block);

    expect(session.getScores()).toEqual({ red: 20, blue: 10 });
    expect(session.getRedCompletedObjectives()).toEqual(['obj-1', 'obj-2']);
    expect(session.getBlueAppliedDefenses()).toEqual([
      DefensiveAction.Block,
      DefensiveAction.Detect,
    ]);
  });

  it('advances red attack path and scores', () => {
    const session = createSession();
    session.joinPlayer({ id: 'r1', name: 'Red', role: 'red-team' });
    session.startSession();

    session.advanceRedAttack('r1', 'internet', 'vpn');
    session.advanceRedAttack('r1', 'vpn', 'employee-pc');
    expect(session.getScores().red).toBe(30);
  });

  it('rejects duplicate objectives and defensive actions', () => {
    const session = createSession();
    session.joinPlayer({ id: 'r1', name: 'Red', role: 'red-team' });
    session.joinPlayer({ id: 'b1', name: 'Blue', role: 'blue-team' });
    session.startSession();

    session.completeRedObjective('r1', 'obj-1');
    expect(() => session.completeRedObjective('r1', 'obj-1')).toThrow(/already completed/);

    session.applyBlueDefense('b1', DefensiveAction.Isolate);
    expect(() => session.applyBlueDefense('b1', DefensiveAction.Isolate)).toThrow(/already been applied/);
  });

  it('rejects team actions from wrong team or inactive session', () => {
    const session = createSession();
    session.joinPlayer({ id: 'r1', name: 'Red', role: 'red-team' });
    session.joinPlayer({ id: 'b1', name: 'Blue', role: 'blue-team' });

    expect(() => session.completeRedObjective('r1', 'obj')).toThrow(/not active/);

    session.startSession();
    expect(() => session.completeRedObjective('b1', 'obj')).toThrow(/not "red"/);
    expect(() => session.applyBlueDefense('r1', DefensiveAction.Block)).toThrow(/not "blue"/);
  });

  it('creates shared snapshot and validates', () => {
    const session = createSession();
    session.joinPlayer({ id: 'r1', name: 'Red', role: 'red-team' });
    session.joinPlayer({ id: 'b1', name: 'Blue', role: 'blue-team' });
    session.startSession();
    session.completeRedObjective('r1', 'obj-1');
    session.applyBlueDefense('b1', DefensiveAction.Detect);

    const snapshot = session.createSnapshot();
    expect(snapshot.sessionId).toBe('rvb-1');
    expect(snapshot.state).toBe('active');
    expect(snapshot.playerCount).toBe(2);
    expect(snapshot.redTeam.score).toBe(10);
    expect(snapshot.blueTeam.score).toBe(5);
    expect(snapshot.summary).toContain('rvb-1');
    expect(() => session.validate()).not.toThrow();
  });
});

describe('RedVsBlueManager', () => {
  it('creates and lists sessions', () => {
    const manager = new RedVsBlueManager();
    manager.createSession({ id: 's1', missionId: 'mission-001' });
    manager.createSession({ id: 's2', missionId: 'mission-002' });

    expect(manager.has('s1')).toBe(true);
    expect(manager.listSessionIds()).toEqual(['s1', 's2']);
    expect(manager.listSessions()).toHaveLength(2);
  });

  it('rejects duplicates and missing removals', () => {
    const manager = new RedVsBlueManager();
    manager.createSession({ id: 's1', missionId: 'mission-001' });
    expect(() =>
      manager.createSession({ id: 's1', missionId: 'mission-002' }),
    ).toThrow(/already exists/);
    expect(() => manager.removeSession('missing')).toThrow(/does not exist/);
  });

  it('creates manager snapshot and validates', () => {
    const manager = new RedVsBlueManager('RvB Manager');
    manager.createSession({ id: 's1', missionId: 'mission-001' });
    const snapshot = manager.createSnapshot();
    expect(snapshot.name).toBe('RvB Manager');
    expect(snapshot.sessionCount).toBe(1);
    expect(snapshot.sessionIds).toEqual(['s1']);
    expect(snapshot.summary).toContain('RvB Manager');
    expect(() => manager.validate()).not.toThrow();
  });
});
