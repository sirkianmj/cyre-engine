import { describe, it, expect } from 'vitest';
import { TimelineEditor } from '../TimelineEditor.js';

function createEditor(): TimelineEditor {
  const editor = new TimelineEditor();
  editor.addEntry({ id: 't1', timestamp: 100, label: 'Login event', type: 'event', sourceId: 'vpn', targetId: 'host' });
  editor.addEntry({ id: 't2', timestamp: 200, label: 'Alert generated', type: 'alert', sourceId: 'siem' });
  editor.addEntry({ id: 't3', timestamp: 150, label: 'Evidence collected', type: 'evidence', sourceId: 'host' });
  editor.addEntry({ id: 't4', timestamp: 300, label: 'Defensive action', type: 'action', sourceId: 'analyst' });
  editor.addEntry({ id: 't5', timestamp: 50, label: 'Investigation phase', type: 'phase' });
  return editor;
}

describe('TimelineEditor', () => {
  it('adds and lists timeline entries sorted by timestamp', () => {
    const editor = createEditor();
    expect(editor.listEntries().map((entry) => entry.id)).toEqual([
      't5',
      't1',
      't3',
      't2',
      't4',
    ]);
  });

  it('rejects duplicate timeline entries', () => {
    const editor = createEditor();
    expect(() =>
      editor.addEntry({ id: 't1', timestamp: 999, label: 'Duplicate', type: 'event' }),
    ).toThrow(/already exists/);
  });

  it('rejects invalid entry id and label', () => {
    const editor = new TimelineEditor();
    expect(() => editor.addEntry({ id: '', timestamp: 0, label: 'Bad', type: 'event' })).toThrow(/id is required/);
    expect(() => editor.addEntry({ id: 'bad', timestamp: 0, label: '   ', type: 'event' })).toThrow(/label is required/);
  });

  it('rejects invalid entry type', () => {
    const editor = new TimelineEditor();
    expect(() =>
      editor.addEntry({ id: 'bad', timestamp: 0, label: 'Bad', type: 'invalid' as any }),
    ).toThrow(/Invalid timeline entry type/);
  });

  it('rejects invalid timestamp', () => {
    const editor = new TimelineEditor();
    expect(() =>
      editor.addEntry({ id: 'bad', timestamp: -1, label: 'Bad', type: 'event' }),
    ).toThrow(/non-negative finite number/);
  });

  it('removes a timeline entry', () => {
    const editor = createEditor();
    editor.removeEntry('t3');
    expect(() => editor.getEntry('t3')).toThrow(/does not exist/);
    expect(editor.listEntries()).toHaveLength(4);
  });

  it('updates an entry timestamp and label', () => {
    const editor = createEditor();
    editor.updateTimestamp('t1', 500);
    editor.updateLabel('t1', 'Updated login event');
    expect(editor.getEntry('t1').timestamp).toBe(500);
    expect(editor.getEntry('t1').label).toBe('Updated login event');
  });

  it('filters entries by type', () => {
    const editor = createEditor();
    expect(editor.findEntriesByType('alert').map((entry) => entry.id)).toEqual(['t2']);
    expect(editor.findEntriesByType('action').map((entry) => entry.id)).toEqual(['t4']);
  });

  it('finds entries within a timestamp range', () => {
    const editor = createEditor();
    expect(editor.findEntriesBetween(100, 200).map((entry) => entry.id)).toEqual([
      't1',
      't3',
      't2',
    ]);
  });

  it('rejects invalid range start and end', () => {
    const editor = createEditor();
    expect(() => editor.findEntriesBetween(200, 100)).toThrow(/start must not be greater than end/);
  });

  it('searches entries by id, label, type, source, and target', () => {
    const editor = createEditor();
    expect(editor.search('login').map((entry) => entry.id)).toEqual(['t1']);
    expect(editor.search('alert').map((entry) => entry.id)).toEqual(['t2']);
    expect(editor.search('vpn').map((entry) => entry.id)).toEqual(['t1']);
  });

  it('returns earliest and latest timestamps', () => {
    const editor = createEditor();
    expect(editor.getEarliestTimestamp()).toBe(50);
    expect(editor.getLatestTimestamp()).toBe(300);
  });

  it('returns entries as deep copies', () => {
    const editor = createEditor();
    const entries = editor.listEntries();
    entries[0].label = 'Mutated';
    expect(editor.getEntry('t5').label).toBe('Investigation phase');

    const entry = editor.getEntry('t1');
    entry.data = { changed: true };
    expect(editor.getEntry('t1').data).toBeUndefined();
  });
});
