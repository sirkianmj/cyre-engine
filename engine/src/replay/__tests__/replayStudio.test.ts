import { describe, it, expect } from 'vitest';
import { ReplayStudio } from '../ReplayStudio.js';
import type { ReplayEvent } from '../ReplayEvent.js';

function createEvents(): ReplayEvent[] {
  return [
    { id: 'e1', timestamp: 100, type: 'login', data: { user: 'alice' } },
    { id: 'e2', timestamp: 200, type: 'command', data: { command: 'whoami' } },
    { id: 'e3', timestamp: 300, type: 'alert', data: { severity: 'high' } },
  ];
}

describe('ReplayStudio', () => {
  it('loads events sorted by timestamp', () => {
    const studio = new ReplayStudio([
      { id: 'late', timestamp: 300, type: 'event' },
      { id: 'early', timestamp: 100, type: 'event' },
    ]);

    expect(studio.listEvents().map((event) => event.id)).toEqual(['early', 'late']);
    expect(studio.getEventCount()).toBe(2);
  });

  it('starts at the first event', () => {
    const studio = new ReplayStudio(createEvents());
    expect(studio.getCurrentIndex()).toBe(0);
    expect(studio.getCurrentEvent()?.id).toBe('e1');
  });

  it('returns undefined when no current event exists', () => {
    const studio = new ReplayStudio([]);
    expect(studio.getCurrentEvent()).toBeUndefined();
  });

  it('steps through events', () => {
    const studio = new ReplayStudio(createEvents());

    expect(studio.step()?.id).toBe('e2');
    expect(studio.step()?.id).toBe('e3');
    expect(studio.step()).toBeUndefined();
  });

  it('plays through remaining events', () => {
    const studio = new ReplayStudio(createEvents());
    const last = studio.play();
    expect(last?.id).toBe('e3');
    expect(studio.getCurrentIndex()).toBe(2);
  });

  it('stops and resets to the first event', () => {
    const studio = new ReplayStudio(createEvents());
    studio.play();
    studio.stop();
    expect(studio.getCurrentIndex()).toBe(0);
  });

  it('jumps to a valid event index', () => {
    const studio = new ReplayStudio(createEvents());
    expect(studio.jumpTo(2).id).toBe('e3');
    expect(studio.getCurrentIndex()).toBe(2);
  });

  it('throws when jumping out of bounds', () => {
    const studio = new ReplayStudio(createEvents());
    expect(() => studio.jumpTo(99)).toThrow(/out of bounds/);
  });

  it('records a new event', () => {
    const studio = new ReplayStudio();
    const recorded = studio.record('login', { user: 'bob' }, 500);
    expect(recorded.id).toBe('event-1');
    expect(studio.getEventCount()).toBe(1);
  });

  it('adds, lists, removes, and navigates bookmarks', () => {
    const studio = new ReplayStudio(createEvents());
    studio.jumpTo(1);
    studio.addBookmark('after-login');

    expect(studio.listBookmarks()).toHaveLength(1);
    expect(studio.listBookmarks()[0].index).toBe(1);

    studio.jumpTo(0);
    expect(studio.gotoBookmark(studio.listBookmarks()[0].id).id).toBe('e2');

    studio.removeBookmark(studio.listBookmarks()[0].id);
    expect(studio.listBookmarks()).toHaveLength(0);
  });

  it('throws for missing bookmark navigation', () => {
    const studio = new ReplayStudio(createEvents());
    expect(() => studio.gotoBookmark('missing')).toThrow(/does not exist/);
  });

  it('throws for invalid bookmark label', () => {
    const studio = new ReplayStudio(createEvents());
    expect(() => studio.addBookmark('   ')).toThrow(/label is required/);
  });

  it('takes and compares snapshots', () => {
    const studio = new ReplayStudio(createEvents());
    studio.takeSnapshot();
    studio.jumpTo(2);

    const comparison = studio.compareToSnapshot();
    expect(comparison).not.toBeNull();
    expect(comparison?.fromIndex).toBe(0);
    expect(comparison?.toIndex).toBe(2);
    expect(comparison?.changed).toBe(true);
  });

  it('returns null comparison when no snapshot exists', () => {
    const studio = new ReplayStudio(createEvents());
    expect(studio.compareToSnapshot()).toBeNull();
  });

  it('returns event copies and event at index', () => {
    const studio = new ReplayStudio(createEvents());

    const events = studio.listEvents();
    events[0].data = { user: 'mutated' };
    expect(studio.getEventAtIndex(0).data).toEqual({ user: 'alice' });

    const current = studio.getCurrentEvent();
    current!.data = { user: 'mutated' };
    expect(studio.getCurrentEvent()?.data).toEqual({ user: 'alice' });
  });

  it('rejects invalid events on load', () => {
    expect(() => new ReplayStudio([{ id: '', timestamp: 100, type: 'event' }] as any)).toThrow(
      /id is required/,
    );
    expect(() =>
      new ReplayStudio([{ id: 'e1', timestamp: -1, type: 'event' }] as any),
    ).toThrow(/non-negative integer/);
  });
});
