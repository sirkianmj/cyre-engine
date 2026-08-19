export type AssetContent = string | Uint8Array;

export function computeContentChecksum(content: AssetContent | undefined): string {
  const bytes = content === undefined
    ? new Uint8Array(0)
    : typeof content === 'string'
      ? new TextEncoder().encode(content)
      : content;

  let hash = 2166136261 >>> 0;
  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, 16777619) >>> 0;
  }

  return `fnv1a-${hash.toString(16).padStart(8, '0')}`;
}

export function uniqueTags(tags: string[]): string[] {
  return Array.from(new Set(tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0)));
}

export function inferFileExtension(path?: string): string | undefined {
  if (!path || path.trim() === '') return undefined;
  const normalized = path.trim();
  const lastSlash = Math.max(normalized.lastIndexOf('/'), normalized.lastIndexOf('\\'));
  const lastSegment = normalized.slice(lastSlash + 1);
  const lastDot = lastSegment.lastIndexOf('.');
  if (lastDot < 0) return undefined;
  return lastSegment.slice(lastDot + 1).toLowerCase();
}
