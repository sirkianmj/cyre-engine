import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const engineRoot = path.resolve(testDir, '../../..');
const scriptPath = path.join(engineRoot, 'scripts', 'audit-placeholders.mjs');

describe('placeholder audit', () => {
  it('reports no placeholder violations', () => {
    const output = execFileSync('node', [scriptPath], {
      cwd: engineRoot,
      encoding: 'utf8',
      stdio: 'pipe',
    });

    expect(output).toContain('No placeholder violations found.');
  });
});
