/**
 * Packaging configuration and script tests.
 *
 * These assert that the native packaging projects are real, internally
 * consistent, and point at the actual Studio build output — and that the
 * packaging scripts fail loudly when a toolchain is absent instead of
 * reporting a bundle that was never produced.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const here = path.dirname(fileURLToPath(import.meta.url));
// This file lives in studio/src/packaging; the project root is two levels up.
const studioRoot = path.resolve(here, '..', '..');
const repoRoot = path.resolve(studioRoot, '..');

const tauriDir = path.join(studioRoot, 'desktop', 'src-tauri');
const mobileDir = path.join(studioRoot, 'mobile');

function readJson(file: string): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, unknown>;
}

function runScript(script: string, args: string[]): { status: number; output: string } {
  const result = (() => {
    try {
      const output = execFileSync('node', [path.join(studioRoot, 'scripts', script), ...args], {
        cwd: repoRoot,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      return { status: 0, output };
    } catch (error) {
      const failure = error as { status?: number; stdout?: string; stderr?: string };
      return {
        status: failure.status ?? 1,
        output: `${failure.stdout ?? ''}${failure.stderr ?? ''}`,
      };
    }
  })();
  return result;
}

describe('Tauri desktop project', () => {
  const config = readJson(path.join(tauriDir, 'tauri.conf.json'));

  it('declares a v2 config with a valid reverse-domain identifier', () => {
    expect(config.$schema).toBe('https://schema.tauri.app/config/2');
    expect(config.identifier).toBe('com.forgex4.cyre.studio');
    expect(config.productName).toBe('CYRE Studio');
  });

  it('points at the real Studio build output', () => {
    const build = config.build as { frontendDist: string; beforeBuildCommand: string };
    expect(build.frontendDist).toBe('../../dist');

    const resolved = path.resolve(tauriDir, build.frontendDist);
    expect(resolved).toBe(path.join(studioRoot, 'dist'));
    expect(build.beforeBuildCommand).toContain('--filter @cyre/studio build');
  });

  it('requests real bundle targets and sets a CSP', () => {
    const bundle = config.bundle as { active: boolean; targets: string[] };
    expect(bundle.active).toBe(true);
    expect(bundle.targets).toEqual(expect.arrayContaining(['app', 'deb', 'appimage']));

    const security = (config.app as { security: { csp: string } }).security;
    expect(security.csp).toContain("default-src 'self'");
  });

  it('ships the Rust sources the bundle is compiled from', () => {
    for (const file of ['Cargo.toml', 'build.rs', 'src/main.rs', 'src/lib.rs']) {
      expect(fs.existsSync(path.join(tauriDir, file)), `missing ${file}`).toBe(true);
    }

    const cargo = fs.readFileSync(path.join(tauriDir, 'Cargo.toml'), 'utf8');
    expect(cargo).toContain('tauri = { version = "2"');
    expect(cargo).toContain('tauri-build');

    const lib = fs.readFileSync(path.join(tauriDir, 'src', 'lib.rs'), 'utf8');
    expect(lib).toContain('tauri::generate_context!');
  });
});

describe('Capacitor mobile project', () => {
  const config = readJson(path.join(mobileDir, 'capacitor.config.json'));

  it('declares a valid app id and the real web directory', () => {
    expect(config.appId).toBe('com.forgex4.cyre.studio');
    expect(config.appName).toBe('CYRE Studio');
    expect(config.webDir).toBe('../dist');

    const resolved = path.resolve(mobileDir, config.webDir as string);
    expect(resolved).toBe(path.join(studioRoot, 'dist'));
  });

  it('serves over https and disables mixed content', () => {
    expect((config.server as { androidScheme: string }).androidScheme).toBe('https');
    expect((config.android as { allowMixedContent: boolean }).allowMixedContent).toBe(false);
  });

  it('declares the Capacitor toolchain and build scripts', () => {
    const pkg = readJson(path.join(mobileDir, 'package.json'));
    const deps = pkg.dependencies as Record<string, string>;
    const dev = pkg.devDependencies as Record<string, string>;

    expect(deps['@capacitor/core']).toBeDefined();
    expect(deps['@capacitor/android']).toBeDefined();
    expect(dev['@capacitor/cli']).toBeDefined();

    const scripts = pkg.scripts as Record<string, string>;
    expect(scripts['add:android']).toContain('capacitor add android');
    expect(scripts['build:android']).toContain('gradlew assembleDebug');
  });
});

describe('packaging scripts', () => {
  it('validates the web artifact and writes a manifest', () => {
    // Build once so dist/ exists, then validate without rebuilding.
    execFileSync('pnpm', ['--filter', '@cyre/studio', 'build'], {
      cwd: repoRoot,
      stdio: 'ignore',
    });

    const result = runScript('package-web.mjs', ['--skip-build']);
    expect(result.status).toBe(0);
    expect(result.output).toContain('Web artifact validated');

    const manifestPath = path.join(studioRoot, 'dist', 'cyre-web-artifact.json');
    expect(fs.existsSync(manifestPath)).toBe(true);

    const manifest = readJson(manifestPath) as {
      artifact: string;
      entrypoint: string;
      fileCount: number;
      scriptCount: number;
      stylesheetCount: number;
      files: Array<{ path: string; bytes: number; sha256: string }>;
      validation: Record<string, boolean>;
    };

    expect(manifest.artifact).toBe('cyre-studio-web');
    expect(manifest.entrypoint).toBe('index.html');
    expect(manifest.fileCount).toBeGreaterThan(1);
    expect(manifest.scriptCount).toBeGreaterThan(0);
    expect(manifest.stylesheetCount).toBeGreaterThan(0);

    // Every listed file must exist, be non-empty, and carry a real digest.
    for (const entry of manifest.files) {
      const full = path.join(studioRoot, 'dist', entry.path);
      expect(fs.existsSync(full), `manifest lists missing file ${entry.path}`).toBe(true);
      expect(entry.bytes).toBeGreaterThan(0);
      expect(entry.sha256).toMatch(/^[0-9a-f]{64}$/);
    }

    expect(Object.values(manifest.validation).every(Boolean)).toBe(true);
  });

  it('fails when the build output is absent rather than reporting success', () => {
    const distDir = path.join(studioRoot, 'dist');
    const backup = path.join(studioRoot, 'dist-packaging-test-backup');

    if (!fs.existsSync(distDir)) return; // nothing to prove without a build

    fs.renameSync(distDir, backup);
    try {
      const result = runScript('package-web.mjs', ['--skip-build']);
      expect(result.status).not.toBe(0);
      expect(result.output).toMatch(/No build output directory/);
    } finally {
      fs.renameSync(backup, distDir);
    }
  });

  it('desktop script reports the missing native toolchain and exits non-zero', () => {
    const hasRust = (() => {
      try {
        execFileSync('cargo', ['--version'], { stdio: 'ignore' });
        return true;
      } catch {
        return false;
      }
    })();

    const result = runScript('package-desktop.mjs', []);

    if (hasRust) {
      // With a toolchain present the script proceeds to tauri build; either
      // outcome is acceptable, but it must never be a silent no-op.
      expect(result.output.length).toBeGreaterThan(0);
      return;
    }

    expect(result.status).not.toBe(0);
    expect(result.output).toMatch(/Native desktop toolchain is not installed/);
    expect(result.output).toMatch(/No bundle was produced/);
  });

  it('mobile script reports the missing Android toolchain and exits non-zero', () => {
    const hasJava = (() => {
      try {
        execFileSync('java', ['-version'], { stdio: 'ignore' });
        return true;
      } catch {
        return false;
      }
    })();
    const hasSdk = Boolean(process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT);

    const result = runScript('package-mobile.mjs', []);

    if (hasJava && hasSdk) {
      expect(result.output.length).toBeGreaterThan(0);
      return;
    }

    expect(result.status).not.toBe(0);
    expect(result.output).toMatch(/Android toolchain is not installed/);
    expect(result.output).toMatch(/no artifact was produced/);
  });

  it('check-only mode validates configuration without requiring a toolchain', () => {
    const desktop = runScript('package-desktop.mjs', ['--check-only']);
    const mobile = runScript('package-mobile.mjs', ['--check-only']);

    expect(desktop.status).toBe(0);
    expect(desktop.output).toContain('Tauri configuration is valid');

    expect(mobile.status).toBe(0);
    expect(mobile.output).toContain('Capacitor configuration is valid');
  });
});
