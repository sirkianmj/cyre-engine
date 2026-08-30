import { AssetImportRequest } from './AssetImportRequest.js';
import { AssetImportResult } from './AssetImportResult.js';
import { computeContentChecksum } from './AssetImportUtils.js';

export function createAssetImportCacheKey(
  request: AssetImportRequest,
  checksum = computeContentChecksum(request.content),
): string {
  return [
    request.id,
    request.sourcePath ?? '',
    request.version ?? '',
    request.mimeType ?? '',
    checksum,
  ].join('|');
}

export class AssetImportCache {
  private entries: Map<string, AssetImportResult> = new Map();

  has(key: string): boolean {
    return this.entries.has(key);
  }

  get(key: string): AssetImportResult | undefined {
    const result = this.entries.get(key);
    return result !== undefined ? result.clone() : undefined;
  }

  set(key: string, result: AssetImportResult): void {
    result.validate();
    this.entries.set(key, result.clone());
  }

  delete(key: string): boolean {
    return this.entries.delete(key);
  }

  clear(): void {
    this.entries.clear();
  }

  size(): number {
    return this.entries.size;
  }

  list(): AssetImportResult[] {
    return Array.from(this.entries.values()).map((result) => result.clone());
  }
}
