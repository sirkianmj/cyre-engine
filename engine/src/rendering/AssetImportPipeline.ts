import { AssetImportCache, createAssetImportCacheKey } from './AssetImportCache.js';
import { AssetImporter } from './AssetImporter.js';
import { AssetImportRequest } from './AssetImportRequest.js';
import { AssetImportResult } from './AssetImportResult.js';
import { computeContentChecksum } from './AssetImportUtils.js';

export class AssetImportPipeline {
  private importer = new AssetImporter();
  private cache = new AssetImportCache();

  importAsset(request: AssetImportRequest): AssetImportResult {
    request.validate();

    const checksum = computeContentChecksum(request.content);
    const cacheKey = createAssetImportCacheKey(request, checksum);
    const cachedResult = this.cache.get(cacheKey);
    if (cachedResult !== undefined) {
      return new AssetImportResult({
        id: cachedResult.id,
        status: 'cached',
        descriptor: cachedResult.descriptor,
        checksum: cachedResult.checksum,
        importedAt: cachedResult.importedAt,
        warnings: [...cachedResult.warnings, 'Asset retrieved from import cache.'],
        diagnostics: {
          ...(cachedResult.diagnostics ?? {}),
          cacheHit: true,
          cacheKey,
        },
      });
    }

    const importedResult = this.importer.importAsset(request);
    this.cache.set(cacheKey, importedResult);
    return importedResult;
  }

  importAll(requests: AssetImportRequest[]): AssetImportResult[] {
    if (!Array.isArray(requests)) {
      throw new Error('AssetImportPipeline importAll requires an array of requests.');
    }
    return requests.map((request) => this.importAsset(request));
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheSize(): number {
    return this.cache.size();
  }

  listCachedResults(): AssetImportResult[] {
    return this.cache.list();
  }

  validate(): void {
    for (const result of this.listCachedResults()) {
      result.validate();
    }
  }
}
