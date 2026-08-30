/**
 * CYRE Analytics Module Exports
 * ------------------------------
 * Public API for telemetry recording, export, and crash reporting.
 */

export type { TelemetryEvent } from './TelemetryEvent.js';
export { TelemetryRecorder } from './TelemetryRecorder.js';
export { TelemetryExporter } from './TelemetryExporter.js';

export {
  CRASH_REPORT_SEVERITIES,
  isCrashReportSeverity,
} from './CrashReporter.js';
export { CrashReporter } from './CrashReporter.js';
export type {
  CrashReport,
  CrashReportSeverity,
  CrashReportInputOptions,
  CrashReporterOptions,
} from './CrashReporter.js';
