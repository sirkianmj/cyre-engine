import type { NetworkGraph } from '../cyber/index.js';

export const SECURITY_AUDIT_SEVERITIES = [
  'critical',
  'warning',
  'info',
] as const;

export type SecurityAuditSeverity =
  (typeof SECURITY_AUDIT_SEVERITIES)[number];

export function isSecurityAuditSeverity(
  value: string,
): value is SecurityAuditSeverity {
  return (SECURITY_AUDIT_SEVERITIES as readonly string[]).includes(value);
}

export const SECURITY_AUDIT_CATEGORIES = [
  'configuration',
  'logging',
  'error-handling',
  'data-integrity',
  'input-validation',
  'access-control',
  'network',
] as const;

export type SecurityAuditCategory =
  (typeof SECURITY_AUDIT_CATEGORIES)[number];

export function isSecurityAuditCategory(
  value: string,
): value is SecurityAuditCategory {
  return (SECURITY_AUDIT_CATEGORIES as readonly string[]).includes(value);
}

export interface SecurityAuditIssue {
  id: string;
  category: SecurityAuditCategory;
  severity: SecurityAuditSeverity;
  message: string;
  source?: string;
}

export interface SecurityAuditReport {
  name: string;
  timestamp: number;
  issueCount: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  passed: boolean;
  issues: SecurityAuditIssue[];
  summary: string;
}

export interface SecurityAuditTarget {
  name: string;
  value: unknown;
}

export interface SecurityAuditInputValue {
  name: string;
  value: string;
}

export interface SecurityAuditSystemOptions {
  name?: string;
  configuration?: {
    appName: string;
    version: string;
    logLevel: string;
  };
  logger?: {
    getLevel(): string;
  };
  errorHandlerRethrow?: boolean;
  networkGraph?: NetworkGraph;
  targets?: SecurityAuditTarget[];
  inputValues?: SecurityAuditInputValue[];
}
