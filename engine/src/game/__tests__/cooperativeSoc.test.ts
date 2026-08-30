import { describe, it, expect } from 'vitest';
import {
  CooperativeSocManager,
  CooperativeSocSession,
  COOPERATIVE_SOC_ROLES,
  isCooperativeSocRole,
} from '../index.js';

describe('CooperativeSocTypes', () => {
  it('exposes cooperative roles', () => {
    expect(COOPERATIVE_SOC_ROLES).toEqual([
      'soc-analyst',
      'incident-responder',
      'threat-hunter',
      'observer',
    ]);
    expect(isCooperativeSocRole('soc-analyst')).toBe(true);
    expect(isCooperativeSocRole('red-team')).toBe(false);
  });
});

describe('CooperativeSocSession', () => {
  function createSession(): CooperativeSocSession {
    return new CooperativeSocSession({
      id: 'soc-session-1',
      missionId: 'mission-001',
      capacity: 4,
      now: () => 1000,
    });
  }

  it('creates a session with mission and evidence ids', () => {
    const session = createSession();
    expect(session.getSessionId()).toBe('soc-session-1');
    expect(session.missionId).toBe('mission-001');
    expect(session.getEvidenceIds()).toContain('ev-001');
    expect(session.getEvidenceIds()).toContain('ev-004');
  });

  it('rejects unknown mission and invalid options', () => {
    expect(
      () => new CooperativeSocSession({ id: 'x', missionId: 'missing' }),
    ).toThrow(/not registered/);
    expect(
      () => new CooperativeSocSession({ id: '', missionId: 'mission-001' }),
    ).toThrow(/id/);
  });

  it('joins cooperative players and rejects invalid roles', () => {
    const session = createSession();
    session.joinPlayer({ id: 'p1', name: 'Alice', role: 'soc-analyst' });
    session.joinPlayer({ id: 'p2', name: 'Bob', role: 'incident-responder' });
    expect(session.getMultiplayerSession().getPlayerCount()).toBe(2);

    expect(() =>
      session.joinPlayer({ id: 'p3', name: 'Eve', role: 'red-team' as any }),
    ).toThrow(/cooperative SOC role/);
  });

  it('assigns and reviews evidence', () => {
    const session = createSession();
    session.joinPlayer({ id: 'p1', name: 'Alice', role: 'soc-analyst' });
    session.joinPlayer({ id: 'p2', name: 'Bob', role: 'threat-hunter' });
    session.startSession();

    const assignment = session.assignEvidence('p1', 'ev-001');
    expect(assignment).toMatchObject({
      evidenceId: 'ev-001',
      playerId: 'p1',
      reviewed: false,
    });

    const reviewed = session.reviewEvidence('p1', 'ev-001');
    expect(reviewed.reviewed).toBe(true);
    expect(reviewed.reviewedAt).toBe(1000);
    expect(session.getReviewedEvidenceCount()).toBe(1);
    expect(session.getMultiplayerSession().getActionCount()).toBeGreaterThan(0);
  });

  it('prevents duplicate assignment or wrong review', () => {
    const session = createSession();
    session.joinPlayer({ id: 'p1', name: 'Alice', role: 'soc-analyst' });
    session.joinPlayer({ id: 'p2', name: 'Bob', role: 'soc-analyst' });
    session.startSession();

    session.assignEvidence('p1', 'ev-001');
    expect(() => session.assignEvidence('p2', 'ev-001')).toThrow(/already assigned/);
    expect(() => session.reviewEvidence('p2', 'ev-001')).toThrow(/not "p2"/);
    expect(() => session.reviewEvidence('p1', 'ev-001')).not.toThrow();
    expect(() => session.reviewEvidence('p1', 'ev-001')).toThrow(/already been reviewed/);
  });

  it('rejects actions before session is active', () => {
    const session = createSession();
    session.joinPlayer({ id: 'p1', name: 'Alice', role: 'soc-analyst' });
    expect(() => session.assignEvidence('p1', 'ev-001')).toThrow(/not active/);
  });

  it('forms hypotheses and identifies attack path', () => {
    const session = createSession();
    session.joinPlayer({ id: 'p1', name: 'Alice', role: 'soc-analyst' });
    session.startSession();

    session.formHypothesis('p1', 'Compromised VPN credentials');
    expect(session.missionRunner.investigation.getHypotheses()).toHaveLength(1);

    session.identifyAttackPath('p1', 'internet', 'database');
    expect(session.missionRunner.investigation.getAttackPath()).toEqual({
      source: 'internet',
      target: 'database',
    });
  });

  it('performs containment, recovery, and completes investigation', () => {
    const session = createSession();
    session.joinPlayer({ id: 'p1', name: 'Alice', role: 'incident-responder' });
    session.startSession();

    session.containIncident('p1');
    session.recoverIncident('p1');
    session.completeInvestigation();

    expect(session.missionRunner.getMissionStatus()).toBe('completed');
    expect(session.getMultiplayerSession().getState()).toBe('ended');
  });

  it('creates shared snapshot', () => {
    const session = createSession();
    session.joinPlayer({ id: 'p1', name: 'Alice', role: 'soc-analyst' });
    session.startSession();
    session.assignEvidence('p1', 'ev-001');
    session.reviewEvidence('p1', 'ev-001');

    const snapshot = session.createSnapshot();
    expect(snapshot.sessionId).toBe('soc-session-1');
    expect(snapshot.missionId).toBe('mission-001');
    expect(snapshot.playerCount).toBe(1);
    expect(snapshot.assignmentCount).toBe(1);
    expect(snapshot.reviewedEvidenceCount).toBe(1);
    expect(snapshot.summary).toContain('soc-session-1');
    expect(() => session.validate()).not.toThrow();
  });
});

describe('CooperativeSocManager', () => {
  it('creates and lists sessions', () => {
    const manager = new CooperativeSocManager();
    manager.createSession({ id: 's1', missionId: 'mission-001' });
    manager.createSession({ id: 's2', missionId: 'mission-002' });

    expect(manager.has('s1')).toBe(true);
    expect(manager.listSessionIds()).toEqual(['s1', 's2']);
    expect(manager.listSessions()).toHaveLength(2);
  });

  it('rejects duplicates and missing removals', () => {
    const manager = new CooperativeSocManager();
    manager.createSession({ id: 's1', missionId: 'mission-001' });
    expect(() =>
      manager.createSession({ id: 's1', missionId: 'mission-002' }),
    ).toThrow(/already exists/);
    expect(() => manager.removeSession('missing')).toThrow(/does not exist/);
  });

  it('creates manager snapshot and validates', () => {
    const manager = new CooperativeSocManager('SOC Manager');
    manager.createSession({ id: 's1', missionId: 'mission-001' });
    const snapshot = manager.createSnapshot();
    expect(snapshot.name).toBe('SOC Manager');
    expect(snapshot.sessionCount).toBe(1);
    expect(snapshot.sessionIds).toEqual(['s1']);
    expect(snapshot.summary).toContain('SOC Manager');
    expect(() => manager.validate()).not.toThrow();
  });
});
