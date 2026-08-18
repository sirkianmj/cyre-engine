import fs from 'fs';
import path from 'path';

const root = path.resolve(process.cwd(), 'src');

const allowedDependencies = {
  core: [],
  cyber: ['core'],
  game: ['cyber', 'scenario'],
  scenario: ['core', 'cyber', 'game'],
  serialization: ['scenario'],
  project: ['serialization'],
  scene: [],
  editor: [],
  debug: ['core', 'cyber'],
  timeline: ['core'],
  replay: ['core', 'timeline'],
  testing: ['core', 'cyber', 'scenario'],
  ui: ['core'],
  automation: ['core'],
  analytics: ['core'],
  research: ['core', 'scenario', 'analytics'],
  platform: ['core', 'game', 'scenario', 'web'],
  web: ['core', 'game', 'scenario'],
  rendering: [],
  simulation: [],
  shared: [],
  publicApi: [
    'core',
    'cyber',
    'game',
    'scenario',
    'serialization',
    'project',
    'scene',
    'editor',
    'debug',
    'timeline',
    'replay',
    'analytics',
    'automation',
    'research',
    'platform',
    'ui',
  ],
};

function getDirectories(srcDir) {
  return fs.readdirSync(srcDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

function getTypeScriptFiles(dir) {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__') continue;
      results = results.concat(getTypeScriptFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
      results.push(fullPath);
    }
  }
  return results;
}

function extractRelativeImports(fileContent) {
  const importRegex = /from\s+['"](\.[^'"]+)['"]/g;
  const dynamicImportRegex = /import\s*\(\s*['"](\.[^'"]+)['"]\s*\)/g;
  const imports = [];
  let match;
  while ((match = importRegex.exec(fileContent)) !== null) {
    imports.push(match[1]);
  }
  while ((match = dynamicImportRegex.exec(fileContent)) !== null) {
    imports.push(match[1]);
  }
  return imports;
}

const moduleDirs = getDirectories(root);
const files = getTypeScriptFiles(root);

const crossModuleImports = new Map();
const violations = [];

for (const file of files) {
  const relativePath = path.relative(root, file);

  if (relativePath === 'index.ts') continue;

  const fileModule = relativePath.split(path.sep)[0];
  const content = fs.readFileSync(file, 'utf8');
  const imports = extractRelativeImports(content);

  for (const imp of imports) {
    if (!imp.startsWith('.')) continue;
    const resolvedPath = path.resolve(path.dirname(file), imp);
    const relativeToRoot = path.relative(root, resolvedPath);
    if (relativeToRoot.startsWith('..')) continue;
    const targetModule = relativeToRoot.split(path.sep)[0];
    if (targetModule === fileModule) continue;

    if (!crossModuleImports.has(fileModule)) {
      crossModuleImports.set(fileModule, new Set());
    }
    crossModuleImports.get(fileModule).add(targetModule);

    const targetFile = path.basename(relativeToRoot);

    if (targetFile !== 'index.ts' && targetFile !== 'index.js') {
      violations.push(
        `${relativePath} imports ${imp}; cross-module import must use public index`,
      );
      continue;
    }

    const allowedTargets = allowedDependencies[fileModule] ?? [];
    if (!allowedTargets.includes(targetModule)) {
      violations.push(
        `Architecture boundary violation: ${fileModule} must not depend on ${targetModule}`,
      );
    }
  }
}

console.log('CYRE Architecture Import Report\n');
console.log('Source modules:', moduleDirs.sort().join(', '), '\n');
console.log('Cross-module imports:\n');

const sortedModules = [...crossModuleImports.keys()].sort();
for (const module of sortedModules) {
  const targets = [...crossModuleImports.get(module)].sort();
  console.log(`${module} -> ${targets.join(', ')}`);
}

if (crossModuleImports.size === 0) {
  console.log('No cross-module imports found.');
}

if (violations.length > 0) {
  console.log('\nArchitecture violations found:\n');
  for (const violation of violations) {
    console.log(`- ${violation}`);
  }
  process.exitCode = 1;
} else {
  console.log('\nNo architecture violations found.');
}
