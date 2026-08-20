import type { InputAdapter } from './InputDevice.js';
import type { PlatformAdapter } from './PlatformAdapter.js';
import type { PerformanceProfile } from './PerformanceProfile.js';
import type { ResolutionSettings } from './ResolutionSettings.js';
import {
  isCompatibilityAuditCategory,
  isCompatibilityAuditSeverity,
  type CompatibilityAuditCategory,
  type CompatibilityAuditIssue,
  type CompatibilityAuditReport,
  type CompatibilityAuditSeverity,
  type CompatibilityAuditSystemOptions,
} from './CompatibilityTypes.js';

function isRecord(value: unknown): boolean {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertNonEmpty(value: string, label: string): void {
  if (!value || value.trim() === '') {
    throw new Error(`${label} must be a non-empty string.`);
  }
}

const VALID_PERFORMANCE_PROFILES = ['low', 'medium', 'high', 'ultra'];

export class CompatibilityAuditSystem {
  readonly name: string;
  private readonly adapters: PlatformAdapter[];
  private readonly inputAdapters: InputAdapter[];
  private readonly performanceProfiles: PerformanceProfile[];
  private readonly resolutionSettings?: ResolutionSettings;
  private readonly supportedPlatformTargets: string[];
  private issueCounter = 0;

  constructor(options: CompatibilityAuditSystemOptions = {}) {
    this.validateOptions(options);

    this.name = options.name ?? 'CYRE Compatibility Audit';
    this.adapters = options.adapters ?? [];
    this.inputAdapters = options.inputAdapters ?? [];
    this.performanceProfiles = options.performanceProfiles ?? [];
    this.resolutionSettings = options.resolutionSettings;
    this.supportedPlatformTargets = options.supportedPlatformTargets ?? [];
  }

  audit(): CompatibilityAuditReport {
    const issues: CompatibilityAuditIssue[] = [];

    this.auditAdapters(issues);
    this.auditInputAdapters(issues);
    this.auditPerformanceProfiles(issues);
    this.auditResolutionSettings(issues);
    this.auditPlatformTargets(issues);

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
    assertNonEmpty(this.name, 'CompatibilityAuditSystem name');

    for (const adapter of this.adapters) {
      this.validateAdapter(adapter);
    }

    for (const inputAdapter of this.inputAdapters) {
      this.validateInputAdapter(inputAdapter);
    }
  }

  private auditAdapters(issues: CompatibilityAuditIssue[]): void {
    if (this.adapters.length === 0) {
      this.addIssue(issues, 'adapter', 'critical', {
        message: 'No platform adapters are registered.',
        source: 'platform-adapters',
      });
      return;
    }

    for (const adapter of this.adapters) {
      const source = `platform-adapter:${adapter.name ?? 'unknown'}`;

      if (!adapter.name || adapter.name.trim() === '') {
        this.addIssue(issues, 'adapter', 'critical', {
          message: 'Platform adapter is missing a name.',
          source,
        });
      }

      if (!adapter.storage) {
        this.addIssue(issues, 'storage', 'critical', {
          message: `Platform adapter "${adapter.name}" is missing storage.`,
          source,
        });
      } else {
        const storageMethods: Array<keyof PlatformAdapter['storage']> = [
          'getItem',
          'setItem',
          'removeItem',
          'clear',
        ];
        for (const method of storageMethods) {
          if (typeof adapter.storage[method] !== 'function') {
            this.addIssue(issues, 'storage', 'critical', {
              message: `Platform adapter "${adapter.name}" storage is missing "${String(method)}()".`,
              source,
            });
          }
        }
      }

      if (!adapter.lifecycle) {
        this.addIssue(issues, 'lifecycle', 'critical', {
          message: `Platform adapter "${adapter.name}" is missing lifecycle hooks.`,
          source,
        });
      } else {
        if (typeof adapter.lifecycle.onPause !== 'function') {
          this.addIssue(issues, 'lifecycle', 'critical', {
            message: `Platform adapter "${adapter.name}" lifecycle is missing onPause().`,
            source,
          });
        }
        if (typeof adapter.lifecycle.onResume !== 'function') {
          this.addIssue(issues, 'lifecycle', 'critical', {
            message: `Platform adapter "${adapter.name}" lifecycle is missing onResume().`,
            source,
          });
        }
      }
    }
  }

  private auditInputAdapters(issues: CompatibilityAuditIssue[]): void {
    if (this.inputAdapters.length === 0) {
      this.addIssue(issues, 'input', 'warning', {
        message: 'No input adapters are registered.',
        source: 'input-adapters',
      });
      return;
    }

    for (const input of this.inputAdapters) {
      if (typeof input.setCommandHandler !== 'function') {
        this.addIssue(issues, 'input', 'critical', {
          message: 'Input adapter is missing setCommandHandler().',
          source: 'input-adapter',
        });
      }
    }
  }

  private auditPerformanceProfiles(issues: CompatibilityAuditIssue[]): void {
    if (this.performanceProfiles.length === 0) {
      this.addIssue(issues, 'performance', 'warning', {
        message: 'No performance profiles are registered.',
        source: 'performance-profiles',
      });
      return;
    }

    for (const profile of this.performanceProfiles) {
      if (!VALID_PERFORMANCE_PROFILES.includes(profile)) {
        this.addIssue(issues, 'performance', 'critical', {
          message: `Invalid performance profile "${profile}".`,
          source: 'performance-profiles',
        });
      }
    }
  }

  private auditResolutionSettings(issues: CompatibilityAuditIssue[]): void {
    if (!this.resolutionSettings) {
      this.addIssue(issues, 'resolution', 'warning', {
        message: 'No resolution settings are registered.',
        source: 'resolution-settings',
      });
      return;
    }

    const info = this.resolutionSettings.getInfo();
    if (info.width <= 0) {
      this.addIssue(issues, 'resolution', 'critical', {
        message: 'Resolution width must be positive.',
        source: 'resolution-settings',
      });
    }
    if (info.height <= 0) {
      this.addIssue(issues, 'resolution', 'critical', {
        message: 'Resolution height must be positive.',
        source: 'resolution-settings',
      });
    }
    if (info.scaleFactor <= 0) {
      this.addIssue(issues, 'resolution', 'critical', {
        message: 'Resolution scale factor must be positive.',
        source: 'resolution-settings',
      });
    }
  }

  private auditPlatformTargets(issues: CompatibilityAuditIssue[]): void {
    if (this.supportedPlatformTargets.length === 0) {
      this.addIssue(issues, 'platform-target', 'warning', {
        message: 'No supported platform targets are configured.',
        source: 'platform-targets',
      });
      return;
    }

    const expected = ['web', 'mobile', 'desktop', 'console'];
    const unknown = this.supportedPlatformTargets.filter(
      (target) => !expected.includes(target),
    );
    for (const target of unknown) {
      this.addIssue(issues, 'platform-target', 'critical', {
        message: `Unsupported platform target "${target}".`,
        source: 'platform-targets',
      });
    }
  }

  private addIssue(
    issues: CompatibilityAuditIssue[],
    category: CompatibilityAuditCategory,
    severity: CompatibilityAuditSeverity,
    data: { message: string; source?: string },
  ): void {
    assertNonEmpty(category, 'Compatibility audit category');
    assertNonEmpty(data.message, 'Compatibility audit message');
    if (!isCompatibilityAuditCategory(category)) {
      throw new Error(`Invalid compatibility audit category "${category}".`);
    }
    if (!isCompatibilityAuditSeverity(severity)) {
      throw new Error(`Invalid compatibility audit severity "${severity}".`);
    }

    this.issueCounter += 1;
    issues.push({
      id: `compatibility-audit-${this.issueCounter}`,
      category,
      severity,
      message: data.message,
      source: data.source,
    });
  }

  private validateAdapter(adapter: PlatformAdapter): void {
    if (!adapter.name || adapter.name.trim() === '') {
      throw new Error('Platform adapter name is required.');
    }
    if (!adapter.storage || !adapter.lifecycle) {
      throw new Error('Platform adapter storage and lifecycle are required.');
    }
  }

  private validateInputAdapter(input: InputAdapter): void {
    if (typeof input.setCommandHandler !== 'function') {
      throw new Error('Input adapter setCommandHandler() must be a function.');
    }
  }

  private validateOptions(options: CompatibilityAuditSystemOptions): void {
    if (!isRecord(options)) {
      throw new Error('CompatibilityAuditSystem options must be an object.');
    }
    if (
      options.name !== undefined &&
      typeof options.name === 'string' &&
      options.name.trim() === ''
    ) {
      throw new Error('CompatibilityAuditSystem name cannot be empty if provided.');
    }
    if (options.adapters !== undefined && !Array.isArray(options.adapters)) {
      throw new Error('CompatibilityAuditSystem adapters must be an array.');
    }
    if (options.inputAdapters !== undefined && !Array.isArray(options.inputAdapters)) {
      throw new Error('CompatibilityAuditSystem inputAdapters must be an array.');
    }
    if (
      options.performanceProfiles !== undefined &&
      !Array.isArray(options.performanceProfiles)
    ) {
      throw new Error('CompatibilityAuditSystem performanceProfiles must be an array.');
    }
    if (
      options.supportedPlatformTargets !== undefined &&
      !Array.isArray(options.supportedPlatformTargets)
    ) {
      throw new Error('CompatibilityAuditSystem supportedPlatformTargets must be an array.');
    }
  }
}
