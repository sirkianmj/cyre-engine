import { describe, it, expect } from 'vitest';
import { DESKTOP_PLATFORMS, isDesktopPlatform } from '../DesktopPackageTypes.js';
import { DesktopPackage } from '../DesktopPackage.js';
import { DesktopPackager } from '../DesktopPackager.js';
import { BuildProfile } from '../BuildProfile.js';

describe('DesktopPackageTypes', () => {
  it('exposes desktop platforms', () => {
    expect(DESKTOP_PLATFORMS).toEqual(['windows', 'macos', 'linux']);
    expect(isDesktopPlatform('macos')).toBe(true);
    expect(isDesktopPlatform('invalid')).toBe(false);
  });
});

describe('DesktopPackage', () => {
  it('creates a valid desktop package', () => {
    const pkg = new DesktopPackage({
      id: 'cyre-desktop',
      name: 'CYRE Desktop',
      version: '1.0.0',
      executableName: 'cyre-desktop',
      platforms: ['macos', 'windows'],
      files: ['bin/cyre', 'resources/'],
      settings: { electron: true },
    });

    const manifest = pkg.getManifest();
    expect(manifest.id).toBe('cyre-desktop');
    expect(manifest.executableName).toBe('cyre-desktop');
    expect(manifest.platforms).toEqual(['macos', 'windows']);
    expect(manifest.files).toEqual(['bin/cyre', 'resources/']);
    expect(manifest.checksum).toMatch(/^fnv1a-/);
    expect(manifest.sizeBytes).toBeGreaterThan(0);
    expect(() => pkg.validate()).not.toThrow();
  });

  it('defaults to all supported platforms when unspecified', () => {
    const pkg = new DesktopPackage({
      id: 'all-platforms',
      name: 'All Platforms',
      version: '1.0.0',
      executableName: 'all-platforms',
    });

    expect(pkg.getManifest().platforms).toEqual(['windows', 'macos', 'linux']);
  });

  it('trims platform and file entries', () => {
    const pkg = new DesktopPackage({
      id: 'pkg',
      name: 'Package',
      version: '1.0.0',
      executableName: 'pkg',
      platforms: [' linux '],
      files: [' app ', 'bin/'],
    });

    expect(pkg.getManifest().platforms).toEqual(['linux']);
    expect(pkg.getManifest().files).toEqual(['app', 'bin/']);
  });

  it('rejects invalid package data', () => {
    expect(
      () => new DesktopPackage({
        id: '',
        name: 'x',
        version: '1',
        executableName: 'x',
      }),
    ).toThrow(/id/);
    expect(
      () => new DesktopPackage({
        id: 'x',
        name: '',
        version: '1',
        executableName: 'x',
      }),
    ).toThrow(/name/);
    expect(
      () => new DesktopPackage({
        id: 'x',
        name: 'x',
        version: '',
        executableName: 'x',
      }),
    ).toThrow(/version/);
    expect(
      () => new DesktopPackage({
        id: 'x',
        name: 'x',
        version: '1',
        executableName: '',
      }),
    ).toThrow(/executableName/);
    expect(
      () => new DesktopPackage({
        id: 'x',
        name: 'x',
        version: '1',
        executableName: 'x',
        platforms: ['invalid' as any],
      }),
    ).toThrow(/platform/);
    expect(
      () => new DesktopPackage({
        id: 'x',
        name: 'x',
        version: '1',
        executableName: 'x',
        files: [''],
      }),
    ).toThrow(/non-empty/);
    expect(
      () => new DesktopPackage({
        id: 'x',
        name: 'x',
        version: '1',
        executableName: 'x',
        files: ['a', 'a'],
      }),
    ).toThrow(/duplicated/);
  });

  it('clones with deep-copied settings and arrays', () => {
    const pkg = new DesktopPackage({
      id: 'pkg',
      name: 'Package',
      version: '1.0.0',
      executableName: 'pkg',
      files: ['app'],
      settings: { nested: { value: 1 } },
    });

    const clone = pkg.clone();
    clone.getManifest().settings.nested.value = 99;
    expect(pkg.getManifest().settings.nested.value).toBe(1);

    const restored = DesktopPackage.fromJSON(pkg.toJSON());
    expect(restored.getManifest().executableName).toBe('pkg');
    expect(restored.getManifest().settings).toEqual({ nested: { value: 1 } });
  });
});

describe('DesktopPackager', () => {
  it('packages a desktop build input', () => {
    const packager = new DesktopPackager({ now: () => 1000 });
    const result = packager.package({
      id: 'soc-desktop',
      name: 'SOC Desktop Build',
      version: '2.0.0',
      executableName: 'soc-desktop',
      platforms: ['macos', 'windows'],
      files: ['bin/soc', 'assets/'],
      settings: { environment: 'production' },
    });

    expect(result.success).toBe(true);
    expect(result.package.getManifest()).toMatchObject({
      id: 'soc-desktop',
      name: 'SOC Desktop Build',
      version: '2.0.0',
      executableName: 'soc-desktop',
      platforms: ['macos', 'windows'],
      files: ['bin/soc', 'assets/'],
    });
    expect(result.package.getManifest().settings).toMatchObject({
      packager: 'CYRE Desktop Packager',
      environment: 'production',
    });
  });

  it('creates a package manifest directly', () => {
    const packager = new DesktopPackager();
    const manifest = packager.packageManifest({
      id: 'manifest-desktop',
      name: 'Manifest Desktop',
      version: '1.0.0',
      executableName: 'manifest-desktop',
      files: ['app'],
    });

    expect(manifest.id).toBe('manifest-desktop');
    expect(manifest.executableName).toBe('manifest-desktop');
    expect(manifest.checksum).toMatch(/^fnv1a-/);
    expect(manifest.sizeBytes).toBeGreaterThan(0);
  });

  it('accepts a desktop build profile', () => {
    const packager = new DesktopPackager();
    const profile = new BuildProfile({
      id: 'desktop-production',
      name: 'Desktop Production',
      target: 'desktop',
      flavor: 'production',
    });

    const result = packager.package({
      id: 'profile-desktop',
      name: 'Profile Desktop',
      version: '1.0.0',
      executableName: 'profile-desktop',
      profile,
    });

    expect(result.profileId).toBe('desktop-production');
    expect(result.package.getManifest().settings).toMatchObject({
      profileId: 'desktop-production',
    });
  });

  it('rejects non-desktop build profile', () => {
    const packager = new DesktopPackager();
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
        executableName: 'x',
        profile,
      }),
    ).toThrow(/targeting "desktop"/);
  });

  it('validates packager and input', () => {
    const packager = new DesktopPackager();
    expect(() => packager.validate()).not.toThrow();
    expect(
      () => packager.package({
        id: '',
        name: 'x',
        version: '1',
        executableName: 'x',
      }),
    ).toThrow(/id/);
    expect(
      () => packager.package({
        id: 'x',
        name: 'x',
        version: '1',
        executableName: '',
      }),
    ).toThrow(/executableName/);
    expect(
      () => packager.package({
        id: 'x',
        name: 'x',
        version: '1',
        executableName: 'x',
        files: ['a', 'a'],
      }),
    ).toThrow(/duplicated/);
  });
});
