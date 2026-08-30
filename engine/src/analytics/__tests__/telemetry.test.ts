import { describe, it, expect } from 'vitest';
import { TelemetryRecorder } from '../TelemetryRecorder.js';
import { TelemetryExporter } from '../TelemetryExporter.js';
import type { TelemetryEvent } from '../TelemetryEvent.js';

describe('TelemetryRecorder', () => {
  it('records events with session ID and sequential IDs', () => {
    const recorder = new TelemetryRecorder('session-1');
    const event1 = recorder.record('action', { decision: 'investigate-host' });
    const event2 = recorder.record('evidence_view', { targetId: 'e1', evidenceViewed: true });
    expect(event1.id).toBe('session-1-event-1');
    expect(event2.id).toBe('session-1-event-2');
    expect(recorder.getEventCount()).toBe(2);
    expect(recorder.getSessionId()).toBe('session-1');
  });

  it('throws on empty session ID', () => {
    expect(() => new TelemetryRecorder('')).toThrow(/non-empty/);
  });

  it('throws on empty event type', () => {
    const recorder = new TelemetryRecorder('s1');
    expect(() => recorder.record('')).toThrow(/non-empty/);
  });

  it('throws on invalid timestamp', () => {
    const recorder = new TelemetryRecorder('s1');
    expect(() => recorder.record('action', { timestamp: -5 })).toThrow(/non-negative/);
  });

  it('clears events', () => {
    const recorder = new TelemetryRecorder('s1');
    recorder.record('action');
    recorder.clear();
    expect(recorder.getEventCount()).toBe(0);
  });

  it('serialises to JSON', () => {
    const recorder = new TelemetryRecorder('s1');
    recorder.record('action');
    expect(recorder.toJSON()).toHaveLength(1);
  });
});

describe('TelemetryExporter', () => {
  const events: TelemetryEvent[] = [
    { id: '1', sessionId: 's1', timestamp: 100, type: 'action', decision: 'd1' },
    { id: '2', sessionId: 's1', timestamp: 200, type: 'evidence_view', targetId: 'e1' },
  ];

  it('exports to JSON', () => {
    const json = TelemetryExporter.toJSON(events);
    expect(JSON.parse(json)).toHaveLength(2);
  });

  it('exports to CSV', () => {
    const csv = TelemetryExporter.toCSV(events);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(3); // header + 2 rows
    expect(lines[0]).toContain('sessionId');
    expect(lines[1]).toContain('d1');
    expect(lines[2]).toContain('e1');
  });

  it('returns empty CSV for empty events', () => {
    expect(TelemetryExporter.toCSV([])).toBe('');
  });
});
