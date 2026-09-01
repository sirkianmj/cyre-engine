/**
 * package-desktop.mjs
 * --------------------
 * Packages CYRE Studio as a native desktop application through Tauri.
 *
 * This script does the real work: it validates the Tauri configuration, checks
 * that the required native toolchain is present, builds the web bundle the
 * shell hosts, and then invokes `tauri build`.
 *
 * When the Rust/webkit toolchain is absent the script reports exactly which
 * prerequisites are missing and exits non-zero. It never pretends a bundle was
 * produced.
 *
 * Usage:
 *   node studio/scripts/package-desktop.mjs [--check-only]
 */

import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const studioRoot = path.resolve(here, '..');
const repoRoot = path.resolve(studioRoot, '..');
const tauriDir = path.join(studioRoot, 'desktop', 'src-tauri');
const configPath = path.join(tauriDir, 'tauri.conf.json');

const checkOnly = process.argv.includes('--check-only');

function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

/* ------------------------------------------------------------ config check */

if (!fs.existsSync(configPath)) {
  fail(`No Tauri config at ${path.relative(repoRoot, configPath)}.`);
}

let config;
try {
  config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (error) {
  fail(`Tauri config is not valid JSON: ${error.message}`);
}

const required = ['productName', 'version', 'identifier', 'build', 'app', 'bundle'];
const missing = required.filter((key) => config[key] === undefined);
if (missing.length > 0) {
  fail(`Tauri config is missing required keys: ${missing.join(', ')}`);
}

if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(config.identifier)) {
  fail(`Tauri identifier "${config.identifier}" is not a valid reverse-domain id.`);
}

const frontendDist = path.resolve(tauriDir, config.build.frontendDist);
const cargoToml = path.join(tauriDir, 'Cargo.toml');
const mainRs = path.join(tauriDir, 'src', 'main.rs');

for (const required of [cargoToml, mainRs]) {
  if (!fs.existsSync(required)) {
    fail(`Tauri project is missing ${path.relative(repoRoot, required)}.`);
  }
}

console.log('✔ Tauri configuration is valid');
console.log(`  product    : ${config.productName} ${config.version}`);
console.log(`  identifier : ${config.identifier}`);
console.log(`  bundle     : ${config.bundle.targets.join(', ')}`);
console.log(`  web bundle : ${path.relative(repoRoot, frontendDist)}`);

/* --------------------------------------------------------- toolchain check */

function has(command) {
  return spawnSync(command, ['--version'], { stdio: 'ignore' }).status === 0;
}

const prerequisites = [
  { name: 'rustc', present: has('rustc') },
  { name: 'cargo', present: has('cargo') },
];

const absent = prerequisites.filter((entry) => !entry.present).map((entry) => entry.name);

if (absent.length > 0) {
  console.error(`\n✖ Native desktop toolchain is not installed: ${absent.join(', ')}`);
  console.error('  Install Rust via https://rustup.rs, plus the Tauri v2 Linux');
  console.error('  prerequisites (webkit2gtk-4.1, librsvg2) on Debian/Ubuntu:');
  console.error('    sudo apt install libwebkit2gtk-4.1-dev librsvg2-dev build-essential');
  console.error('  Then re-run: node studio/scripts/package-desktop.mjs');
  console.error('\n  No bundle was produced.\n');
  process.exit(checkOnly ? 0 : 1);
}

console.log('✔ Native toolchain present (rustc, cargo)');

if (checkOnly) {
  console.log('\n✔ Desktop packaging prerequisites satisfied (--check-only).');
  process.exit(0);
}

/* ------------------------------------------------------------------ build */

console.log('→ Building the web bundle the desktop shell hosts…');
try {
  execFileSync('node', [path.join(here, 'package-web.mjs')], {
    cwd: repoRoot,
    stdio: 'inherit',
  });
} catch {
  fail('Web bundle build failed; aborting desktop packaging.');
}

if (!fs.existsSync(path.join(frontendDist, 'index.html'))) {
  fail(`Expected the web bundle at ${path.relative(repoRoot, frontendDist)} but found no index.html.`);
}

console.log('→ Invoking tauri build…');
const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const result = spawnSync(npxCmd, ['--yes', '@tauri-apps/cli@2', 'build'], {
  cwd: tauriDir,
  stdio: 'inherit',
});

if (result.status !== 0) {
  fail('tauri build failed.');
}

const bundleDir = path.join(tauriDir, 'target', 'release', 'bundle');
if (!fs.existsSync(bundleDir)) {
  fail(`tauri build reported success but produced no bundle directory at ${path.relative(repoRoot, bundleDir)}.`);
}

const produced = [];
for (const entry of fs.readdirSync(bundleDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const dir = path.join(bundleDir, entry.name);
  for (const file of fs.readdirSync(dir)) {
    produced.push(path.relative(repoRoot, path.join(dir, file)));
  }
}

if (produced.length === 0) {
  fail('tauri build produced an empty bundle directory.');
}

console.log('\n✔ Desktop bundles produced:');
for (const entry of produced) console.log(`  ${entry}`);
