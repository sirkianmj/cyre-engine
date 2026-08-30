import { describe, it, expect } from 'vitest';
import { Timeline } from '../Timeline.js';
import type { TimelineEvent } from '../TimelineTypes.js';

describe('Timeline', () => {
  it('adds and retrieves events sorted by timestamp', () => {
    const timeline = new Timeline();
    timeline.add({ id: 'e2', type: 'alert', timestamp: 200 });
    timeline.add({ id: 'e1', type: 'alert', timestamp: 100 });
    timeline.add({ id: 'e3', type: 'log', timestamp: 300 });

    const all = timeline.getAll();
    expect(all.map((e) => e.id)).toEqual(['e1', 'e2', 'e3']);
  });

  it('throws on empty id or type', () => {
    const timeline = new Timeline();
    expect(() => timeline.add({ id: '', type: 'log', timestamp: 1 })).toThrow(/non-empty/);
    expect(() => timeline.add({ id: 'e1', type: '', timestamp: 1 })).toThrow(/non-empty/);
  });

  it('throws on invalid timestamp', () => {
    const timeline = new Timeline();
    expect(() => timeline.add({ id: 'e1', type: 'log', timestamp: -1 })).toThrow(/non-negative/);
    expect(() => timeline.add({ id: 'e1', type: 'log', timestamp: 1.5 })).toThrow(/integer/);
  });

  it('throws on duplicate id', () => {
    const timeline = new Timeline();
    timeline.add({ id: 'e1', type: 'log', timestamp: 100 });
    expect(() => timeline.add({ id: 'e1', type: 'alert', timestamp: 200 })).toThrow(/already exists/);
  });

  it('filters by type', () => {
    const timeline = new Timeline();
    timeline.add({ id: 'e1', type: 'log', timestamp: 100 });
    timeline.add({ id: 'e2', type: 'alert', timestamp: 200 });
    expect(timeline.filterByType('log')).toHaveLength(1);
  });

  it('filters by source and target', () => {
    const timeline = new Timeline();
    timeline.add({ id: 'e1', type: 'log', timestamp: 100, sourceId: 'host1', targetId: 'host2' });
    timeline.add({ id: 'e2', type: 'log', timestamp: 200, sourceId: 'host2', targetId: 'host3' });
    expect(timeline.filterBySource('host1')).toHaveLength(1);
    expect(timeline.filterByTarget('host3')).toHaveLength(1);
  });

  it('filters by time range', () => {
    const timeline = new Timeline();
    timeline.add({ id: 'e1', type: 'log', timestamp: 100 });
    timeline.add({ id: 'e2', type: 'log', timestamp: 200 });
    timeline.add({ id: 'e3', type: 'log', timestamp: 300 });
    expect(timeline.filterByTimeRange(150, 250)).toHaveLength(1);
  });

  it('throws on invalid time range', () => {
    const timeline = new Timeline();
    expect(() => timeline.filterByTimeRange(300, 100)).toThrow(/less than or equal/);
  });

  it('clears events', () => {
    const timeline = new Timeline();
    timeline.add({ id: 'e1', type: 'log', timestamp: 100 });
    timeline.clear();
    expect(timeline.getAll()).toEqual([]);
  });

  it('serialises to JSON', () => {
    const timeline = new Timeline();
    timeline.add({ id: 'e1', type: 'log', timestamp: 100 });
    const json = timeline.toJSON();
    expect(json).toHaveLength(1);
    expect(json[0].id).toBe('e1');
  });
});
