import fs from 'node:fs';
import path from 'node:path';

const sourceRoot = path.resolve(process.cwd(), 'src');
const placeholderPattern = /\b(TODO|FIXME|Not implemented|not implemented|placeholder|stub|fake implementation|temporary mock)\b/;

function collectFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === 'node_modules' || entry.name === 'dist') continue;
      results.push(...collectFiles(full));
    } else if (
      (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) &&
      !entry.name.endsWith('.test.ts') &&
      !entry.name.endsWith('.test.tsx') &&
      !entry.name.endsWith('.d.ts')
    ) {
      results.push(full);
    }
  }
  return results;
}

const violations = [];
const files = collectFiles(sourceRoot);

for (const file of files) {
  const relative = path.relative(process.cwd(), file);
  const lines = fs.readFileSync(file, 'utf8').split('\n');

  lines.forEach((line, index) => {
    if (placeholderPattern.test(line)) {
      violations.push(relative + ':' + (index + 1) + ': ' + line.trim());
    }
  });
}

console.log('CYRE Placeholder Audit\n');
console.log('Scanned ' + files.length + ' source files.');

if (violations.length > 0) {
  console.log('\nPlaceholder violations found: ' + violations.length + '\n');
  for (const violation of violations) {
    console.log('- ' + violation);
  }
  process.exitCode = 1;
} else {
  console.log('\nNo placeholder violations found.');
}