export function join(): never {
  throw new Error('node:path join is not available in the browser');
}

export default { join };
