import { describe, it, expect, vi } from 'vitest';
import { ReplayRecorder } from '../ReplayRecorder.js';
import { ReplayPlayer } from '../ReplayPlayer.js';
import type { ReplayEvent } from '../ReplayEvent.js';

describe('ReplayRecorder', () => {
  it('records events with timestamps', () => {
    const recorder = new ReplayRecorder();
    recorder.record('login', { user: 'alice' }, 100);
    recorder.record('logout', { user: 'alice' }, 200);
    const events = recorder.getEvents();
    expect(events).toHaveLength(2);
    expect(events[0].type).toBe('login');
    expect(events[1].timestamp).toBe(200);
  });

  it('throws on empty type', () => {
    const recorder = new ReplayRecorder();
    expect(() => recorder.record('', {}, 100)).toThrow(/non-empty/);
  });

  it('throws on invalid timestamp', () => {
    const recorder = new ReplayRecorder();
    expect(() => recorder.record('login', {}, -1)).toThrow(/non-negative/);
  });

  it('clears events', () => {
    const recorder = new ReplayRecorder();
    recorder.record('login', {}, 100);
    recorder.clear();
    expect(recorder.getEvents()).toEqual([]);
  });

  it('serialises to JSON', () => {
    const recorder = new ReplayRecorder();
    recorder.record('alert', { id: 'a1' }, 100);
    expect(recorder.toJSON()).toHaveLength(1);
  });
});

describe('ReplayPlayer', () => {
  const events: ReplayEvent[] = [
    { id: 'e1', timestamp: 100, type: 'login' },
    { id: 'e2', timestamp: 200, type: 'logout' },
    { id: 'e3', timestamp: 300, type: 'alert' },
  ];

  it('replays events in order', () => {
    const player = new ReplayPlayer(events);
    const callback = vi.fn();
    player.play(callback);
    expect(callback).toHaveBeenCalledTimes(3);
    expect(callback.mock.calls[0][0]).toMatchObject({ id: 'e1' });
    expect(callback.mock.calls[2][0]).toMatchObject({ id: 'e3' });
    expect(player.getCurrentIndex()).toBe(3);
  });

  it('throws when playing already playing', () => {
    const player = new ReplayPlayer(events);
    player.play(() => {
      // This callback triggers while playing = true
      expect(() => player.play(() => {})).toThrow(/already playing/);
      player.pause(); // prevent infinite loop
    });
  });

  it('stops and resets index', () => {
    const player = new ReplayPlayer(events);
    player.jumpTo(2);
    player.stop();
    expect(player.getCurrentIndex()).toBe(0);
  });

  it('jumpTo valid index', () => {
    const player = new ReplayPlayer(events);
    player.jumpTo(1);
    expect(player.getCurrentIndex()).toBe(1);
    player.play(() => {});
    expect(player.getCurrentIndex()).toBe(3);
  });

  it('throws on jumpTo invalid index', () => {
    const player = new ReplayPlayer(events);
    expect(() => player.jumpTo(5)).toThrow(/out of bounds/);
  });
});
