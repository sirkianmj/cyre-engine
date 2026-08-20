import type { PlatformAdapter } from './PlatformAdapter.js';
import type { InputAdapter } from './InputDevice.js';
import type { PerformanceProfile } from './PerformanceProfile.js';
import type { ResolutionSettings } from './ResolutionSettings.js';

export const COMPATIBILITY_AUDIT_SEVERITIES = [
  'critical',
  'warning',
  'info',
] as const;

export type CompatibilityAuditSeverity =
  (typeof COMPATIBILITY_AUDIT_SEVERITIES)[number];

export function isCompatibilityAuditSeverity(
  value: string,
): value is CompatibilityAuditSeverity {
  return (COMPATIBILITY_AUDIT_SEVERITIES as readonly string[]).includes(value);
}

export const COMPATIBILITY_AUDIT_CATEGORIES = [
  'adapter',
  'input',
  'performance',
  'resolution',
  'storage',
  'lifecycle',
  'platform-target',
] as const;

export type CompatibilityAuditCategory =
  (typeof COMPATIBILITY_AUDIT_CATEGORIES)[number];

export function isCompatibilityAuditCategory(
  value: string,
): value is CompatibilityAuditCategory {
  return (COMPATIBILITY_AUDIT_CATEGORIES as readonly string[]).includes(value);
}

export interface CompatibilityAuditIssue {
  id: string;
  category: CompatibilityAuditCategory;
  severity: CompatibilityAuditSeverity;
  message: string;
  source?: string;
}

export interface CompatibilityAuditReport {
  name: string;
  timestamp: number;
  issueCount: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  passed: boolean;
  issues: CompatibilityAuditIssue[];
  summary: string;
}

export interface CompatibilityAuditSystemOptions {
  name?: string;
  adapters?: PlatformAdapter[];
  inputAdapters?: InputAdapter[];
  performanceProfiles?: PerformanceProfile[];
  resolutionSettings?: ResolutionSettings;
  supportedPlatformTargets?: string[];
}
