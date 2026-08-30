import { describe, it, expect } from 'vitest';
import { WebPackage } from '../WebPackage.js';
import { WebPackager } from '../WebPackager.js';
import { BuildProfile } from '../BuildProfile.js';

describe('WebPackage', () => {
  it('creates a valid web package with normalized assets', () => {
    const pkg = new WebPackage({
      id: 'cyre-web',
      name: 'CYRE Web',
      version: '1.0.0',
      entryPoint: 'index.html',
      assets: ['dist/app.js', 'dist/styles.css'],
      settings: { minify: true },
    });

    const manifest = pkg.getManifest();
    expect(manifest.id).toBe('cyre-web');
    expect(manifest.entryPoint).toBe('index.html');
    expect(manifest.assets).toEqual(['dist/app.js', 'dist/styles.css']);
    expect(manifest.checksum).toMatch(/^fnv1a-/);
    expect(manifest.sizeBytes).toBeGreaterThan(0);
    expect(() => pkg.validate()).not.toThrow();
  });

  it('trims asset strings before deduplication validation', () => {
    const pkg = new WebPackage({
      id: 'pkg',
      name: 'Package',
      version: '1.0.0',
      entryPoint: 'index.html',
      assets: [' a ', 'b'],
    });

    expect(pkg.getManifest().assets).toEqual(['a', 'b']);
  });

  it('rejects invalid package data', () => {
    expect(
      () => new WebPackage({ id: '', name: 'x', version: '1', entryPoint: 'i' }),
    ).toThrow(/id/);
    expect(
      () => new WebPackage({ id: 'x', name: '', version: '1', entryPoint: 'i' }),
    ).toThrow(/name/);
    expect(
      () => new WebPackage({ id: 'x', name: 'x', version: '', entryPoint: 'i' }),
    ).toThrow(/version/);
    expect(
      () => new WebPackage({ id: 'x', name: 'x', version: '1', entryPoint: '' }),
    ).toThrow(/entryPoint/);
    expect(
      () => new WebPackage({
        id: 'x',
        name: 'x',
        version: '1',
        entryPoint: 'i',
        assets: [''],
      }),
    ).toThrow(/non-empty/);
    expect(
      () => new WebPackage({
        id: 'x',
        name: 'x',
        version: '1',
        entryPoint: 'i',
        assets: ['a', 'a'],
      }),
    ).toThrow(/duplicated/);
  });

  it('clones with deep-copied settings and assets', () => {
    const pkg = new WebPackage({
      id: 'pkg',
      name: 'Package',
      version: '1.0.0',
      entryPoint: 'index.html',
      settings: { nested: { value: 1 } },
    });

    const clone = pkg.clone();
    clone.getManifest().settings.nested.value = 99;
    expect(pkg.getManifest().settings.nested.value).toBe(1);

    const restored = WebPackage.fromJSON(pkg.toJSON());
    expect(restored.getManifest().entryPoint).toBe('index.html');
    expect(restored.getManifest().settings).toEqual({ nested: { value: 1 } });
  });
});

describe('WebPackager', () => {
  it('packages a web build input', () => {
    const packager = new WebPackager({ now: () => 1000 });
    const result = packager.package({
      id: 'soc-web',
      name: 'SOC Web Build',
      version: '2.0.0',
      entryPoint: 'index.html',
      assets: ['game.js', 'styles.css'],
      settings: { environment: 'production' },
    });

    expect(result.success).toBe(true);
    expect(result.package.getManifest()).toMatchObject({
      id: 'soc-web',
      name: 'SOC Web Build',
      version: '2.0.0',
      entryPoint: 'index.html',
      assets: ['game.js', 'styles.css'],
    });
    expect(result.package.getManifest().settings).toMatchObject({
      packager: 'CYRE Web Packager',
      environment: 'production',
    });
  });

  it('creates a package manifest directly', () => {
    const packager = new WebPackager();
    const manifest = packager.packageManifest({
      id: 'manifest-web',
      name: 'Manifest Web',
      version: '1.0.0',
      entryPoint: 'index.html',
      assets: ['app.js'],
    });

    expect(manifest.id).toBe('manifest-web');
    expect(manifest.entryPoint).toBe('index.html');
    expect(manifest.checksum).toMatch(/^fnv1a-/);
    expect(manifest.sizeBytes).toBeGreaterThan(0);
  });

  it('accepts a web build profile', () => {
    const packager = new WebPackager();
    const profile = new BuildProfile({
      id: 'web-production',
      name: 'Web Production',
      target: 'web',
      flavor: 'production',
    });

    const result = packager.package({
      id: 'profile-web',
      name: 'Profile Web',
      version: '1.0.0',
      entryPoint: 'index.html',
      profile,
    });

    expect(result.profileId).toBe('web-production');
    expect(result.package.getManifest().settings).toMatchObject({
      profileId: 'web-production',
    });
  });

  it('rejects non-web build profile', () => {
    const packager = new WebPackager();
    const profile = new BuildProfile({
      id: 'desktop-profile',
      name: 'Desktop Profile',
      target: 'desktop',
      flavor: 'production',
    });

    expect(() =>
      packager.package({
        id: 'x',
        name: 'X',
        version: '1',
        entryPoint: 'index.html',
        profile,
      }),
    ).toThrow(/targeting "web"/);
  });

  it('validates packager and input', () => {
    const packager = new WebPackager();
    expect(() => packager.validate()).not.toThrow();
    expect(() => packager.package({ id: '', name: 'x', version: '1', entryPoint: 'i' })).toThrow(/id/);
    expect(() => packager.package({ id: 'x', name: 'x', version: '1', entryPoint: '' })).toThrow(/entryPoint/);
    expect(
      () => packager.package({
        id: 'x',
        name: 'x',
        version: '1',
        entryPoint: 'i',
        assets: ['a', 'a'],
      }),
    ).toThrow(/duplicated/);
  });
});
