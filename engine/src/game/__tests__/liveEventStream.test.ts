import { describe, it, expect, vi } from 'vitest';
import { LiveEventStream } from '../LiveEventStream.js';

function createClock(start = 0): { current: number; now(): number } {
  return {
    current: start,
    now() {
      return this.current;
    },
  };
}

describe('LiveEventStream', () => {
  it('starts empty', () => {
    const stream = new LiveEventStream();
    expect(stream.getEventCount()).toBe(0);
    expect(stream.listHistory()).toEqual([]);
  });

  it('publishes events with incrementing sequence numbers', () => {
    const clock = createClock(1_000);
    const stream = new LiveEventStream({ clock });

    const first = stream.recordAlertAcknowledged('alert-1');
    clock.current = 2_000;
    const second = stream.recordEvidenceViewed('evidence-1');

    expect(first.sequence).toBe(1);
    expect(second.sequence).toBe(2);
    expect(second.timestamp).toBe(2_000);
    expect(stream.getEventCount()).toBe(2);
  });

  it('bounds event history to maxHistory', () => {
    const stream = new LiveEventStream({ maxHistory: 2 });

    stream.recordAlertAcknowledged('a1');
    stream.recordEvidenceViewed('e1');
    stream.recordHypothesisFormed('h1');

    const history = stream.listHistory();
    expect(history).toHaveLength(2);
    expect(history.map((event) => event.source)).toEqual(['e1', 'h1']);
  });

  it('notifies subscribers and provides unsubscribe', () => {
    const stream = new LiveEventStream();
    const listener = vi.fn();

    const unsubscribe = stream.subscribe(listener);
    stream.recordAlertAcknowledged('alert-1');
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    stream.recordEvidenceViewed('evidence-1');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('returns event and history copies', () => {
    const stream = new LiveEventStream();
    const event = stream.recordAlertAcknowledged('alert-1', { severity: 'high' });

    event.data!.severity = 'low';
    expect(stream.getRecentEvents(1)[0].data).toEqual({ severity: 'high' });

    const history = stream.listHistory();
    history[0].source = 'mutated';
    expect(stream.listHistory()[0].source).toBe('alert-1');
  });

  it('returns recent events', () => {
    const stream = new LiveEventStream();
    stream.recordAlertAcknowledged('a1');
    stream.recordEvidenceViewed('e1');
    stream.recordHypothesisFormed('h1');

    expect(stream.getRecentEvents(2).map((event) => event.source)).toEqual(['e1', 'h1']);
  });

  it('clears all events', () => {
    const stream = new LiveEventStream();
    stream.recordAlertAcknowledged('a1');
    stream.clear();
    expect(stream.getEventCount()).toBe(0);
    expect(stream.listHistory()).toEqual([]);
  });

  it('validates maxHistory option', () => {
    expect(() => new LiveEventStream({ maxHistory: 0 })).toThrow(/positive integer/);
    expect(() => new LiveEventStream({ maxHistory: -1 })).toThrow(/positive integer/);
  });

  it('validates clock option', () => {
    expect(() => new LiveEventStream({ clock: {} as any })).toThrow(/must expose a now/);
  });

  it('rejects invalid event data', () => {
    const stream = new LiveEventStream();
    expect(() => stream.recordEvidenceViewed('e1', null as any)).toThrow(/must be an object/);
  });

  it('rejects invalid source', () => {
    const stream = new LiveEventStream();
    expect(() => stream.publish('evidence_viewed', '   ')).toThrow(/cannot be empty/);
  });

  it('validates recent event limit', () => {
    const stream = new LiveEventStream();
    expect(() => stream.getRecentEvents(-1)).toThrow(/non-negative integer/);
  });
});
