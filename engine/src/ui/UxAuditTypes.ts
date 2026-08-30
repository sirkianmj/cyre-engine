import type { AccessibilitySettings } from './AccessibilitySettings.js';
import type { DesignSystem } from './DesignSystem.js';
import type { FeedbackSystem } from './FeedbackSystem.js';
import type { MotionSystem } from './MotionSystem.js';
import type { UIComponentRegistry } from './UIComponentRegistry.js';
import type { VisualPolishSystem } from './VisualPolishSystem.js';

export const UX_AUDIT_SEVERITIES = [
  'critical',
  'warning',
  'info',
] as const;

export type UxAuditSeverity = (typeof UX_AUDIT_SEVERITIES)[number];

export function isUxAuditSeverity(value: string): value is UxAuditSeverity {
  return (UX_AUDIT_SEVERITIES as readonly string[]).includes(value);
}

export const UX_AUDIT_CATEGORIES = [
  'accessibility',
  'motion',
  'visual',
  'component',
  'feedback',
] as const;

export type UxAuditCategory = (typeof UX_AUDIT_CATEGORIES)[number];

export function isUxAuditCategory(value: string): value is UxAuditCategory {
  return (UX_AUDIT_CATEGORIES as readonly string[]).includes(value);
}

export interface UxAuditIssue {
  id: string;
  category: UxAuditCategory;
  severity: UxAuditSeverity;
  message: string;
  source?: string;
}

export interface UxAuditReport {
  name: string;
  timestamp: number;
  issueCount: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  passed: boolean;
  issues: UxAuditIssue[];
  summary: string;
}

export interface UxAuditSystemOptions {
  name?: string;
  accessibility?: AccessibilitySettings;
  motion?: MotionSystem;
  visualPolish?: VisualPolishSystem;
  designSystem?: DesignSystem;
  components?: UIComponentRegistry;
  feedback?: FeedbackSystem;
}
