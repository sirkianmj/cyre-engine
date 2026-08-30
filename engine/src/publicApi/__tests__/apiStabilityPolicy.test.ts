import { describe, expect, it } from 'vitest';
import {
  ApiStabilityPolicy,
  parseSemanticVersion,
} from '../ApiStabilityPolicy.js';

describe('ApiStabilityPolicy', () => {
  it('parses semantic versions', () => {
    expect(parseSemanticVersion('1.2.3')).toEqual({
      major: 1,
      minor: 2,
      patch: 3,
    });
  });

  it('rejects invalid semantic versions', () => {
    expect(() => parseSemanticVersion('1.2')).toThrowError(/invalid semantic version/i);
    expect(() => parseSemanticVersion('v1.2.3')).toThrowError(/invalid semantic version/i);
  });

  it('accepts backward-compatible minor and patch changes', () => {
    expect(ApiStabilityPolicy.isBackwardCompatible('1.0.0', '1.1.0')).toBe(true);
    expect(ApiStabilityPolicy.isBackwardCompatible('1.0.0', '1.0.5')).toBe(true);
    expect(ApiStabilityPolicy.isBackwardCompatible('1.4.0', '1.4.0')).toBe(true);
  });

  it('rejects major version changes', () => {
    expect(ApiStabilityPolicy.isBackwardCompatible('1.9.9', '2.0.0')).toBe(false);
  });

  it('throws when asserting incompatible versions', () => {
    expect(() =>
      ApiStabilityPolicy.assertBackwardCompatible('1.5.0', '2.0.0'),
    ).toThrowError(/not backward compatible/i);
  });
});
