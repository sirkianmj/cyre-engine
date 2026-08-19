import { describe, it, expect } from 'vitest';
import {
  ResearchDataset,
  ResearchDatasetExporter,
  RESEARCH_EXPORT_FORMATS,
  isResearchExportFormat,
} from '../index.js';
import type { TelemetryEvent } from '../../analytics/index.js';

function createDataset(): ResearchDataset {
  const dataset = new ResearchDataset();
  dataset.createExperiment('exp-1', 'Experiment One', { createdAt: 1000 });
  dataset.createExperiment('exp-2', 'Experiment Two', { createdAt: 2000 });

  dataset.registerSession('session-1', 'scenario-a', 42, {
    participantId: 'p1',
    experimentId: 'exp-1',
    startTime: 1000,
  });
  dataset.registerSession('session-2', 'scenario-b', 43, {
    participantId: 'p2',
    experimentId: 'exp-2',
    startTime: 2000,
  });

  dataset.addEvent('session-1', {
    id: 'event-1',
    sessionId: 'session-1',
    timestamp: 1100,
    type: 'evidence:view',
    evidenceViewed: true,
    data: { severity: 'high' },
  });
  dataset.addEvent('session-1', {
    id: 'event-2',
    sessionId: 'session-1',
    timestamp: 1200,
    type: 'decision:contain',
    decision: 'isolate',
    responseTimeMs: 5000,
  });
  dataset.addEvent('session-2', {
    id: 'event-3',
    sessionId: 'session-2',
    timestamp: 2200,
    type: 'mission:start',
    investigationPath: ['a', 'b'],
  });

  dataset.completeSession('session-1', 1500);
  dataset.completeSession('session-2', 2500);
  return dataset;
}

describe('ResearchExportTypes', () => {
  it('exposes export formats', () => {
    expect(RESEARCH_EXPORT_FORMATS).toEqual(['json', 'csv', 'ndjson', 'summary']);
    expect(isResearchExportFormat('json')).toBe(true);
    expect(isResearchExportFormat('invalid')).toBe(false);
  });
});

describe('ResearchDatasetExporter', () => {
  it('exports JSON', () => {
    const exporter = new ResearchDatasetExporter(createDataset());
    const result = exporter.export('json');
    expect(result.format).toBe('json');
    expect(result.recordCount).toBe(3);
    const parsed = JSON.parse(result.content);
    expect(parsed.experiments).toHaveLength(2);
    expect(parsed.sessions).toHaveLength(2);
  });

  it('exports CSV', () => {
    const exporter = new ResearchDatasetExporter(createDataset());
    const result = exporter.export('csv');
    expect(result.format).toBe('csv');
    expect(result.content.split('\n')).toHaveLength(4); // header + 3 events
    expect(result.content).toContain('event-1');
    expect(result.content).toContain('event-3');
  });

  it('exports NDJSON', () => {
    const exporter = new ResearchDatasetExporter(createDataset());
    const result = exporter.export('ndjson');
    expect(result.format).toBe('ndjson');
    const lines = result.content.trim().split('\n');
    expect(lines).toHaveLength(3);
    const first = JSON.parse(lines[0]);
    expect(first).toMatchObject({
      eventId: 'event-1',
      sessionId: 'session-1',
      scenarioId: 'scenario-a',
      seed: 42,
      type: 'evidence:view',
      evidenceViewed: true,
    });
  });

  it('exports sessions CSV', () => {
    const exporter = new ResearchDatasetExporter(createDataset());
    const content = exporter.exportSessionsCSV();
    const lines = content.trim().split('\n');
    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain('sessionId');
    expect(lines[1]).toContain('session-1');
    expect(lines[2]).toContain('session-2');
  });

  it('exports summary JSON', () => {
    const exporter = new ResearchDatasetExporter(createDataset());
    const result = exporter.export('summary');
    expect(result.format).toBe('summary');
    expect(result.recordCount).toBe(2);
    const summary = JSON.parse(result.content);
    expect(summary.experimentCount).toBe(2);
    expect(summary.sessionCount).toBe(2);
    expect(summary.eventCount).toBe(3);
    expect(summary.completedSessionCount).toBe(2);
    expect(summary.experimentCounts).toEqual({ 'exp-1': 1, 'exp-2': 1 });
    expect(summary.scenarioCounts).toEqual({ 'scenario-a': 1, 'scenario-b': 1 });
  });

  it('rejects invalid export format', () => {
    const exporter = new ResearchDatasetExporter(createDataset());
    expect(() => exporter.export('invalid' as any)).toThrow(/format/);
  });

  it('rejects invalid dataset instance', () => {
    expect(() => new ResearchDatasetExporter({} as any)).toThrow(/ResearchDataset/);
  });
});
