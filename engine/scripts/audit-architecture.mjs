import fs from 'fs';
import path from 'path';

const root = path.resolve(process.cwd(), 'src');

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
    const targetDir = path.dirname(relativeToRoot);
    if (targetFile !== 'index.ts' && targetFile !== 'index.js') {
      violations.push({
        file: relativePath,
        importPath: imp,
        targetModule,
        targetFile: relativeToRoot,
      });
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
  console.log('\nArchitecture violations found (cross-module import does not use public index):\n');
  for (const v of violations) {
    console.log(`${v.file} imports ${v.importPath} which targets ${v.targetFile}`);
    console.log(`  Target module: ${v.targetModule}. Use module index instead.\n`);
  }
  process.exitCode = 1;
} else {
  console.log('\nNo architecture violations found.');
}
