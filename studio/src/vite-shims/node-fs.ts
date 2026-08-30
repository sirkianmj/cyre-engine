export function readFileSync(): never {
  throw new Error('node:fs readFileSync is not available in the browser');
}

export function existsSync(): never {
  throw new Error('node:fs existsSync is not available in the browser');
}

export default { readFileSync, existsSync };
