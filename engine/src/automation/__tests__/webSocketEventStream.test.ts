import { describe, it, expect } from 'vitest';
import {
  WebSocketEventStream,
  type WebSocketLike,
  type WebSocketEventEnvelope,
} from '../index.js';

class MemorySocket implements WebSocketLike {
  readonly sent: string[] = [];
  closed = false;

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.closed = true;
  }
}

describe('WebSocketEventStream', () => {
  it('publishes events and returns envelopes', () => {
    const stream = new WebSocketEventStream();
    const envelope = stream.publish({
      type: 'incident_detected',
      timestamp: 1000,
      source: 'siem',
      data: { severity: 'high' },
    });

    expect(envelope.id).toBe('stream-event-1');
    expect(envelope.sequence).toBe(1);
    expect(envelope.type).toBe('incident_detected');
    expect(envelope.data).toEqual({ severity: 'high' });
    expect(stream.getStats().emittedCount).toBe(1);
    expect(stream.getHistory()).toHaveLength(1);
  });

  it('emits alias works', () => {
    const stream = new WebSocketEventStream();
    const envelope = stream.emit({ type: 'mission_completed', timestamp: 2000 });
    expect(envelope.sequence).toBe(1);
  });

  it('subscribes to all events and applies type filter', () => {
    const stream = new WebSocketEventStream();
    const all: WebSocketEventEnvelope[] = [];
    const incidents: WebSocketEventEnvelope[] = [];

    stream.subscribe((envelope) => all.push(envelope));
    stream.subscribe(
      (envelope) => incidents.push(envelope),
      { types: ['incident_detected'] },
    );

    stream.publish({ type: 'incident_detected', timestamp: 1 });
    stream.publish({ type: 'mission_completed', timestamp: 2 });

    expect(all).toHaveLength(2);
    expect(incidents).toHaveLength(1);
    expect(incidents[0].type).toBe('incident_detected');
    expect(stream.getStats().deliveredCount).toBe(3);
  });

  it('replays history for new subscribers when requested', () => {
    const stream = new WebSocketEventStream();
    stream.publish({ type: 'incident_detected', timestamp: 1 });
    stream.publish({ type: 'host_compromised', timestamp: 2 });

    const replayed: WebSocketEventEnvelope[] = [];
    stream.subscribe(
      (envelope) => replayed.push(envelope),
      { includeHistory: true, types: ['incident_detected'] },
    );

    expect(replayed).toHaveLength(1);
    expect(replayed[0].type).toBe('incident_detected');
  });

  it('supports unsubscribe and filters by source/time', () => {
    const stream = new WebSocketEventStream();
    const seen: WebSocketEventEnvelope[] = [];
    const unsubscribe = stream.subscribe(
      (envelope) => seen.push(envelope),
      {
        sources: ['vpn'],
        fromTimestamp: 10,
        toTimestamp: 20,
      },
    );

    stream.publish({ type: 'alert', timestamp: 5, source: 'vpn' });
    stream.publish({ type: 'alert', timestamp: 15, source: 'vpn' });
    stream.publish({ type: 'alert', timestamp: 25, source: 'vpn' });
    stream.publish({ type: 'alert', timestamp: 15, source: 'siem' });

    expect(seen).toHaveLength(1);
    expect(seen[0].source).toBe('vpn');
    expect(seen[0].timestamp).toBe(15);

    unsubscribe();
    stream.publish({ type: 'alert', timestamp: 12, source: 'vpn' });
    expect(seen).toHaveLength(1);
  });

  it('attaches a socket and sends serialized envelopes', () => {
    const stream = new WebSocketEventStream();
    const socket = new MemorySocket();
    const detach = stream.attachSocket(socket, { types: ['attack_completed'] });

    stream.publish({ type: 'attack_completed', timestamp: 10, data: { target: 'db' } });
    stream.publish({ type: 'mission_completed', timestamp: 20 });

    expect(socket.sent).toHaveLength(1);
    expect(JSON.parse(socket.sent[0])).toMatchObject({
      type: 'attack_completed',
      data: { target: 'db' },
    });

    detach();
    stream.publish({ type: 'attack_completed', timestamp: 30 });
    expect(socket.sent).toHaveLength(1);
    expect(stream.getStats().attachedSocketCount).toBe(0);
  });

  it('detaches socket by id', () => {
    const stream = new WebSocketEventStream();
    const socket = new MemorySocket();
    stream.attachSocket(socket, { types: ['incident_detected'] });
    const socketId = stream.listSocketIds()[0];
    expect(stream.listSocketIds()).toHaveLength(1);

    stream.detachSocket(socketId);
    expect(stream.listSocketIds()).toHaveLength(0);
    expect(() => stream.detachSocket(socketId)).toThrow(/does not exist/);
  });

  it('closes all sockets and subscribers', () => {
    const stream = new WebSocketEventStream();
    const socket = new MemorySocket();
    stream.attachSocket(socket);
    stream.subscribe(() => {});

    stream.close();
    expect(socket.closed).toBe(true);
    expect(stream.getStats().subscriberCount).toBe(0);
    expect(stream.getStats().attachedSocketCount).toBe(0);
  });

  it('rejects invalid events and filters', () => {
    const stream = new WebSocketEventStream();
    expect(() => stream.publish({ type: '', timestamp: 1 })).toThrow(/type/);
    expect(() => stream.publish({ type: 'x', timestamp: Number.NaN })).toThrow(/timestamp/);
    expect(() => stream.subscribe(() => {}, { types: [''] })).toThrow(/non-empty/);
    expect(() => stream.subscribe(() => {}, { fromTimestamp: 10, toTimestamp: 5 })).toThrow(/exceed/);
    expect(() => stream.attachSocket({ send: 'bad' } as any)).toThrow(/send/);
  });

  it('creates snapshots and validates cleanly', () => {
    const stream = new WebSocketEventStream({
      name: 'Test Stream',
      historyLimit: 3,
    });
    stream.publish({ type: 'incident_detected', timestamp: 1 });
    stream.publish({ type: 'host_compromised', timestamp: 2 });
    stream.publish({ type: 'mission_completed', timestamp: 3 });
    stream.publish({ type: 'suspicious_activity_detected', timestamp: 4 });
    stream.subscribe(() => {});

    const snapshot = stream.createSnapshot();
    expect(snapshot.name).toBe('Test Stream');
    expect(snapshot.stats.emittedCount).toBe(4);
    expect(snapshot.stats.historySize).toBe(3);
    expect(snapshot.recentEvents[0].type).toBe('host_compromised');
    expect(snapshot.subscriberIds).toHaveLength(1);
    expect(snapshot.summary).toContain('Test Stream');
    expect(() => stream.validate()).not.toThrow();
  });
});
