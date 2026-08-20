import { describe, expect, it } from 'vitest';
import { BuildProfile } from '../BuildProfile.js';
import { CiCdPipeline } from '../CiCdPipeline.js';
import { CI_CD_STAGES } from '../CiCdTypes.js';

function createNow() {
  let time = 1000;
  return () => time++;
}

describe('CiCdPipeline', () => {
  it('runs validate, build, package, and report stages successfully', () => {
    const pipeline = new CiCdPipeline({ now: createNow() });

    pipeline.registerProfile(new BuildProfile({
      id: 'web-prod',
      name: 'Web Production',
      target: 'web',
      flavor: 'production',
    }));

    pipeline.registerPackage('web-prod', {
      target: 'web',
      input: {
        id: 'cyre-web',
        name: 'CYRE Web',
        version: '1.0.0',
        entryPoint: 'dist/game.js',
        profile: new BuildProfile({
          id: 'web-prod',
          name: 'Web Production',
          target: 'web',
          flavor: 'production',
        }),
      },
    });

    const result = pipeline.run();

    expect(result.success).toBe(true);
    expect(result.profileIds).toEqual(['web-prod']);
    expect(result.packageCount).toBe(1);
    expect(result.stages.map((stage) => stage.stage)).toEqual([
      'validate',
      'build',
      'package',
      'report',
    ]);
    expect(result.stages.every((stage) => stage.status === 'succeeded')).toBe(true);
  });

  it('runs successfully with no package inputs', () => {
    const pipeline = new CiCdPipeline({ now: createNow() });

    pipeline.registerProfile(new BuildProfile({
      id: 'mobile-staging',
      name: 'Mobile Staging',
      target: 'mobile',
      flavor: 'staging',
    }));

    const result = pipeline.run();

    expect(result.success).toBe(true);
    expect(result.packageCount).toBe(0);
    expect(result.profileIds).toEqual(['mobile-staging']);
  });

  it('rejects duplicate profile registration', () => {
    const pipeline = new CiCdPipeline({ now: createNow() });
    const profile = new BuildProfile({
      id: 'unique',
      name: 'Unique',
      target: 'desktop',
      flavor: 'development',
    });

    pipeline.registerProfile(profile);

    expect(() => pipeline.registerProfile(profile)).toThrow(/already registered/);
  });

  it('rejects package registration for a missing profile', () => {
    const pipeline = new CiCdPipeline({ now: createNow() });

    expect(() =>
      pipeline.registerPackage('missing', {
        target: 'web',
        input: {
          id: 'x',
          name: 'X',
          version: '1.0.0',
          entryPoint: 'x.js',
        },
      }),
    ).toThrow(/does not exist/);
  });

  it('rejects package registration with a target mismatch', () => {
    const pipeline = new CiCdPipeline({ now: createNow() });
    pipeline.registerProfile(new BuildProfile({
      id: 'desktop-prod',
      name: 'Desktop Production',
      target: 'desktop',
      flavor: 'production',
    }));

    expect(() =>
      pipeline.registerPackage('desktop-prod', {
        target: 'web',
        input: {
          id: 'bad',
          name: 'Bad',
          version: '1.0.0',
          entryPoint: 'bad.js',
        },
      }),
    ).toThrow(/does not match/);
  });

  it('exposes the CI/CD stage list', () => {
    expect(CI_CD_STAGES).toEqual(['validate', 'build', 'package', 'report']);
  });
});
