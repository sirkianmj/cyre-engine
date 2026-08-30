/**
 * TelemetryExporter
 * ------------------
 * Exports telemetry data to JSON or CSV for research and analysis.
 */

import { TelemetryEvent } from './TelemetryEvent.js';

export class TelemetryExporter {
  /**
   * Export events to a JSON string.
   */
  static toJSON(events: TelemetryEvent[]): string {
    return JSON.stringify(events, null, 2);
  }

  /**
   * Export events to a CSV string.
   */
  static toCSV(events: TelemetryEvent[]): string {
    if (events.length === 0) {
      return '';
    }
    const headers = ['id', 'sessionId', 'timestamp', 'type', 'targetId', 'decision', 'evidenceViewed', 'evidenceIgnored', 'success', 'failure', 'responseTimeMs', 'finalOutcome'];
    const rows = events.map((event) =>
      headers
        .map((header) => {
          const value = (event as unknown as Record<string, unknown>)[header];
          if (value === undefined || value === null) return '';
          if (typeof value === 'string') return `"${value.replace(/"/g, '""')}"`;
          if (Array.isArray(value)) return `"${value.join(';')}"`;
          if (typeof value === 'object') return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
          return String(value);
        })
        .join(','),
    );
    return [headers.join(','), ...rows].join('\n');
  }
}
