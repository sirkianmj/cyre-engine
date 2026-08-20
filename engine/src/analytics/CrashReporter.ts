import { CyreError } from '../core/index.js';
import { TelemetryRecorder } from './TelemetryRecorder.js';

export const CRASH_REPORT_SEVERITIES = [
  'fatal',
  'error',
  'warning',
] as const;

export type CrashReportSeverity = (typeof CRASH_REPORT_SEVERITIES)[number];

export function isCrashReportSeverity(value: string): value is CrashReportSeverity {
  return (CRASH_REPORT_SEVERITIES as readonly string[]).includes(value);
}

export interface CrashReport {
  id: string;
  sessionId: string;
  timestamp: number;
  severity: CrashReportSeverity;
  message: string;
  code?: string;
  context?: Record<string, unknown>;
  stack?: string;
  metadata?: Record<string, unknown>;
}

export interface CrashReportInputOptions {
  severity?: CrashReportSeverity;
  code?: string;
  context?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  timestamp?: number;
}

export interface CrashReporterOptions {
  now?: () => number;
  maxReports?: number;
  telemetryRecorder?: TelemetryRecorder;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cloneRecord(value?: Record<string, unknown>): Record<string, unknown> | undefined {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

export class CrashReporter {
  private readonly sessionId: string;
  private readonly nowFn: () => number;
  private readonly maxReports: number;
  private readonly telemetryRecorder?: TelemetryRecorder;
  private readonly reports: CrashReport[] = [];
  private counter = 0;

  constructor(sessionId: string, options: CrashReporterOptions = {}) {
    if (!sessionId || sessionId.trim() === '') {
      throw new Error('CrashReporter session id must be a non-empty string.');
    }

    if (options.now !== undefined && typeof options.now !== 'function') {
      throw new Error('CrashReporter now must be a function if provided.');
    }

    if (
      options.maxReports !== undefined &&
      (!Number.isInteger(options.maxReports) || options.maxReports < 0)
    ) {
      throw new Error('CrashReporter maxReports must be a non-negative integer if provided.');
    }

    if (
      options.telemetryRecorder !== undefined &&
      !(options.telemetryRecorder instanceof TelemetryRecorder)
    ) {
      throw new Error('CrashReporter telemetryRecorder must be a TelemetryRecorder instance if provided.');
    }

    this.sessionId = sessionId.trim();
    this.nowFn = options.now ?? (() => Date.now());
    this.maxReports = options.maxReports ?? 0;
    this.telemetryRecorder = options.telemetryRecorder;
  }

  getSessionId(): string {
    return this.sessionId;
  }

  report(
    errorOrMessage: unknown,
    options: CrashReportInputOptions = {},
  ): CrashReport {
    const extracted = this.extractError(errorOrMessage);

    const severity = options.severity ?? 'error';
    if (!isCrashReportSeverity(severity)) {
      throw new Error(`Invalid crash report severity "${severity}".`);
    }

    const timestamp = options.timestamp ?? this.nowFn();
    if (!Number.isInteger(timestamp) || timestamp < 0) {
      throw new Error('Crash report timestamp must be a non-negative integer.');
    }

    const context = { ...(extracted.context ?? {}), ...(options.context ?? {}) };
    const metadata = cloneRecord(options.metadata);

    const report: CrashReport = {
      id: `${this.sessionId}-crash-${++this.counter}`,
      sessionId: this.sessionId,
      timestamp,
      severity,
      message: extracted.message,
      code: options.code ?? extracted.code,
      context: Object.keys(context).length > 0 ? context : undefined,
      stack: extracted.stack,
      metadata,
    };

    this.reports.push(report);

    if (this.maxReports > 0 && this.reports.length > this.maxReports) {
      this.reports.shift();
    }

    this.telemetryRecorder?.record('crash_reported', {
      data: { report: this.cloneReport(report) },
    });

    return this.cloneReport(report);
  }

  getReports(): CrashReport[] {
    return this.reports.map((report) => this.cloneReport(report));
  }

  getReportCount(): number {
    return this.reports.length;
  }

  getLatestReport(): CrashReport | undefined {
    const latest = this.reports[this.reports.length - 1];
    return latest === undefined ? undefined : this.cloneReport(latest);
  }

  clear(): void {
    this.reports.length = 0;
    this.counter = 0;
  }

  validate(): void {
    if (!this.sessionId || this.sessionId.trim() === '') {
      throw new Error('CrashReporter session id is required.');
    }

    if (this.maxReports < 0 || !Number.isInteger(this.maxReports)) {
      throw new Error('CrashReporter maxReports must be a non-negative integer.');
    }
  }

  toJSON(): CrashReport[] {
    return this.getReports();
  }

  private extractError(errorOrMessage: unknown): {
    message: string;
    code?: string;
    context?: Record<string, unknown>;
    stack?: string;
  } {
    if (typeof errorOrMessage === 'string') {
      const trimmed = errorOrMessage.trim();
      if (trimmed.length === 0) {
        throw new Error('Crash report message must be a non-empty string.');
      }

      return { message: trimmed };
    }

    if (errorOrMessage instanceof CyreError) {
      return {
        message: errorOrMessage.message.trim() || 'Unknown CYRE error',
        code: errorOrMessage.code,
        context: errorOrMessage.context,
        stack: errorOrMessage.stack,
      };
    }

    if (errorOrMessage instanceof Error) {
      const message = errorOrMessage.message.trim();
      if (message.length === 0) {
        throw new Error('Crash report message must be a non-empty string.');
      }

      return {
        message,
        stack: errorOrMessage.stack,
      };
    }

    if (errorOrMessage === undefined || errorOrMessage === null) {
      throw new Error('Crash report error must not be null or undefined.');
    }

    const fallback = String(errorOrMessage);
    if (fallback.length === 0) {
      throw new Error('Crash report message must be a non-empty string.');
    }

    return { message: fallback };
  }

  private cloneReport(report: CrashReport): CrashReport {
    return {
      ...report,
      context: cloneRecord(report.context),
      metadata: cloneRecord(report.metadata),
    };
  }
}
