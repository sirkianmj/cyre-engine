import { describe, it, expect } from 'vitest';
import {
  BUILD_FLAVORS,
  BUILD_TARGETS,
  isBuildFlavor,
  isBuildTarget,
} from '../BuildTypes.js';
import { BuildProfile } from '../BuildProfile.js';
import { BuildArtifact } from '../BuildArtifact.js';
import { BuildPipeline } from '../BuildPipeline.js';

describe('BuildTypes', () => {
  it('exposes build targets and flavors', () => {
    expect(BUILD_TARGETS).toEqual(['web', 'mobile', 'desktop', 'console']);
    expect(BUILD_FLAVORS).toEqual(['development', 'testing', 'staging', 'production']);
    expect(isBuildTarget('web')).toBe(true);
    expect(isBuildTarget('invalid')).toBe(false);
    expect(isBuildFlavor('production')).toBe(true);
    expect(isBuildFlavor('invalid')).toBe(false);
  });
});

describe('BuildProfile', () => {
  it('creates and validates a profile', () => {
    const profile = new BuildProfile({
      id: 'web-production',
      name: 'Web Production',
      target: 'web',
      flavor: 'production',
      settings: { minify: true },
    });
    expect(profile.target).toBe('web');
    expect(profile.flavor).toBe('production');
    expect(profile.settings).toEqual({ minify: true });
    expect(() => profile.validate()).not.toThrow();
  });

  it('rejects invalid target, flavor, and empty ids', () => {
    expect(
      () => new BuildProfile({ id: '', name: 'x', target: 'web', flavor: 'development' }),
    ).toThrow(/id/);
    expect(
      () => new BuildProfile({ id: 'x', name: '', target: 'web', flavor: 'development' }),
    ).toThrow(/name/);
    expect(
      () => new BuildProfile({ id: 'x', name: 'x', target: 'invalid' as any, flavor: 'development' }),
    ).toThrow(/target/);
    expect(
      () => new BuildProfile({ id: 'x', name: 'x', target: 'web', flavor: 'invalid' as any }),
    ).toThrow(/flavor/);
  });

  it('clones and round-trips through JSON', () => {
    const original = new BuildProfile({
      id: 'desktop-test',
      name: 'Desktop Test',
      target: 'desktop',
      flavor: 'testing',
      settings: { nested: { value: 1 } },
    });
    const clone = original.clone();
    clone.settings.nested.value = 99;
    expect(original.settings.nested.value).toBe(1);

    const restored = BuildProfile.fromJSON(original.toJSON());
    expect(restored.settings).toEqual({ nested: { value: 1 } });
  });
});

describe('BuildArtifact', () => {
  it('creates and validates an artifact', () => {
    const artifact = new BuildArtifact({
      id: 'artifact-1',
      name: 'Desktop Build',
      target: 'desktop',
      flavor: 'staging',
      profileId: 'desktop-staging',
      sizeBytes: 2048,
      checksum: 'abc',
    });
    expect(artifact.sizeBytes).toBe(2048);
    expect(() => artifact.validate()).not.toThrow();
  });

  it('rejects invalid size and checksum', () => {
    expect(
      () => new BuildArtifact({
        id: 'a',
        name: 'A',
        target: 'web',
        flavor: 'development',
        profileId: 'p',
        sizeBytes: -1,
      }),
    ).toThrow(/sizeBytes/);
    expect(
      () => new BuildArtifact({
        id: 'a',
        name: 'A',
        target: 'web',
        flavor: 'development',
        profileId: 'p',
        sizeBytes: 0,
        checksum: '',
      }),
    ).toThrow(/checksum/);
  });
});

describe('BuildPipeline', () => {
  it('registers profiles and lists them', () => {
    const pipeline = new BuildPipeline();
    pipeline.registerProfile(new BuildProfile({
      id: 'web-prod',
      name: 'Web Production',
      target: 'web',
      flavor: 'production',
    }));
    pipeline.registerProfile(new BuildProfile({
      id: 'mobile-staging',
      name: 'Mobile Staging',
      target: 'mobile',
      flavor: 'staging',
    }));

    expect(pipeline.listProfileIds()).toEqual(['mobile-staging', 'web-prod']);
    expect(pipeline.listProfilesByTarget('web')).toHaveLength(1);
    expect(pipeline.listProfilesByFlavor('staging')).toHaveLength(1);
  });

  it('builds a profile and produces an artifact with logs', () => {
    const pipeline = new BuildPipeline({ now: () => 1000 });
    pipeline.registerProfile(new BuildProfile({
      id: 'desktop-prod',
      name: 'Desktop Production',
      target: 'desktop',
      flavor: 'production',
      settings: { appName: 'CYRE Desktop' },
    }));

    const result = pipeline.build('desktop-prod');
    expect(result.success).toBe(true);
    expect(result.target).toBe('desktop');
    expect(result.flavor).toBe('production');
    expect(result.artifact).toBeDefined();
    expect(result.artifact!.sizeBytes).toBeGreaterThan(0);
    expect(result.artifact!.checksum).toMatch(/^fnv1a-/);
    expect(result.logs.map((log) => log.stage)).toEqual([
      'validate',
      'resolveTarget',
      'compileArtifact',
      'package',
      'finalize',
    ]);
  });

  it('merges settings overrides without mutating profile', () => {
    const pipeline = new BuildPipeline();
    const profile = new BuildProfile({
      id: 'web-dev',
      name: 'Web Development',
      target: 'web',
      flavor: 'development',
      settings: { sourceMaps: true, minify: false },
    });
    pipeline.registerProfile(profile);

    const result = pipeline.build('web-dev', { minify: true, assets: ['./dist'] });
    expect(result.artifact!.metadata!.payload.settings).toMatchObject({
      sourceMaps: true,
      minify: true,
      assets: ['./dist'],
    });
    expect(pipeline.getProfile('web-dev')!.settings).toEqual({
      sourceMaps: true,
      minify: false,
    });
  });

  it('builds all profiles sorted by profile id', () => {
    const pipeline = new BuildPipeline();
    pipeline.registerProfile(new BuildProfile({
      id: 'b',
      name: 'B',
      target: 'console',
      flavor: 'production',
    }));
    pipeline.registerProfile(new BuildProfile({
      id: 'a',
      name: 'A',
      target: 'web',
      flavor: 'development',
    }));

    const results = pipeline.buildAll();
    expect(results.map((result) => result.profileId)).toEqual(['a', 'b']);
    expect(results.every((result) => result.success)).toBe(true);
  });

  it('rejects missing profile, duplicate registration, and invalid overrides', () => {
    const pipeline = new BuildPipeline();
    const profile = new BuildProfile({
      id: 'unique',
      name: 'Unique',
      target: 'web',
      flavor: 'development',
    });
    pipeline.registerProfile(profile);

    expect(() => pipeline.registerProfile(profile)).toThrow(/already registered/);
    expect(() => pipeline.build('missing')).toThrow(/does not exist/);
    expect(() => pipeline.build('unique', [] as any)).toThrow(/object/);
    expect(() => pipeline.unregisterProfile('missing')).toThrow(/does not exist/);
  });

  it('validates pipeline cleanly', () => {
    const pipeline = new BuildPipeline();
    pipeline.registerProfile(new BuildProfile({
      id: 'valid-profile',
      name: 'Valid',
      target: 'mobile',
      flavor: 'testing',
    }));
    expect(() => pipeline.validate()).not.toThrow();
  });
});
