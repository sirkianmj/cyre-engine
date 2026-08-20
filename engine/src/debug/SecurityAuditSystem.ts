import { NetworkGraph } from '../cyber/index.js';
import {
  SECURITY_AUDIT_CATEGORIES,
  SECURITY_AUDIT_SEVERITIES,
  isSecurityAuditCategory,
  isSecurityAuditSeverity,
  type SecurityAuditCategory,
  type SecurityAuditIssue,
  type SecurityAuditInputValue,
  type SecurityAuditReport,
  type SecurityAuditSeverity,
  type SecurityAuditSystemOptions,
  type SecurityAuditTarget,
} from './SecurityAuditTypes.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function assertNonEmpty(value: string, label: string): void {
  if (!value || value.trim() === '') {
    throw new Error(`${label} must be a non-empty string.`);
  }
}

const VALID_LOG_LEVELS = ['debug', 'info', 'warn', 'error'];

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

const SENSITIVE_KEY_PATTERN =
  /(password|passwd|secret|token|api[_-]?key|authorization|bearer)/i;

const DANGEROUS_INPUT_PATTERNS: Array<{
  pattern: RegExp;
  severity: SecurityAuditSeverity;
  label: string;
}> = [
  {
    pattern: /<\s*script[\s>]/i,
    severity: 'critical',
    label: 'inline script tag',
  },
  {
    pattern: /javascript\s*:/i,
    severity: 'critical',
    label: 'javascript protocol URI',
  },
  {
    pattern: /\.\.\s*[/\\]/,
    severity: 'warning',
    label: 'path traversal sequence',
  },
  {
    pattern: /data\s*:\s*text\/html/i,
    severity: 'critical',
    label: 'HTML data URI',
  },
];

export class SecurityAuditSystem {
  readonly name: string;
  private readonly configuration?: SecurityAuditSystemOptions['configuration'];
  private readonly logger?: SecurityAuditSystemOptions['logger'];
  private readonly errorHandlerRethrow?: boolean;
  private readonly networkGraph?: NetworkGraph;
  private readonly targets: SecurityAuditTarget[];
  private readonly inputValues: SecurityAuditInputValue[];
  private issueCounter = 0;

  constructor(options: SecurityAuditSystemOptions = {}) {
    this.validateOptions(options);

    this.name = options.name ?? 'CYRE Security Audit';
    this.configuration = options.configuration;
    this.logger = options.logger;
    this.errorHandlerRethrow = options.errorHandlerRethrow;
    this.networkGraph = options.networkGraph;
    this.targets = options.targets !== undefined
      ? options.targets.map((target) => ({
          name: target.name,
          value: deepClone(target.value),
        }))
      : [];
    this.inputValues = options.inputValues !== undefined
      ? options.inputValues.map((entry) => ({
          name: entry.name,
          value: entry.value,
        }))
      : [];
  }

  audit(): SecurityAuditReport {
    const issues: SecurityAuditIssue[] = [];

    this.auditConfiguration(issues);
    this.auditLogger(issues);
    this.auditErrorHandler(issues);
    this.auditNetworkGraph(issues);
    this.auditTargets(issues);
    this.auditInputValues(issues);

    const criticalCount = issues.filter((issue) => issue.severity === 'critical').length;
    const warningCount = issues.filter((issue) => issue.severity === 'warning').length;
    const infoCount = issues.filter((issue) => issue.severity === 'info').length;

    return {
      name: this.name,
      timestamp: Date.now(),
      issueCount: issues.length,
      criticalCount,
      warningCount,
      infoCount,
      passed: criticalCount === 0,
      issues,
      summary: [
        this.name,
        `${issues.length} issues`,
        `critical=${criticalCount}`,
        `warning=${warningCount}`,
        `info=${infoCount}`,
        criticalCount === 0 ? 'passed' : 'failed',
      ].join(' | '),
    };
  }

  validate(): void {
    assertNonEmpty(this.name, 'SecurityAuditSystem name');
    if (this.logger && typeof this.logger.getLevel !== 'function') {
      throw new Error('SecurityAuditSystem logger must expose a getLevel() method.');
    }
    if (
      this.networkGraph !== undefined &&
      !(this.networkGraph instanceof NetworkGraph)
    ) {
      throw new Error('SecurityAuditSystem networkGraph must be a NetworkGraph instance.');
    }

  }

  private auditConfiguration(issues: SecurityAuditIssue[]): void {
    if (!this.configuration) return;

    if (!this.configuration.appName || this.configuration.appName.trim() === '') {
      this.addIssue(issues, 'configuration', 'critical', {
        message: 'Application name is empty.',
        source: 'configuration',
      });
    }

    if (!this.configuration.version || this.configuration.version.trim() === '') {
      this.addIssue(issues, 'configuration', 'critical', {
        message: 'Application version is empty.',
        source: 'configuration',
      });
    }

    if (!VALID_LOG_LEVELS.includes(this.configuration.logLevel)) {
      this.addIssue(issues, 'configuration', 'critical', {
        message: `Invalid log level "${this.configuration.logLevel}".`,
        source: 'configuration',
      });
    }

    if (
      this.configuration.appName?.toLowerCase().includes('password') ||
      this.configuration.appName?.toLowerCase().includes('token')
    ) {
      this.addIssue(issues, 'configuration', 'warning', {
        message: 'Application name may contain sensitive credential information.',
        source: 'configuration',
      });
    }
  }

  private auditLogger(issues: SecurityAuditIssue[]): void {
    if (!this.logger) return;

    let level: string;
    try {
      level = this.logger.getLevel();
    } catch (error) {
      this.addIssue(issues, 'logging', 'critical', {
        message: `Logger getLevel() threw: ${(error as Error).message}`,
        source: 'logger',
      });
      return;
    }

    if (!VALID_LOG_LEVELS.includes(level)) {
      this.addIssue(issues, 'logging', 'critical', {
        message: `Invalid logger level "${level}".`,
        source: 'logger',
      });
    }
  }

  private auditErrorHandler(issues: SecurityAuditIssue[]): void {
    if (this.errorHandlerRethrow === true) {
      this.addIssue(issues, 'error-handling', 'warning', {
        message:
          'Error handler is configured to rethrow. In production, rethrowing may crash the application unexpectedly.',
        source: 'error-handler',
      });
    }
  }

  private auditNetworkGraph(issues: SecurityAuditIssue[]): void {
    if (!this.networkGraph) return;

    try {
      this.networkGraph.validate();
    } catch (error) {
      this.addIssue(issues, 'network', 'critical', {
        message: `Network graph validation failed: ${(error as Error).message}`,
        source: 'network-graph',
      });
      return;
    }

    if (this.networkGraph.getNodes().length === 0) {
      this.addIssue(issues, 'network', 'warning', {
        message: 'Network graph contains no nodes.',
        source: 'network-graph',
      });
    }
  }

  private auditTargets(issues: SecurityAuditIssue[]): void {
    for (const target of this.targets) {
      let serializable: unknown;
      try {
        serializable = this.serializeTarget(target.value);
      } catch (error) {
        this.addIssue(issues, 'data-integrity', 'critical', {
          message: `Target "${target.name}" is not JSON serializable: ${(error as Error).message}`,
          source: target.name,
        });
        continue;
      }

      this.scanData(
        serializable,
        target.name,
        issues,
      );
    }
  }

  private auditInputValues(issues: SecurityAuditIssue[]): void {
    for (const entry of this.inputValues) {
      if (typeof entry.value !== 'string') {
        this.addIssue(issues, 'input-validation', 'critical', {
          message: `Input value "${entry.name}" is not a string.`,
          source: entry.name,
        });
        continue;
      }

      for (const rule of DANGEROUS_INPUT_PATTERNS) {
        if (rule.pattern.test(entry.value)) {
          this.addIssue(issues, 'input-validation', rule.severity, {
            message: `Input value "${entry.name}" contains a ${rule.label}.`,
            source: entry.name,
          });
        }
      }
    }
  }

  private scanData(
    value: unknown,
    source: string,
    issues: SecurityAuditIssue[],
    path = '$',
  ): void {
    if (Array.isArray(value)) {
      value.forEach((entry, index) => {
        this.scanData(entry, source, issues, `${path}[${index}]`);
      });
      return;
    }

    if (!isRecord(value)) return;

    for (const [key, child] of Object.entries(value)) {
      if (DANGEROUS_KEYS.has(key)) {
        this.addIssue(issues, 'data-integrity', 'critical', {
          message: `Serialized data at ${path} contains dangerous key "${key}".`,
          source,
        });
      }

      if (SENSITIVE_KEY_PATTERN.test(key)) {
        this.addIssue(issues, 'data-integrity', 'warning', {
          message: `Serialized data at ${path} contains potentially sensitive key "${key}".`,
          source,
        });
      }

      this.scanData(child, source, issues, `${path}.${key}`);
    }
  }

  private serializeTarget(value: unknown): unknown {
    if (
      value !== null &&
      typeof value === 'object' &&
      typeof (value as { toJSON?: () => unknown }).toJSON === 'function'
    ) {
      const json = (value as { toJSON: () => unknown }).toJSON();
      return JSON.parse(JSON.stringify(json));
    }

    return JSON.parse(JSON.stringify(value));
  }

  private addIssue(
    issues: SecurityAuditIssue[],
    category: SecurityAuditCategory,
    severity: SecurityAuditSeverity,
    data: { message: string; source?: string },
  ): void {
    assertNonEmpty(category, 'Security audit category');
    assertNonEmpty(data.message, 'Security audit message');
    if (!isSecurityAuditCategory(category)) {
      throw new Error(`Invalid security audit category "${category}".`);
    }
    if (!isSecurityAuditSeverity(severity)) {
      throw new Error(`Invalid security audit severity "${severity}".`);
    }

    this.issueCounter += 1;
    issues.push({
      id: `security-audit-${this.issueCounter}`,
      category,
      severity,
      message: data.message,
      source: data.source,
    });
  }

  private validateOptions(options: SecurityAuditSystemOptions): void {
    if (!isRecord(options)) {
      throw new Error('SecurityAuditSystem options must be an object.');
    }
    if (
      options.name !== undefined &&
      typeof options.name === 'string' &&
      options.name.trim() === ''
    ) {
      throw new Error('SecurityAuditSystem name cannot be empty if provided.');
    }
    if (
      options.configuration !== undefined &&
      !isRecord(options.configuration)
    ) {
      throw new Error('SecurityAuditSystem configuration must be an object.');
    }
    if (
      options.targets !== undefined &&
      !Array.isArray(options.targets)
    ) {
      throw new Error('SecurityAuditSystem targets must be an array.');
    }
    if (
      options.inputValues !== undefined &&
      !Array.isArray(options.inputValues)
    ) {
      throw new Error('SecurityAuditSystem inputValues must be an array.');
    }
    if (
      options.errorHandlerRethrow !== undefined &&
      typeof options.errorHandlerRethrow !== 'boolean'
    ) {
      throw new Error('SecurityAuditSystem errorHandlerRethrow must be a boolean.');
    }
  }
}
