import { describe, it, expect } from 'vitest';
import {
  CompatibilityAuditSystem,
  GamepadInputAdapter,
  MemoryStorageAdapter,
  MobilePlatformAdapter,
  PerformanceProfile,
  ResolutionSettings,
  type PlatformAdapter,
} from '../index.js';
import {
  isCompatibilityAuditSeverity,
  isCompatibilityAuditCategory,
} from '../CompatibilityTypes.js';

function createAdapter(name: string): PlatformAdapter {
  const storage = new MemoryStorageAdapter();
  return {
    name,
    storage,
    lifecycle: {
      onPause: () => {},
      onResume: () => {},
    },
  };
}

describe('CompatibilityTypes', () => {
  it('exposes severities and categories', () => {
    expect(isCompatibilityAuditSeverity('critical')).toBe(true);
    expect(isCompatibilityAuditCategory('adapter')).toBe(true);
  });
});

describe('CompatibilityAuditSystem', () => {
  it('passes a clean platform setup', () => {
    const audit = new CompatibilityAuditSystem({
      adapters: [createAdapter('test')],
      inputAdapters: [new GamepadInputAdapter()],
      performanceProfiles: [PerformanceProfile.Medium],
      resolutionSettings: new ResolutionSettings({ width: 1280, height: 720 }),
      supportedPlatformTargets: ['web', 'desktop'],
    });

    const report = audit.audit();
    expect(report.criticalCount).toBe(0);
    expect(report.passed).toBe(true);
    expect(report.summary).toContain('passed');
    expect(() => audit.validate()).not.toThrow();
  });

  it('detects missing platform adapter', () => {
    const report = new CompatibilityAuditSystem({
      adapters: [],
    }).audit();

    expect(report.criticalCount).toBeGreaterThan(0);
    expect(report.issues.some((issue) => issue.category === 'adapter')).toBe(true);
    expect(report.passed).toBe(false);
  });

  it('detects invalid platform adapter', () => {
    const report = new CompatibilityAuditSystem({
      adapters: [{
        name: '',
        storage: null,
        lifecycle: null,
      } as any],
    }).audit();

    expect(report.criticalCount).toBeGreaterThan(0);
    expect(report.issues.some((issue) => issue.category === 'adapter')).toBe(true);
  });

  it('detects invalid performance profile', () => {
    const report = new CompatibilityAuditSystem({
      adapters: [createAdapter('a')],
      performanceProfiles: ['invalid' as any],
    }).audit();

    expect(report.criticalCount).toBeGreaterThan(0);
    expect(report.issues.some((issue) => issue.category === 'performance')).toBe(true);
  });

  it('detects missing resolution settings', () => {
    const report = new CompatibilityAuditSystem({
      adapters: [createAdapter('a')],
      supportedPlatformTargets: ['web'],
    }).audit();

    expect(report.warningCount).toBeGreaterThan(0);
    expect(report.issues.some((issue) => issue.category === 'resolution')).toBe(true);
  });

  it('detects unsupported platform target', () => {
    const report = new CompatibilityAuditSystem({
      adapters: [createAdapter('a')],
      supportedPlatformTargets: ['web', 'invalid'],
    }).audit();

    expect(report.criticalCount).toBeGreaterThan(0);
    expect(report.issues.some((issue) => issue.category === 'platform-target')).toBe(true);
  });

  it('rejects invalid input adapter', () => {
    expect(() =>
      new CompatibilityAuditSystem({
        inputAdapters: [{} as any],
      }).validate(),
    ).toThrow(/setCommandHandler/);
  });

  it('rejects invalid options', () => {
    expect(() => new CompatibilityAuditSystem({ name: '' })).toThrow(/name/);
  });
});
