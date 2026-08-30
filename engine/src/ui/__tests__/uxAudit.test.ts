import { describe, it, expect } from 'vitest';
import {
  AccessibilitySettings,
  DesignSystem,
  FeedbackSystem,
  MotionSystem,
  UIComponent,
  UIComponentRegistry,
  UIState,
  UxAuditSystem,
  VisualPolishSystem,
  UX_AUDIT_SEVERITIES,
  UX_AUDIT_CATEGORIES,
  isUxAuditSeverity,
  isUxAuditCategory,
} from '../index.js';

class GoodComponent extends UIComponent<UIState> {
  constructor() {
    super({ value: 1 });
  }

  render(): Record<string, unknown> {
    return { type: 'good-component', value: this.state.value };
  }
}

class BrokenComponent extends UIComponent<UIState> {
  constructor() {
    super({});
  }

  render(): Record<string, unknown> {
    throw new Error('broken render');
  }
}

class NoTypeComponent extends UIComponent<UIState> {
  constructor() {
    super({});
  }

  render(): Record<string, unknown> {
    return { value: 1 };
  }
}

describe('UxAuditTypes', () => {
  it('exposes severities and categories', () => {
    expect(UX_AUDIT_SEVERITIES).toEqual(['critical', 'warning', 'info']);
    expect(UX_AUDIT_CATEGORIES).toEqual([
      'accessibility',
      'motion',
      'visual',
      'component',
      'feedback',
    ]);
    expect(isUxAuditSeverity('critical')).toBe(true);
    expect(isUxAuditCategory('component')).toBe(true);
  });
});

describe('UxAuditSystem', () => {
  it('audits a clean system with no critical issues', () => {
    const audit = new UxAuditSystem({
      accessibility: new AccessibilitySettings({
        highContrast: true,
        colorblindMode: true,
      }),
      motion: new MotionSystem({ reduceMotion: false, durationMs: 240, delayMs: 0 }),
      visualPolish: new VisualPolishSystem(),
      designSystem: DesignSystem.createDefault(),
      components: new UIComponentRegistry(),
      feedback: new FeedbackSystem(),
    });

    const report = audit.audit();
    expect(report.criticalCount).toBe(0);
    expect(report.passed).toBe(true);
    expect(report.summary).toContain('passed');
    expect(() => audit.validate()).not.toThrow();
  });

  it('detects a component that throws during render', () => {
    const registry = new UIComponentRegistry();
    registry.register('broken', new BrokenComponent());

    const audit = new UxAuditSystem({ components: registry });
    const report = audit.audit();
    expect(report.criticalCount).toBe(1);
    expect(report.passed).toBe(false);
    expect(report.issues[0].category).toBe('component');
    expect(report.issues[0].message).toContain('broken render');
  });

  it('detects a component with no rendered type', () => {
    const registry = new UIComponentRegistry();
    registry.register('no-type', new NoTypeComponent());

    const audit = new UxAuditSystem({ components: registry });
    const report = audit.audit();
    expect(report.criticalCount).toBe(1);
    expect(report.issues[0].message).toContain('without a component type');
    expect(report.passed).toBe(false);
  });

  it('detects reduce motion mismatch', () => {
    const audit = new UxAuditSystem({
      accessibility: new AccessibilitySettings({ reduceMotion: true }),
      motion: new MotionSystem({ reduceMotion: false }),
    });

    const report = audit.audit();
    expect(report.criticalCount).toBe(1);
    expect(report.issues[0].category).toBe('accessibility');
    expect(report.issues[0].message).toContain('inconsistent');
  });

  it('detects extreme motion duration and delay', () => {
    const audit = new UxAuditSystem({
      motion: new MotionSystem({ durationMs: 600, delayMs: 300 }),
    });

    const report = audit.audit();
    expect(report.warningCount).toBeGreaterThanOrEqual(2);
    expect(report.passed).toBe(true);
  });

  it('detects empty design system', () => {
    const audit = new UxAuditSystem({
      designSystem: new DesignSystem(),
    });

    const report = audit.audit();
    expect(report.warningCount).toBeGreaterThanOrEqual(1);
    expect(report.issues.some((issue) => issue.message.includes('no tokens'))).toBe(true);
  });

  it('warns on excessive unread feedback', () => {
    const feedback = new FeedbackSystem();
    for (let i = 0; i < 25; i += 1) {
      feedback.add('info', `Message ${i}`);
    }

    const audit = new UxAuditSystem({ feedback });
    const report = audit.audit();
    expect(report.warningCount).toBeGreaterThanOrEqual(1);
    expect(report.issues.some((issue) => issue.category === 'feedback')).toBe(true);
  });

  it('rejects invalid options', () => {
    expect(() => new UxAuditSystem({ name: '' })).toThrow(/name/);
    expect(() => new UxAuditSystem({} as any).validate()).not.toThrow();
  });
});
