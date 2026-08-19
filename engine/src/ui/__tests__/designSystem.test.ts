import { describe, it, expect } from 'vitest';
import { DesignSystem } from '../DesignSystem.js';

describe('DesignSystem', () => {
  it('creates an empty design system', () => {
    const system = new DesignSystem();
    expect(system.listTokens()).toEqual([]);
    expect(system.listCategories()).toEqual([]);
  });

  it('creates the default CYRE design system', () => {
    const system = DesignSystem.createDefault();
    expect(system.hasToken('color.background')).toBe(true);
    expect(system.getTokenValue('spacing.md')).toBe(16);
    expect(system.listTokens().length).toBeGreaterThan(0);
  });

  it('adds and retrieves a token', () => {
    const system = new DesignSystem();
    system.addToken({
      name: 'color.success',
      category: 'color',
      value: '#22c55e',
      description: 'Success color.',
    });
    expect(system.getToken('color.success')).toEqual({
      name: 'color.success',
      category: 'color',
      value: '#22c55e',
      description: 'Success color.',
    });
  });

  it('rejects duplicate tokens', () => {
    const system = DesignSystem.createDefault();
    expect(() =>
      system.addToken({ name: 'color.background', category: 'color', value: '#ffffff' }),
    ).toThrow(/already exists/);
  });

  it('rejects invalid token names and values', () => {
    const system = new DesignSystem();
    expect(() =>
      system.addToken({ name: '', category: 'color', value: '#ffffff' }),
    ).toThrow(/name is required/);
    expect(() =>
      system.addToken({ name: 'bad-empty', category: 'color', value: '   ' }),
    ).toThrow(/cannot be empty/);
    expect(() =>
      system.addToken({ name: 'bad-number', category: 'spacing', value: Number.POSITIVE_INFINITY }),
    ).toThrow(/must be finite/);
    expect(() =>
      system.addToken({ name: 'bad-type', category: 'color', value: true as any }),
    ).toThrow(/must be a string or number/);
  });

  it('rejects invalid category', () => {
    const system = new DesignSystem();
    expect(() =>
      system.addToken({
        name: 'bad.category',
        category: 'invalid' as any,
        value: '#ffffff',
      }),
    ).toThrow(/Invalid design system category/);
  });

  it('sets token values', () => {
    const system = DesignSystem.createDefault();
    system.setTokenValue('color.primary', '#0891b2');
    expect(system.getTokenValue('color.primary')).toBe('#0891b2');
  });

  it('lists tokens by category', () => {
    const system = DesignSystem.createDefault();
    const colorTokens = system.listTokensByCategory('color');
    expect(colorTokens.every((token) => token.category === 'color')).toBe(true);
    expect(colorTokens.map((token) => token.name)).toContain('color.primary');
  });

  it('resolves component tokens with state overrides', () => {
    const system = new DesignSystem([
      { name: 'component.button.height', category: 'component', value: 36 },
      { name: 'component.button.height.hover', category: 'component', value: 40 },
    ]);

    expect(system.resolveComponentToken('button', 'height')).toBe(36);
    expect(system.resolveComponentToken('button', 'height', 'hover')).toBe(40);
  });

  it('falls back to base component token when state token missing', () => {
    const system = new DesignSystem([
      { name: 'component.panel.background', category: 'component', value: '#111827' },
    ]);

    expect(system.resolveComponentToken('panel', 'background', 'hover')).toBe('#111827');
  });

  it('throws when component token does not exist', () => {
    const system = new DesignSystem();
    expect(() => system.resolveComponentToken('button', 'height')).toThrow(/does not exist/);
  });

  it('returns tokens as copies', () => {
    const system = DesignSystem.createDefault();
    const tokens = system.listTokens();
    tokens[0].value = 'mutated';
    expect(system.getTokenValue('color.background')).toBe('#0b0f17');

    const token = system.getToken('color.primary');
    token.value = 'mutated';
    expect(system.getTokenValue('color.primary')).toBe('#22d3ee');
  });

  it('exports an independent token map', () => {
    const system = DesignSystem.createDefault();
    const exported = system.exportTokens();
    exported['color.background'].value = 'mutated';
    expect(system.getTokenValue('color.background')).toBe('#0b0f17');
  });
});
