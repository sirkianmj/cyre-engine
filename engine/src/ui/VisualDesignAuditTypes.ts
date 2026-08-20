import type { DesignSystem } from './DesignSystem.js';
import type { UIThemeManager } from './UIThemeManager.js';
import type { VisualPolishSystem } from './VisualPolishSystem.js';
import type {
  UxAuditSeverity,
} from './UxAuditTypes.js';
import {
  isUxAuditSeverity,
} from './UxAuditTypes.js';

export const VISUAL_DESIGN_AUDIT_CATEGORIES = [
  'typography',
  'spacing',
  'color',
  'motion',
  'radii',
  'component',
  'theme',
] as const;

export type VisualDesignAuditCategory =
  (typeof VISUAL_DESIGN_AUDIT_CATEGORIES)[number];

export function isVisualDesignAuditCategory(
  value: string,
): value is VisualDesignAuditCategory {
  return (VISUAL_DESIGN_AUDIT_CATEGORIES as readonly string[]).includes(value);
}

export interface VisualDesignAuditIssue {
  id: string;
  category: VisualDesignAuditCategory;
  severity: UxAuditSeverity;
  message: string;
  source?: string;
}

export interface VisualDesignAuditReport {
  name: string;
  timestamp: number;
  issueCount: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  passed: boolean;
  issues: VisualDesignAuditIssue[];
  summary: string;
}

export interface VisualDesignAuditSystemOptions {
  name?: string;
  themeManager?: UIThemeManager;
  designSystem?: DesignSystem;
  visualPolish?: VisualPolishSystem;
}

export function normalizeAuditSeverity(
  severity: string,
): UxAuditSeverity {
  if (!isUxAuditSeverity(severity)) {
    throw new Error(`Invalid audit severity "${severity}".`);
  }
  return severity;
}
