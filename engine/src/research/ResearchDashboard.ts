import type { TelemetryEvent } from '../analytics/index.js';
import type { ResearchDataset } from './ResearchDataset.js';
import type { ResearchSession } from './ResearchTypes.js';

export interface ResponseTimeStats {
  count: number;
  minMs: number;
  maxMs: number;
  averageMs: number;
  totalMs: number;
}

export interface ErrorSummary {
  totalErrors: number;
  errorEventCounts: Record<string, number>;
  errorEventTypes: string[];
}

export interface ScenarioPerformance {
  scenarioId: string;
  sessionCount: number;
  completedSessions: number;
  completionRate: number;
  eventCount: number;
  averageEventsPerSession: number;
  totalResponseTimeMs: number;
  averageResponseTimeMs: number;
}

export interface InvestigationPathSummary {
  sessionsWithPaths: number;
  totalPaths: number;
  uniquePaths: number;
  longestPathLength: number;
  averagePathLength: number;
  pathCounts: Record<string, number>;
  commonPaths: string[];
}

export interface ResearchDashboardSnapshot {
  generatedAt: number;
  experimentCount: number;
  sessionCount: number;
  participantCount: number;
  completedSessionCount: number;
  completionRate: number;
  eventCount: number;
  responseTimeStats: ResponseTimeStats;
  decisionCounts: Record<string, number>;
  eventTypeCounts: Record<string, number>;
  evidenceViewedCount: number;
  evidenceIgnoredCount: number;
  successCount: number;
  failureCount: number;
  errorSummary: ErrorSummary;
  investigationPathSummary: InvestigationPathSummary;
  scenarioPerformance: ScenarioPerformance[];
  summary: string;
}

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
    throw new Error('ResearchDashboard requires a valid ResearchDataset instance.');
  }
}

function countMap(values: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const value of values) {
    counts[value] = (counts[value] ?? 0) + 1;
  }
  return counts;
}

function toNumberArray(
  events: TelemetryEvent[],
  accessor: (event: TelemetryEvent) => number | undefined,
): number[] {
  const result: number[] = [];
  for (const event of events) {
    const value = accessor(event);
    if (value !== undefined && Number.isFinite(value) && value >= 0) {
      result.push(value);
    }
  }
  return result;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function isCompletedSession(session: ResearchSession): boolean {
  return session.endTime !== undefined;
}

export class ResearchDashboard {
  readonly name: string;
  private readonly dataset: ResearchDataset;

  constructor(dataset: ResearchDataset, name = 'CYRE Research Dashboard') {
    assertDataset(dataset);
    if (!name || name.trim() === '') {
      throw new Error('ResearchDashboard name is required.');
    }
    this.dataset = dataset;
    this.name = name;
  }

  getDataset(): ResearchDataset {
    return this.dataset;
  }

  getSessions(): ResearchSession[] {
    return this.dataset.getSessions();
  }

  getExperiments() {
    return this.dataset.listExperiments();
  }

  calculateResponseTimeStats(events: TelemetryEvent[] = this.collectEvents()): ResponseTimeStats {
    const responseTimes = toNumberArray(events, (event) => event.responseTimeMs);
    if (responseTimes.length === 0) {
      return {
        count: 0,
        minMs: 0,
        maxMs: 0,
        averageMs: 0,
        totalMs: 0,
      };
    }

    let minMs = responseTimes[0];
    let maxMs = responseTimes[0];
    let totalMs = 0;
    for (const value of responseTimes) {
      minMs = Math.min(minMs, value);
      maxMs = Math.max(maxMs, value);
      totalMs += value;
    }

    return {
      count: responseTimes.length,
      minMs,
      maxMs,
      averageMs: round(totalMs / responseTimes.length),
      totalMs,
    };
  }

  getDecisionCounts(events: TelemetryEvent[] = this.collectEvents()): Record<string, number> {
    const decisions = events
      .map((event) => event.decision)
      .filter((decision): decision is string => {
        return typeof decision === 'string' && decision.trim() !== '';
      })
      .map((decision) => decision.trim());

    return countMap(decisions);
  }

  getEventTypeCounts(events: TelemetryEvent[] = this.collectEvents()): Record<string, number> {
    return countMap(events.map((event) => event.type));
  }

  getErrorSummary(events: TelemetryEvent[] = this.collectEvents()): ErrorSummary {
    const errorEvents = events.filter((event) => {
      const type = event.type.toLowerCase();
      return (
        event.failure === true ||
        type.includes('error') ||
        type.includes('fail')
      );
    });

    const errorEventCounts = countMap(errorEvents.map((event) => event.type));
    const errorEventTypes = Object.keys(errorEventCounts).sort();

    return {
      totalErrors: errorEvents.length,
      errorEventCounts,
      errorEventTypes,
    };
  }

  getScenarioPerformance(
    sessions: ResearchSession[] = this.getSessions(),
  ): ScenarioPerformance[] {
    const byScenario = new Map<string, ResearchSession[]>();

    for (const session of sessions) {
      const existing = byScenario.get(session.scenarioId) ?? [];
      existing.push(session);
      byScenario.set(session.scenarioId, existing);
    }

    const performance: ScenarioPerformance[] = [];

    for (const [scenarioId, scenarioSessions] of byScenario.entries()) {
      const events = scenarioSessions.flatMap((session) => session.events);
      const responseTimeStats = this.calculateResponseTimeStats(events);
      const completed = scenarioSessions.filter(isCompletedSession).length;
      const totalResponseTimeMs = toNumberArray(
        events,
        (event) => event.responseTimeMs,
      ).reduce((sum, value) => sum + value, 0);

      performance.push({
        scenarioId,
        sessionCount: scenarioSessions.length,
        completedSessions: completed,
        completionRate: round(completed / scenarioSessions.length),
        eventCount: events.length,
        averageEventsPerSession: round(events.length / scenarioSessions.length),
        totalResponseTimeMs,
        averageResponseTimeMs: responseTimeStats.averageMs,
      });
    }

    return performance.sort((a, b) => a.scenarioId.localeCompare(b.scenarioId));
  }

  getInvestigationPathSummary(
    events: TelemetryEvent[] = this.collectEvents(),
  ): InvestigationPathSummary {
    const pathEvents = events.filter(
      (event) =>
        Array.isArray(event.investigationPath) &&
        event.investigationPath.length > 0,
    );

    if (pathEvents.length === 0) {
      return {
        sessionsWithPaths: 0,
        totalPaths: 0,
        uniquePaths: 0,
        longestPathLength: 0,
        averagePathLength: 0,
        pathCounts: {},
        commonPaths: [],
      };
    }

    const pathCounts: Record<string, number> = {};
    let longestPathLength = 0;
    let totalPathLength = 0;

    for (const event of pathEvents) {
      const path = event.investigationPath as string[];
      const key = path.join('|');
      pathCounts[key] = (pathCounts[key] ?? 0) + 1;
      longestPathLength = Math.max(longestPathLength, path.length);
      totalPathLength += path.length;
    }

    const commonPaths = Object.entries(pathCounts)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 10)
      .map(([path]) => path);

    const sessionIds = new Set(pathEvents.map((event) => event.sessionId));

    return {
      sessionsWithPaths: sessionIds.size,
      totalPaths: pathEvents.length,
      uniquePaths: Object.keys(pathCounts).length,
      longestPathLength,
      averagePathLength: round(totalPathLength / pathEvents.length),
      pathCounts,
      commonPaths,
    };
  }

  createSnapshot(): ResearchDashboardSnapshot {
    const sessions = this.getSessions();
    const experiments = this.getExperiments();
    const events = this.collectEvents();

    const participantIds = new Set(
      sessions
        .map((session) => session.participantId)
        .filter((participantId): participantId is string =>
          participantId !== undefined,
        ),
    );

    const completedSessionCount = sessions.filter(isCompletedSession).length;
    const responseTimeStats = this.calculateResponseTimeStats(events);
    const decisionCounts = this.getDecisionCounts(events);
    const eventTypeCounts = this.getEventTypeCounts(events);
    const evidenceViewedCount = events.filter((event) => event.evidenceViewed === true).length;
    const evidenceIgnoredCount = events.filter((event) => event.evidenceIgnored === true).length;
    const successCount = events.filter((event) => event.success === true).length;
    const failureCount = events.filter((event) => event.failure === true).length;
    const errorSummary = this.getErrorSummary(events);
    const investigationPathSummary = this.getInvestigationPathSummary(events);
    const scenarioPerformance = this.getScenarioPerformance(sessions);

    return {
      generatedAt: Date.now(),
      experimentCount: experiments.length,
      sessionCount: sessions.length,
      participantCount: participantIds.size,
      completedSessionCount,
      completionRate: sessions.length > 0
        ? round(completedSessionCount / sessions.length)
        : 0,
      eventCount: events.length,
      responseTimeStats,
      decisionCounts,
      eventTypeCounts,
      evidenceViewedCount,
      evidenceIgnoredCount,
      successCount,
      failureCount,
      errorSummary,
      investigationPathSummary,
      scenarioPerformance,
      summary: [
        this.name,
        `${experiments.length} experiments`,
        `${sessions.length} sessions`,
        `${participantIds.size} participants`,
        `${events.length} events`,
        `completion=${sessions.length > 0 ? round(completedSessionCount / sessions.length) : 0}`,
        `errors=${errorSummary.totalErrors}`,
      ].join(' | '),
    };
  }

  toJSON(): ResearchDashboardSnapshot {
    return this.createSnapshot();
  }

  validate(): void {
    assertDataset(this.dataset);
    if (!this.name || this.name.trim() === '') {
      throw new Error('ResearchDashboard name is required.');
    }

    for (const session of this.getSessions()) {
      if (!session.sessionId || session.sessionId.trim() === '') {
        throw new Error('ResearchDashboard session id is required.');
      }
      if (!session.scenarioId || session.scenarioId.trim() === '') {
        throw new Error('ResearchDashboard scenario id is required.');
      }
      if (!Number.isInteger(session.seed) || session.seed < 0) {
        throw new Error('ResearchDashboard session seed must be a non-negative integer.');
      }
      if (!Array.isArray(session.events)) {
        throw new Error('ResearchDashboard session events must be an array.');
      }
    }
  }

  private collectEvents(): TelemetryEvent[] {
    const events: TelemetryEvent[] = [];
    for (const session of this.getSessions()) {
      events.push(...session.events);
    }
    return events;
  }
}
