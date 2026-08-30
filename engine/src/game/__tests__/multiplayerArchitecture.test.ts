import { describe, it, expect, vi } from 'vitest';
import {
  MultiplayerSession,
  MultiplayerSessionManager,
  MULTIPLAYER_MODES,
  MULTIPLAYER_STATES,
  MULTIPLAYER_PLAYER_ROLES,
  MULTIPLAYER_CONNECTION_STATES,
  isMultiplayerMode,
  isMultiplayerSessionState,
  isMultiplayerPlayerRole,
  isMultiplayerConnectionState,
} from '../index.js';

function createSession(options: Partial<{
  id: string;
  mode: 'cooperative-soc';
  capacity: number;
  now: () => number;
}> = {}): MultiplayerSession {
  return new MultiplayerSession({
    id: options.id ?? 'session-1',
    mode: options.mode ?? 'cooperative-soc',
    capacity: options.capacity ?? 4,
    now: options.now ?? (() => 1000),
  });
}

describe('MultiplayerTypes', () => {
  it('exposes modes, states, roles, and connection states', () => {
    expect(MULTIPLAYER_MODES).toContain('cooperative-soc');
    expect(MULTIPLAYER_STATES).toEqual(['lobby', 'starting', 'active', 'paused', 'ended']);
    expect(MULTIPLAYER_PLAYER_ROLES).toContain('soc-analyst');
    expect(MULTIPLAYER_CONNECTION_STATES).toContain('connected');
    expect(isMultiplayerMode('red-vs-blue')).toBe(true);
    expect(isMultiplayerSessionState('active')).toBe(true);
    expect(isMultiplayerPlayerRole('red-team')).toBe(true);
    expect(isMultiplayerConnectionState('disconnected')).toBe(true);
  });
});

describe('MultiplayerSession', () => {
  it('creates a session with defaults', () => {
    const session = createSession();
    expect(session.id).toBe('session-1');
    expect(session.getMode()).toBe('cooperative-soc');
    expect(session.getState()).toBe('lobby');
    expect(session.getCapacity()).toBe(4);
    expect(session.getPlayerCount()).toBe(0);
  });

  it('joins and lists players', () => {
    const session = createSession();
    const player = session.join({
      id: 'p1',
      name: 'Alice',
      role: 'soc-analyst',
    });
    expect(player.joinedAt).toBe(1000);
    expect(session.getPlayer('p1')).toMatchObject({
      id: 'p1',
      name: 'Alice',
      role: 'soc-analyst',
      connectionState: 'connected',
    });
    expect(session.listPlayers()).toHaveLength(1);
  });

  it('enforces capacity and duplicate players', () => {
    const session = createSession({ capacity: 1 });
    session.join({ id: 'p1', name: 'One', role: 'soc-analyst' });
    expect(() =>
      session.join({ id: 'p2', name: 'Two', role: 'observer' }),
    ).toThrow(/full/);
    expect(() =>
      session.join({ id: 'p1', name: 'Duplicate', role: 'observer' }),
    ).toThrow(/already in session/);
  });

  it('tracks lifecycle states', () => {
    const session = createSession();
    session.start();
    expect(session.getState()).toBe('active');
    session.pause();
    expect(session.getState()).toBe('paused');
    session.resume();
    expect(session.getState()).toBe('active');
    session.end();
    expect(session.getState()).toBe('ended');
    expect(() => session.start()).toThrow(/Cannot start/);
  });

  it('rejects invalid lifecycle transitions', () => {
    const session = createSession();
    expect(() => session.pause()).toThrow(/Cannot pause/);
    expect(() => session.resume()).toThrow(/Cannot resume/);
    session.start();
    expect(() => session.start()).toThrow(/Cannot start/);
    session.end();
    expect(() => session.end()).toThrow(/already ended/);
  });

  it('sends messages and applies actions', () => {
    const session = createSession();
    session.join({ id: 'p1', name: 'Alice', role: 'soc-analyst' });
    session.start();

    const message = session.sendMessage('p1', 'chat', { text: 'hello' });
    expect(message).toMatchObject({
      senderId: 'p1',
      type: 'chat',
      data: { text: 'hello' },
    });

    const action = session.applyAction({
      playerId: 'p1',
      type: 'evidence:view',
      targetId: 'ev-001',
      data: { detail: 'log' },
    });
    expect(action).toMatchObject({
      playerId: 'p1',
      type: 'evidence:view',
      targetId: 'ev-001',
    });
    expect(session.getActionCount()).toBe(1);
  });

  it('rejects actions in non-active states', () => {
    const session = createSession();
    session.join({ id: 'p1', name: 'Alice', role: 'soc-analyst' });
    expect(() =>
      session.applyAction({ playerId: 'p1', type: 'evidence:view' }),
    ).toThrow(/session state/);
  });

  it('rejects messages from unknown players', () => {
    const session = createSession();
    expect(() => session.sendMessage('missing', 'chat')).toThrow(/not in session/);
  });

  it('updates player role and connection state', () => {
    const session = createSession();
    session.join({ id: 'p1', name: 'Alice', role: 'observer' });
    session.setPlayerRole('p1', 'incident-responder');
    expect(session.getPlayer('p1')!.role).toBe('incident-responder');

    session.setPlayerConnectionState('p1', 'reconnecting');
    expect(session.getPlayer('p1')!.connectionState).toBe('reconnecting');
  });

  it('emits snapshots to subscribers', () => {
    const session = createSession();
    const listener = vi.fn();
    const unsubscribe = session.subscribe(listener);
    session.join({ id: 'p1', name: 'Alice', role: 'soc-analyst' });
    expect(listener).toHaveBeenCalled();
    expect(listener.mock.lastCall[0]).toMatchObject({
      sessionId: 'session-1',
      playerCount: 1,
      state: 'lobby',
    });
    unsubscribe();
    session.join({ id: 'p2', name: 'Bob', role: 'observer' });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('creates replication snapshots and validates cleanly', () => {
    const session = createSession();
    session.join({ id: 'p1', name: 'Alice', role: 'soc-analyst' });
    session.start();
    session.sendMessage('p1', 'note', { text: 'checking' });
    session.applyAction({ playerId: 'p1', type: 'decision:contain' });

    const snapshot = session.createReplicationSnapshot();
    expect(snapshot.sessionId).toBe('session-1');
    expect(snapshot.state).toBe('active');
    expect(snapshot.playerCount).toBe(1);
    expect(snapshot.messageCount).toBeGreaterThan(0);
    expect(snapshot.actionCount).toBe(1);
    expect(snapshot.recentPlayers).toBeUndefined();
    expect(snapshot.players).toHaveLength(1);
    expect(() => session.validate()).not.toThrow();
  });
});

describe('MultiplayerSessionManager', () => {
  it('creates and lists sessions', () => {
    const manager = new MultiplayerSessionManager();
    manager.createSession({ id: 'soc-1', mode: 'cooperative-soc' });
    manager.createSession({ id: 'red-blue-1', mode: 'red-vs-blue' });

    expect(manager.has('soc-1')).toBe(true);
    expect(manager.listSessionIds()).toEqual(['red-blue-1', 'soc-1']);
    expect(manager.listSessions()).toHaveLength(2);
  });

  it('rejects duplicate sessions and missing removals', () => {
    const manager = new MultiplayerSessionManager();
    manager.createSession({ id: 's1', mode: 'cooperative-soc' });
    expect(() =>
      manager.createSession({ id: 's1', mode: 'cooperative-soc' }),
    ).toThrow(/already exists/);
    expect(() => manager.removeSession('missing')).toThrow(/does not exist/);
  });

  it('creates a snapshot and validates cleanly', () => {
    const manager = new MultiplayerSessionManager('Test Manager');
    manager.createSession({ id: 's1', mode: 'competitive-investigation' });

    const snapshot = manager.createSnapshot();
    expect(snapshot.name).toBe('Test Manager');
    expect(snapshot.sessionCount).toBe(1);
    expect(snapshot.sessionIds).toEqual(['s1']);
    expect(snapshot.summary).toContain('Test Manager');
    expect(() => manager.validate()).not.toThrow();
  });
});
