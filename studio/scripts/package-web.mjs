/**
 * package-web.mjs
 * ----------------
 * Builds the Studio web bundle and validates the resulting artifact before
 * declaring success. A build that produces an empty or incomplete `dist/` is
 * a failure here, not a warning.
 *
 * Usage:
 *   node studio/scripts/package-web.mjs [--skip-build]
 *
 * Emits `studio/dist/cyre-web-artifact.json` describing the validated bundle.
 */

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const studioRoot = path.resolve(here, '..');
const repoRoot = path.resolve(studioRoot, '..');
const distDir = path.join(studioRoot, 'dist');
const manifestPath = path.join(distDir, 'cyre-web-artifact.json');

const skipBuild = process.argv.includes('--skip-build');

function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

function sha256(file) {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

/** Collects absolute file paths under `dir`. */
function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

if (!skipBuild) {
  console.log('→ Building Studio web bundle…');
  try {
    const pnpmCmd = process.platform === 'win32' ? 'pnpm' : 'pnpm';
    execFileSync(pnpmCmd, ['--filter', '@cyre/studio', 'build'], {
      cwd: repoRoot,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
  } catch {
    fail('Web build failed.');
  }
}

if (!fs.existsSync(distDir)) {
  fail(`No build output directory at ${distDir}. Run without --skip-build.`);
}

const indexHtml = path.join(distDir, 'index.html');
if (!fs.existsSync(indexHtml)) {
  fail('Build output is missing index.html.');
}

const html = fs.readFileSync(indexHtml, 'utf8');

// The HTML must actually mount the application, not be an empty shell.
if (!html.includes('<div id="root">')) {
  fail('index.html has no #root mount point.');
}

const scriptRefs = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((match) => match[1]);
if (scriptRefs.length === 0) {
  fail('index.html references no script bundle.');
}

// Relativize exactly once, and normalise to forward slashes for the manifest.
const files = walk(distDir)
  .map((file) => path.relative(distDir, file).split(path.sep).join('/'))
  .filter((file) => file !== 'cyre-web-artifact.json')
  .sort();
const assets = files.filter((file) => file.startsWith('assets/'));

if (assets.length === 0) {
  fail('Build output contains no assets/ directory.');
}

// Every referenced asset must exist and be non-empty.
const entries = [];
for (const file of files) {
  const full = path.join(distDir, file);
  const stat = fs.statSync(full);
  if (stat.size === 0) {
    fail(`Build artifact contains an empty file: ${file}`);
  }
  entries.push({ path: file, bytes: stat.size, sha256: sha256(full) });
}

// Each script the HTML points at must resolve inside dist.
for (const ref of scriptRefs) {
  const rel = ref.replace(/^\//, '');
  if (!entries.some((entry) => entry.path === rel)) {
    fail(`index.html references "${ref}" but it is not present in the build output.`);
  }
}

const jsEntries = entries.filter((entry) => entry.path.endsWith('.js'));
const cssEntries = entries.filter((entry) => entry.path.endsWith('.css'));

if (jsEntries.length === 0) fail('Build output contains no JavaScript bundle.');
if (cssEntries.length === 0) fail('Build output contains no stylesheet.');

const totalBytes = entries.reduce((sum, entry) => sum + entry.bytes, 0);

const manifest = {
  artifact: 'cyre-studio-web',
  version: JSON.parse(fs.readFileSync(path.join(studioRoot, 'package.json'), 'utf8')).version,
  builtAt: new Date().toISOString(),
  format: 'static-site',
  entrypoint: 'index.html',
  totalBytes,
  fileCount: entries.length,
  scriptCount: jsEntries.length,
  stylesheetCount: cssEntries.length,
  files: entries,
  validation: {
    indexHtmlPresent: true,
    rootMountPointPresent: true,
    allReferencedAssetsPresent: true,
    noEmptyFiles: true,
  },
};

fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`\n✔ Web artifact validated`);
console.log(`  entrypoint : index.html`);
console.log(`  files      : ${manifest.fileCount}`);
console.log(`  scripts    : ${manifest.scriptCount}`);
console.log(`  stylesheets: ${manifest.stylesheetCount}`);
console.log(`  size       : ${(totalBytes / 1024).toFixed(1)} KiB`);
console.log(`  manifest   : ${path.relative(repoRoot, manifestPath)}`);
