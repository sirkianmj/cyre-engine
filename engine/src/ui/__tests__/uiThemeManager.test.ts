import { describe, it, expect } from 'vitest';
import {
  UIThemeManager,
  type UIThemeDefinition,
} from '../UIThemeManager.js';

describe('UIThemeManager', () => {
  it('loads default light and dark themes', () => {
    const manager = new UIThemeManager();
    expect(manager.listThemes().map((theme) => theme.id)).toEqual([
      'cyre-dark',
      'cyre-light',
    ]);
    expect(manager.getActiveThemeId()).toBe('cyre-dark');
  });

  it('activates a different theme', () => {
    const manager = new UIThemeManager();
    manager.activateTheme('cyre-light');
    expect(manager.getActiveThemeId()).toBe('cyre-light');
    expect(manager.getActiveTheme().mode).toBe('light');
  });

  it('throws when activating an unknown theme', () => {
    const manager = new UIThemeManager();
    expect(() => manager.activateTheme('missing')).toThrow(/does not exist/);
  });

  it('returns color, spacing, and radius tokens from active theme', () => {
    const manager = new UIThemeManager();
    expect(manager.getColor('background')).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(manager.getSpacing('md')).toBe(16);
    expect(manager.getRadius('medium')).toBe(8);
  });

  it('updates a color token', () => {
    const manager = new UIThemeManager();
    manager.setColor('cyre-dark', 'danger', '#ff0000');
    expect(manager.getColor('danger')).toBe('#ff0000');
  });

  it('rejects invalid hex colors', () => {
    const manager = new UIThemeManager();
    expect(() => manager.setColor('cyre-dark', 'danger', 'red')).toThrow(
      /must be a six-digit hex color/,
    );
  });

  it('returns theme copies', () => {
    const manager = new UIThemeManager();
    const themes = manager.listThemes();
    themes[0].name = 'Mutated';
    expect(manager.getActiveTheme().name).toBe('CYRE Dark');

    const active = manager.getActiveTheme();
    active.tokens.colors.danger = 'mutated';
    expect(manager.getColor('danger')).not.toBe('mutated');
  });

  it('rejects missing theme id and name', () => {
    const baseTheme = {
      name: 'Bad',
      mode: 'dark' as const,
      tokens: managerThemeTokens(),
    };

    expect(() => new UIThemeManager([{ ...baseTheme, id: '' } as any])).toThrow(/id is required/);

    const themeWithId = {
      id: 'bad-name',
      mode: 'dark' as const,
      tokens: managerThemeTokens(),
    };

    expect(() => new UIThemeManager([themeWithId as any])).toThrow(/name is required/);
  });

  it('rejects invalid theme mode', () => {
    const theme = {
      id: 'bad-mode',
      name: 'Bad Mode',
      mode: 'invalid' as any,
      tokens: managerThemeTokens(),
    };
    expect(() => new UIThemeManager([theme])).toThrow(/Invalid UI theme mode/);
  });

  it('requires at least one theme', () => {
    expect(() => new UIThemeManager([])).toThrow(/at least one theme/);
  });

  it('rejects duplicate themes', () => {
    const theme = {
      id: 'duplicate',
      name: 'Duplicate Theme',
      mode: 'dark' as const,
      tokens: managerThemeTokens(),
    };
    expect(() => new UIThemeManager([theme, theme])).toThrow(/already exists/);
  });
});

function managerThemeTokens(): UIThemeDefinition['tokens'] {
  return {
    colors: {
      background: '#0b0f17',
      surface: '#111827',
      primary: '#22d3ee',
      secondary: '#64748b',
      accent: '#f59e0b',
      textPrimary: '#f8fafc',
      textSecondary: '#cbd5e1',
      success: '#22c55e',
      warning: '#f97316',
      danger: '#ef4444',
      info: '#3b82f6',
      border: '#1f2937',
    },
    typography: {
      fontFamily: 'Inter',
      baseSize: 14,
      lineHeight: 1.5,
      h1Size: 28,
      h2Size: 22,
      h3Size: 18,
    },
    spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
    motion: { durationFast: 120, durationNormal: 240, durationSlow: 400, easing: 'ease' },
    radii: { small: 4, medium: 8, large: 12 },
  };
}
