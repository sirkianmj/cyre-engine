import { describe, expect, it } from 'vitest';
import { CyreError } from '../../core/index.js';
import { TelemetryRecorder } from '../TelemetryRecorder.js';
import {
  CRASH_REPORT_SEVERITIES,
  CrashReporter,
  isCrashReportSeverity,
} from '../CrashReporter.js';

function createNow() {
  let time = 1000;
  return () => time++;
}

describe('CrashReporter', () => {
  it('reports a plain Error and captures message and stack', () => {
    const reporter = new CrashReporter('session-1', { now: createNow() });
    const error = new Error('simulation failed');

    const report = reporter.report(error, { severity: 'error' });

    expect(report.id).toBe('session-1-crash-1');
    expect(report.sessionId).toBe('session-1');
    expect(report.severity).toBe('error');
    expect(report.message).toBe('simulation failed');
    expect(report.stack).toContain('simulation failed');
    expect(reporter.getReportCount()).toBe(1);
  });

  it('reports a CyreError with code and context', () => {
    const reporter = new CrashReporter('session-2', { now: createNow() });
    const error = new CyreError('permission denied', 'PERMISSION_DENIED', {
      accountId: 'acc-1',
    });

    const report = reporter.report(error);

    expect(report.code).toBe('PERMISSION_DENIED');
    expect(report.context).toEqual({ accountId: 'acc-1' });
  });

  it('reports a string message', () => {
    const reporter = new CrashReporter('session-3', { now: createNow() });

    const report = reporter.report('engine crashed', {
      severity: 'fatal',
      code: 'FATAL_CRASH',
    });

    expect(report.message).toBe('engine crashed');
    expect(report.code).toBe('FATAL_CRASH');
    expect(report.severity).toBe('fatal');
  });

  it('validates report inputs', () => {
    const reporter = new CrashReporter('session-4');

    expect(() => reporter.report('')).toThrow(/non-empty string/);
    expect(() => reporter.report('   ')).toThrow(/non-empty string/);
    expect(() => reporter.report(null)).toThrow(/must not be null/);
    expect(() => reporter.report(undefined)).toThrow(/must not be null/);
    expect(() =>
      reporter.report('bad severity', { severity: 'invalid' as any }),
    ).toThrow(/Invalid crash report severity/);
    expect(() =>
      reporter.report('bad timestamp', { timestamp: -1 }),
    ).toThrow(/timestamp/);
  });

  it('limits stored reports when maxReports is set', () => {
    const reporter = new CrashReporter('session-5', {
      maxReports: 2,
      now: createNow(),
    });

    reporter.report('one');
    reporter.report('two');
    reporter.report('three');

    expect(reporter.getReportCount()).toBe(2);
    expect(reporter.getLatestReport()?.message).toBe('three');
  });

  it('clears reports and resets id counter', () => {
    const reporter = new CrashReporter('session-6', { now: createNow() });

    reporter.report('first');
    reporter.clear();

    expect(reporter.getReportCount()).toBe(0);

    const report = reporter.report('second');
    expect(report.id).toBe('session-6-crash-1');
  });

  it('optionally records crash reports into telemetry', () => {
    const telemetry = new TelemetryRecorder('research-session');
    const reporter = new CrashReporter('session-7', {
      telemetryRecorder: telemetry,
      now: createNow(),
    });

    reporter.report('telemetry crash', { severity: 'warning' });

    expect(telemetry.getEventCount()).toBe(1);
    expect(telemetry.getEvents()[0].type).toBe('crash_reported');
  });

  it('validates constructor options', () => {
    expect(() => new CrashReporter('')).toThrow(/session id/);
    expect(() => new CrashReporter('session', { maxReports: -1 })).toThrow(
      /maxReports/,
    );
    expect(() => new CrashReporter('session', { now: 123 as any })).toThrow(
      /now must be a function/,
    );
  });

  it('exposes severity constants', () => {
    expect(CRASH_REPORT_SEVERITIES).toEqual(['fatal', 'error', 'warning']);
    expect(isCrashReportSeverity('fatal')).toBe(true);
    expect(isCrashReportSeverity('critical')).toBe(false);
  });
});
