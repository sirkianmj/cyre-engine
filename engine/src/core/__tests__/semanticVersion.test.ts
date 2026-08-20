import { describe, expect, it } from 'vitest';
import { SemanticVersion } from '../SemanticVersion.js';

describe('SemanticVersion parsing', () => {
  it('parses a simple version', () => {
    const version = SemanticVersion.parse('1.2.3');

    expect(version.major).toBe(1);
    expect(version.minor).toBe(2);
    expect(version.patch).toBe(3);
    expect(version.preRelease).toEqual([]);
    expect(version.build).toEqual([]);
    expect(version.toString()).toBe('1.2.3');
  });

  it('parses pre-release and build metadata', () => {
    const version = SemanticVersion.parse('2.0.0-alpha.1+build.2024');

    expect(version.major).toBe(2);
    expect(version.preRelease).toEqual(['alpha', '1']);
    expect(version.build).toEqual(['build', '2024']);
    expect(version.toString()).toBe('2.0.0-alpha.1+build.2024');
  });

  it('parses leading zeros in core only when the component is zero', () => {
    expect(SemanticVersion.parse('0.0.0').toString()).toBe('0.0.0');
    expect(() => SemanticVersion.parse('01.0.0')).toThrow(/Invalid semantic version/);
    expect(() => SemanticVersion.parse('0.01.0')).toThrow(/Invalid semantic version/);
    expect(() => SemanticVersion.parse('0.0.01')).toThrow(/Invalid semantic version/);
  });

  it('rejects empty or whitespace versions', () => {
    expect(() => SemanticVersion.parse('')).toThrow(/non-empty string/);
    expect(() => SemanticVersion.parse('   ')).toThrow(/non-empty string/);
  });

  it('rejects malformed semantic versions', () => {
    for (const invalid of [
      '1',
      '1.2',
      '1.2.3-',
      '1.2.3+',
      '1.2.3-alpha..beta',
      '1.2.3-alpha_1',
      '1.2.3-alpha.01',
      'a.b.c',
    ]) {
      expect(() => SemanticVersion.parse(invalid)).toThrow(
        /Invalid semantic version|pre-release identifier/,
      );
    }
  });

  it('returns null from tryParse for invalid versions', () => {
    expect(SemanticVersion.tryParse('invalid')).toBeNull();
    expect(SemanticVersion.tryParse('')).toBeNull();
  });

  it('reports validity correctly', () => {
    expect(SemanticVersion.isValid('1.0.0')).toBe(true);
    expect(SemanticVersion.isValid('1.0.0-rc.1')).toBe(true);
    expect(SemanticVersion.isValid('not-a-version')).toBe(false);
    expect(SemanticVersion.isValid('')).toBe(false);
  });
});

describe('SemanticVersion comparison', () => {
  it('compares major, minor, and patch precedence', () => {
    expect(SemanticVersion.compare('1.0.0', '2.0.0')).toBeLessThan(0);
    expect(SemanticVersion.compare('1.2.0', '1.3.0')).toBeLessThan(0);
    expect(SemanticVersion.compare('1.2.3', '1.2.4')).toBeLessThan(0);
    expect(SemanticVersion.compare('2.0.0', '1.0.0')).toBeGreaterThan(0);
    expect(SemanticVersion.compare('1.2.3', '1.2.3')).toBe(0);
  });

  it('ranks stable versions above pre-release versions', () => {
    expect(SemanticVersion.compare('1.0.0', '1.0.0-alpha')).toBeGreaterThan(0);
    expect(SemanticVersion.compare('1.0.0-alpha', '1.0.0')).toBeLessThan(0);
  });

  it('compares pre-release identifiers according to SemVer precedence', () => {
    expect(SemanticVersion.compare('1.0.0-alpha', '1.0.0-beta')).toBeLessThan(0);
    expect(SemanticVersion.compare('1.0.0-alpha.1', '1.0.0-alpha.2')).toBeLessThan(0);
    expect(SemanticVersion.compare('1.0.0-alpha.2', '1.0.0-alpha.1')).toBeGreaterThan(0);
    expect(SemanticVersion.compare('1.0.0-alpha.1', '1.0.0-alpha.beta')).toBeLessThan(0);
  });

  it('ignores build metadata when comparing precedence', () => {
    expect(SemanticVersion.compare('1.0.0+001', '1.0.0+002')).toBe(0);
    expect(SemanticVersion.compare('1.0.0+001', '1.0.0')).toBe(0);
  });

  it('supports instance comparison helpers', () => {
    const alpha = SemanticVersion.parse('1.0.0-alpha');
    const stable = SemanticVersion.parse('1.0.0');

    expect(alpha.isLessThan(stable)).toBe(true);
    expect(stable.isGreaterThan(alpha)).toBe(true);
  });

  it('checks equality including build metadata', () => {
    const version = SemanticVersion.parse('1.2.3+build.1');

    expect(version.equals('1.2.3+build.1')).toBe(true);
    expect(version.equals('1.2.3+build.2')).toBe(false);
  });
});

describe('SemanticVersion features', () => {
  it('reports stable and pre-release status', () => {
    expect(SemanticVersion.parse('1.0.0').isStable()).toBe(true);
    expect(SemanticVersion.parse('1.0.0').isPreRelease()).toBe(false);
    expect(SemanticVersion.parse('1.0.0-rc.1').isStable()).toBe(false);
    expect(SemanticVersion.parse('1.0.0-rc.1').isPreRelease()).toBe(true);
  });

  it('bumps major, minor, and patch versions', () => {
    const version = SemanticVersion.parse('1.2.3-alpha.1+build.1');

    expect(version.nextMajor().toString()).toBe('2.0.0');
    expect(version.nextMinor().toString()).toBe('1.3.0');
    expect(version.nextPatch().toString()).toBe('1.2.4');
  });

  it('serializes to JSON as a string', () => {
    const version = SemanticVersion.parse('3.4.5-rc.2+build.9');

    expect(JSON.stringify(version)).toBe('"3.4.5-rc.2+build.9"');
    expect(version.toJSON()).toBe('3.4.5-rc.2+build.9');
  });
});
