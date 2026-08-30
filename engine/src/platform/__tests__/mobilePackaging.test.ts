import { describe, it, expect } from 'vitest';
import { MOBILE_PLATFORMS, isMobilePlatform } from '../MobilePackageTypes.js';
import { MobilePackage } from '../MobilePackage.js';
import { MobilePackager } from '../MobilePackager.js';
import { BuildProfile } from '../BuildProfile.js';

describe('MobilePackageTypes', () => {
  it('exposes mobile platforms', () => {
    expect(MOBILE_PLATFORMS).toEqual(['ios', 'android']);
    expect(isMobilePlatform('ios')).toBe(true);
    expect(isMobilePlatform('android')).toBe(true);
    expect(isMobilePlatform('invalid')).toBe(false);
  });
});

describe('MobilePackage', () => {
  it('creates a valid mobile package', () => {
    const pkg = new MobilePackage({
      id: 'cyre-mobile',
      name: 'CYRE Mobile',
      version: '1.0.0',
      bundleId: 'com.cyre.mobile',
      platforms: ['ios', 'android'],
      files: ['app.js', 'assets/'],
      settings: { offline: true },
    });

    const manifest = pkg.getManifest();
    expect(manifest.id).toBe('cyre-mobile');
    expect(manifest.bundleId).toBe('com.cyre.mobile');
    expect(manifest.platforms).toEqual(['ios', 'android']);
    expect(manifest.files).toEqual(['app.js', 'assets/']);
    expect(manifest.checksum).toMatch(/^fnv1a-/);
    expect(manifest.sizeBytes).toBeGreaterThan(0);
    expect(() => pkg.validate()).not.toThrow();
  });

  it('defaults to all supported mobile platforms when unspecified', () => {
    const pkg = new MobilePackage({
      id: 'all-mobile',
      name: 'All Mobile',
      version: '1.0.0',
      bundleId: 'com.cyre.allmobile',
    });

    expect(pkg.getManifest().platforms).toEqual(['ios', 'android']);
  });

  it('trims platform and file entries', () => {
    const pkg = new MobilePackage({
      id: 'pkg',
      name: 'Package',
      version: '1.0.0',
      bundleId: 'com.cyre.pkg',
      platforms: [' ios '],
      files: [' app ', 'assets/'],
    });

    expect(pkg.getManifest().platforms).toEqual(['ios']);
    expect(pkg.getManifest().files).toEqual(['app', 'assets/']);
  });

  it('rejects invalid package data', () => {
    expect(
      () => new MobilePackage({
        id: '',
        name: 'x',
        version: '1',
        bundleId: 'x',
      }),
    ).toThrow(/id/);
    expect(
      () => new MobilePackage({
        id: 'x',
        name: '',
        version: '1',
        bundleId: 'x',
      }),
    ).toThrow(/name/);
    expect(
      () => new MobilePackage({
        id: 'x',
        name: 'x',
        version: '',
        bundleId: 'x',
      }),
    ).toThrow(/version/);
    expect(
      () => new MobilePackage({
        id: 'x',
        name: 'x',
        version: '1',
        bundleId: '',
      }),
    ).toThrow(/bundleId/);
    expect(
      () => new MobilePackage({
        id: 'x',
        name: 'x',
        version: '1',
        bundleId: 'x',
        platforms: ['invalid' as any],
      }),
    ).toThrow(/platform/);
    expect(
      () => new MobilePackage({
        id: 'x',
        name: 'x',
        version: '1',
        bundleId: 'x',
        files: [''],
      }),
    ).toThrow(/non-empty/);
    expect(
      () => new MobilePackage({
        id: 'x',
        name: 'x',
        version: '1',
        bundleId: 'x',
        files: ['a', 'a'],
      }),
    ).toThrow(/duplicated/);
  });

  it('clones with deep-copied settings and arrays', () => {
    const pkg = new MobilePackage({
      id: 'pkg',
      name: 'Package',
      version: '1.0.0',
      bundleId: 'com.cyre.pkg',
      files: ['app'],
      settings: { nested: { value: 1 } },
    });

    const clone = pkg.clone();
    clone.getManifest().settings.nested.value = 99;
    expect(pkg.getManifest().settings.nested.value).toBe(1);

    const restored = MobilePackage.fromJSON(pkg.toJSON());
    expect(restored.getManifest().bundleId).toBe('com.cyre.pkg');
    expect(restored.getManifest().settings).toEqual({ nested: { value: 1 } });
  });
});

describe('MobilePackager', () => {
  it('packages a mobile build input', () => {
    const packager = new MobilePackager({ now: () => 1000 });
    const result = packager.package({
      id: 'soc-mobile',
      name: 'SOC Mobile Build',
      version: '2.0.0',
      bundleId: 'com.cyre.soc',
      platforms: ['ios', 'android'],
      files: ['app.js', 'assets/'],
      settings: { environment: 'production' },
    });

    expect(result.success).toBe(true);
    expect(result.package.getManifest()).toMatchObject({
      id: 'soc-mobile',
      name: 'SOC Mobile Build',
      version: '2.0.0',
      bundleId: 'com.cyre.soc',
      platforms: ['ios', 'android'],
      files: ['app.js', 'assets/'],
    });
    expect(result.package.getManifest().settings).toMatchObject({
      packager: 'CYRE Mobile Packager',
      environment: 'production',
    });
  });

  it('creates a package manifest directly', () => {
    const packager = new MobilePackager();
    const manifest = packager.packageManifest({
      id: 'manifest-mobile',
      name: 'Manifest Mobile',
      version: '1.0.0',
      bundleId: 'com.cyre.manifest',
      files: ['app'],
    });

    expect(manifest.id).toBe('manifest-mobile');
    expect(manifest.bundleId).toBe('com.cyre.manifest');
    expect(manifest.checksum).toMatch(/^fnv1a-/);
    expect(manifest.sizeBytes).toBeGreaterThan(0);
  });

  it('accepts a mobile build profile', () => {
    const packager = new MobilePackager();
    const profile = new BuildProfile({
      id: 'mobile-production',
      name: 'Mobile Production',
      target: 'mobile',
      flavor: 'production',
    });

    const result = packager.package({
      id: 'profile-mobile',
      name: 'Profile Mobile',
      version: '1.0.0',
      bundleId: 'com.cyre.profile',
      profile,
    });

    expect(result.profileId).toBe('mobile-production');
    expect(result.package.getManifest().settings).toMatchObject({
      profileId: 'mobile-production',
    });
  });

  it('rejects non-mobile build profile', () => {
    const packager = new MobilePackager();
    const profile = new BuildProfile({
      id: 'web-profile',
      name: 'Web Profile',
      target: 'web',
      flavor: 'production',
    });

    expect(() =>
      packager.package({
        id: 'x',
        name: 'X',
        version: '1',
        bundleId: 'com.cyre.x',
        profile,
      }),
    ).toThrow(/targeting "mobile"/);
  });

  it('validates packager and input', () => {
    const packager = new MobilePackager();
    expect(() => packager.validate()).not.toThrow();
    expect(
      () => packager.package({
        id: '',
        name: 'x',
        version: '1',
        bundleId: 'x',
      }),
    ).toThrow(/id/);
    expect(
      () => packager.package({
        id: 'x',
        name: 'x',
        version: '1',
        bundleId: '',
      }),
    ).toThrow(/bundleId/);
    expect(
      () => packager.package({
        id: 'x',
        name: 'x',
        version: '1',
        bundleId: 'x',
        files: ['a', 'a'],
      }),
    ).toThrow(/duplicated/);
  });
});
