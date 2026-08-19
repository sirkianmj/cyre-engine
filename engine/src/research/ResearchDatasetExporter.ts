import type { TelemetryEvent } from '../analytics/index.js';
import { TelemetryExporter } from '../analytics/index.js';
import type { ResearchDataset } from './ResearchDataset.js';
import type {
  ExperimentMetadata,
  ResearchSession,
} from './ResearchTypes.js';
import {
  isResearchExportFormat,
  type ResearchExportFormat,
  type ResearchExportResult,
} from './ResearchExportTypes.js';

function isResearchDataset(value: unknown): value is ResearchDataset {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as ResearchDataset).listExperiments === 'function' &&
    typeof (value as ResearchDataset).getSessions === 'function'
  );
}

function assertDataset(dataset: ResearchDataset): void {
  if (!isResearchDataset(dataset)) {
    throw new Error('ResearchDatasetExporter requires a valid ResearchDataset instance.');
  }
}

function escapeCsvCell(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') {
    return `"${value.replace(/"/g, '""')}"`;
  }
  if (Array.isArray(value)) {
    return `"${value.join(';').replace(/"/g, '""')}"`;
  }
  if (typeof value === 'object') {
    return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
  }
  return String(value);
}

function flattenEvent(
  event: TelemetryEvent,
  session: ResearchSession,
): Record<string, unknown> {
  const data = event.data !== undefined ? event.data : {};
  return {
    eventId: event.id,
    sessionId: session.sessionId,
    experimentId: session.experimentId ?? '',
    participantId: session.participantId ?? '',
    scenarioId: session.scenarioId,
    seed: session.seed,
    timestamp: event.timestamp,
    type: event.type,
    targetId: event.targetId ?? '',
    decision: event.decision ?? '',
    evidenceViewed: event.evidenceViewed ?? '',
    evidenceIgnored: event.evidenceIgnored ?? '',
    success: event.success ?? '',
    failure: event.failure ?? '',
    responseTimeMs: event.responseTimeMs ?? '',
    investigationPath: event.investigationPath ?? [],
    finalOutcome: event.finalOutcome ?? '',
    ...data,
  };
}

export class ResearchDatasetExporter {
  private readonly dataset: ResearchDataset;

  constructor(dataset: ResearchDataset) {
    assertDataset(dataset);
    this.dataset = dataset;
  }

  export(format: ResearchExportFormat): ResearchExportResult {
    if (!isResearchExportFormat(format)) {
      throw new Error(`Invalid research export format "${format}".`);
    }

    const generatedAt = Date.now();
    switch (format) {
      case 'json':
        return {
          format,
          content: this.exportJSON(),
          recordCount: this.getEventCount(),
          generatedAt,
        };
      case 'csv':
        return {
          format,
          content: this.exportCSV(),
          recordCount: this.getEventCount(),
          generatedAt,
        };
      case 'ndjson':
        return {
          format,
          content: this.exportNDJSON(),
          recordCount: this.getEventCount(),
          generatedAt,
        };
      case 'summary':
        return {
          format,
          content: this.exportSummaryJSON(),
          recordCount: this.getSessionCount(),
          generatedAt,
        };
    }
  }

  exportJSON(): string {
    return JSON.stringify(
      {
        experiments: this.dataset.listExperiments(),
        sessions: this.dataset.getSessions(),
      },
      null,
      2,
    );
  }

  exportCSV(): string {
    const events = this.collectEvents();
    return TelemetryExporter.toCSV(events);
  }

  exportSessionsCSV(): string {
    const sessions = this.dataset.getSessions();
    const headers = [
      'sessionId',
      'experimentId',
      'participantId',
      'scenarioId',
      'seed',
      'startTime',
      'endTime',
      'eventCount',
    ];
    const rows = sessions.map((session) => {
      const record: Record<string, unknown> = {
        sessionId: session.sessionId,
        experimentId: session.experimentId ?? '',
        participantId: session.participantId ?? '',
        scenarioId: session.scenarioId,
        seed: session.seed,
        startTime: session.startTime,
        endTime: session.endTime ?? '',
        eventCount: session.events.length,
      };
      return headers.map((header) => escapeCsvCell(record[header])).join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  exportNDJSON(): string {
    const sessions = this.dataset.getSessions();
    const lines: string[] = [];

    for (const session of sessions) {
      for (const event of session.events) {
        lines.push(JSON.stringify(flattenEvent(event, session)));
      }
    }

    return lines.join('\n');
  }

  exportSummaryJSON(): string {
    const experiments = this.dataset.listExperiments();
    const sessions = this.dataset.getSessions();
    const experimentCounts: Record<string, number> = {};
    const scenarioCounts: Record<string, number> = {};

    for (const session of sessions) {
      if (session.experimentId !== undefined) {
        experimentCounts[session.experimentId] =
          (experimentCounts[session.experimentId] ?? 0) + 1;
      }
      scenarioCounts[session.scenarioId] =
        (scenarioCounts[session.scenarioId] ?? 0) + 1;
    }

    return JSON.stringify(
      {
        generatedAt: Date.now(),
        experimentCount: experiments.length,
        sessionCount: sessions.length,
        eventCount: this.getEventCount(),
        completedSessionCount: sessions.filter(
          (session) => session.endTime !== undefined,
        ).length,
        experimentCounts,
        scenarioCounts,
        experiments: experiments.map((experiment) => experiment.id),
      },
      null,
      2,
    );
  }

  private collectEvents(): TelemetryEvent[] {
    const events: TelemetryEvent[] = [];
    for (const session of this.dataset.getSessions()) {
      events.push(...session.events);
    }
    return events;
  }

  private getEventCount(): number {
    return this.collectEvents().length;
  }

  private getSessionCount(): number {
    return this.dataset.getSessions().length;
  }
}
