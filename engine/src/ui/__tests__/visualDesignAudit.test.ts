import { describe, it, expect } from 'vitest';
import {
  DesignSystem,
  UIThemeManager,
  VisualDesignAuditSystem,
  VisualPolishSystem,
  VISUAL_DESIGN_AUDIT_CATEGORIES,
  isVisualDesignAuditCategory,
  type UIThemeDefinition,
} from '../index.js';

function createTheme(
  overrides: Partial<UIThemeDefinition['tokens']> = {},
  id = 'custom-theme',
  mode: UIThemeDefinition['mode'] = 'dark',
): UIThemeDefinition {
  const base: UIThemeDefinition = new UIThemeManager().listThemes()[0];
  return {
    id,
    name: id,
    mode,
    tokens: {
      ...base.tokens,
      ...overrides,
    },
  };
}

describe('VisualDesignAuditTypes', () => {
  it('exposes categories', () => {
    expect(VISUAL_DESIGN_AUDIT_CATEGORIES).toContain('color');
    expect(isVisualDesignAuditCategory('typography')).toBe(true);
    expect(isVisualDesignAuditCategory('invalid')).toBe(false);
  });
});

describe('VisualDesignAuditSystem', () => {
  it('passes clean default theme and design system', () => {
    const audit = new VisualDesignAuditSystem({
      themeManager: new UIThemeManager(),
      designSystem: DesignSystem.createDefault(),
      visualPolish: new VisualPolishSystem(),
    });

    const report = audit.audit();
    expect(report.criticalCount).toBe(0);
    expect(report.passed).toBe(true);
    expect(report.summary).toContain('passed');
    expect(() => audit.validate()).not.toThrow();
  });

  it('detects low contrast theme', () => {
    const manager = new UIThemeManager([
      createTheme({
        colors: {
          background: '#000000',
          surface: '#111111',
          primary: '#111111',
          secondary: '#333333',
          accent: '#222222',
          textPrimary: '#111111',
          textSecondary: '#222222',
          success: '#222222',
          warning: '#222222',
          danger: '#222222',
          info: '#222222',
          border: '#222222',
        },
      }),
    ]);

    const report = new VisualDesignAuditSystem({ themeManager: manager }).audit();
    expect(report.criticalCount).toBeGreaterThan(0);
    expect(report.issues.some((issue) => issue.category === 'color')).toBe(true);
    expect(report.passed).toBe(false);
  });

  it('detects non-monotonic spacing', () => {
    const manager = new UIThemeManager([
      createTheme({
        spacing: { xs: 8, sm: 4, md: 16, lg: 24, xl: 32 },
      }),
    ]);

    const report = new VisualDesignAuditSystem({ themeManager: manager }).audit();
    expect(report.criticalCount).toBeGreaterThan(0);
    expect(report.issues.some((issue) => issue.category === 'spacing')).toBe(true);
  });

  it('detects invalid motion and radii scales', () => {
    const manager = new UIThemeManager([
      createTheme({
        motion: {
          durationFast: 200,
          durationNormal: 100,
          durationSlow: 400,
          easing: 'linear',
        },
        radii: { small: 12, medium: 8, large: 4 },
      }),
    ]);

    const report = new VisualDesignAuditSystem({ themeManager: manager }).audit();
    expect(report.issues.some((issue) => issue.category === 'motion')).toBe(true);
    expect(report.issues.some((issue) => issue.category === 'radii')).toBe(true);
    expect(report.criticalCount).toBeGreaterThanOrEqual(2);
  });

  it('warns on empty design system', () => {
    const report = new VisualDesignAuditSystem({
      designSystem: new DesignSystem(),
    }).audit();

    expect(report.warningCount).toBeGreaterThan(0);
    expect(report.issues.some((issue) => issue.message.includes('no tokens'))).toBe(true);
    expect(report.passed).toBe(true);
  });

  it('detects missing active theme in visual polish', () => {
    const report = new VisualDesignAuditSystem({
      visualPolish: new VisualPolishSystem(),
    }).audit();

    expect(report.passed).toBe(true);
  });

  it('rejects invalid options', () => {
    expect(() => new VisualDesignAuditSystem({ name: '' })).toThrow(/name/);
  });

  it('validates cleanly', () => {
    const audit = new VisualDesignAuditSystem({
      themeManager: new UIThemeManager(),
      designSystem: DesignSystem.createDefault(),
      visualPolish: new VisualPolishSystem(),
    });
    expect(() => audit.validate()).not.toThrow();
  });
});
