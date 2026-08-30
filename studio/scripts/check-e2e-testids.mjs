/**
 * check-e2e-testids
 * ------------------
 * Cross-checks every `data-testid` the Playwright specs address against the
 * ids the application actually renders, so a spec can never silently point at
 * a control that no longer exists.
 *
 * Usage: node scripts/check-e2e-testids.mjs
 */

import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd());

function collect(dir, filter, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collect(full, filter, out);
    else if (filter(entry.name)) out.push(full);
  }
  return out;
}

const specs = collect(path.join(root, 'e2e'), (name) => name.endsWith('.spec.ts'));
const sources = collect(path.join(root, 'src'), (name) => name.endsWith('.tsx'));

const specText = specs.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
const sourceText = sources.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
const menuText = fs.readFileSync(path.join(root, 'src/shell/menuModel.ts'), 'utf8');
const catalogText = fs.readFileSync(path.join(root, 'src/shell/windowCatalog.ts'), 'utf8');

const referenced = [...new Set([...specText.matchAll(/getByTestId\('([^']+)'\)/g)].map((m) => m[1]))];

const menuItemIds = new Set([...menuText.matchAll(/\bid: '([^']+)'/g)].map((m) => m[1]));

// `windowToggleItem(menuId, kind)` synthesises ids of the form `menu.<menuId>.<kind>`;
// they never appear as literals, so derive them from the call sites.
for (const match of menuText.matchAll(/windowToggleItem\('(\w+)',\s*'(\w[\w-]*)'/g)) {
  menuItemIds.add(`menu.${match[1]}.${match[2]}`);
}

// The Window menu maps over the whole catalog, so the kind is not a literal:
// `...WINDOW_DEFINITIONS.map((d) => windowToggleItem('window', d.kind))`.
const windowKindsForMap = [...catalogText.matchAll(/^    kind: '([a-z0-9-]+)'/gm)].map((m) => m[1]);
for (const match of menuText.matchAll(/windowToggleItem\('(\w+)',\s*(?:definition|d|entry)\.kind\)/g)) {
  for (const kind of windowKindsForMap) menuItemIds.add(`menu.${match[1]}.${kind}`);
}

// Test ids built from template literals, e.g. `data-testid={\`toast-${type}\`}`.
// Record the literal prefix so a concrete id such as `toast-success` resolves.
const dynamicPrefixes = new Set(
  [...sourceText.matchAll(/data-testid=\{\s*`([^`$]*)\$\{/g)].map((m) => m[1]),
);
const topLevelMenus = new Set(
  [...menuText.matchAll(/^  \{\n    id: '([a-z]+)',\n    label:/gm)].map((m) => m[1]),
);
const windowKinds = new Set(
  [...catalogText.matchAll(/^    kind: '([a-z0-9-]+)'/gm)].map((m) => m[1]),
);

function resolves(id) {
  // Menu bar triggers and rows.
  if (id.startsWith('menu-item-')) return menuItemIds.has(id.slice('menu-item-'.length));
  if (id.startsWith('menu-')) {
    const rest = id.slice('menu-'.length);
    return topLevelMenus.has(rest) || menuItemIds.has(rest);
  }

  // The minimized-window tray chips.
  if (id.startsWith('window-tray-')) return windowKinds.has(id.slice('window-tray-'.length));

  // Window chrome: window-<kind>, window-<control>-<kind>, window-resize-<kind>-<edge>.
  if (id.startsWith('window-')) {
    const rest = id.slice('window-'.length);
    if (rest === 'tray') return true;
    if (windowKinds.has(rest)) return true;

    const control = rest.match(/^(close|minimize|maximize)-(.+)$/);
    if (control && windowKinds.has(control[2])) return true;

    const resize = rest.match(/^resize-(.+)-(n|s|e|w|ne|nw|se|sw)$/);
    if (resize && windowKinds.has(resize[1])) return true;

    return false;
  }

  // Literally rendered ids.
  if (sourceText.includes(`"${id}"`) || sourceText.includes(`'${id}'`)) return true;

  // Ids composed at render time from a template literal.
  for (const prefix of dynamicPrefixes) {
    if (prefix.length > 0 && id.startsWith(prefix)) return true;
  }

  return false;
}

const unresolved = referenced.filter((id) => !resolves(id));

console.log(`Scanned ${specs.length} spec files, ${sources.length} components.`);
console.log(`E2E test ids referenced: ${referenced.length}`);

if (unresolved.length > 0) {
  console.log(`\nUNRESOLVED (${unresolved.length}):`);
  for (const id of unresolved) console.log(`  - ${id}`);
  process.exitCode = 1;
} else {
  console.log('All E2E test ids resolve to rendered controls.');
}
