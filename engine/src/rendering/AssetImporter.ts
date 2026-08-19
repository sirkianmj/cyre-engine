import { AssetDescriptor } from './AssetDescriptor.js';
import { AssetImportRequest } from './AssetImportRequest.js';
import { AssetImportResult } from './AssetImportResult.js';
import { resolveAssetType } from './AssetTypeResolver.js';
import { computeContentChecksum, inferFileExtension, uniqueTags } from './AssetImportUtils.js';

export class AssetImporter {
  importAsset(request: AssetImportRequest): AssetImportResult {
    request.validate();

    const resolvedType = resolveAssetType({
      requestedType: request.type,
      sourcePath: request.sourcePath,
      mimeType: request.mimeType,
    });

    const sizeBytes = request.getContentSizeBytes();
    const checksum = computeContentChecksum(request.content);
    const warnings: string[] = [];

    if (resolvedType !== request.type) {
      warnings.push(
        `Asset type "${request.type}" was resolved to "${resolvedType}" using source metadata.`,
      );
    }

    const extension = inferFileExtension(request.sourcePath);
    if (request.sourcePath !== undefined && extension === undefined) {
      warnings.push('Asset sourcePath has no usable file extension.');
    }

    const autoTags = [`type:${resolvedType}`];
    const tags = uniqueTags([...(request.tags ?? []), ...autoTags]);

    const metadata = {
      imported: true,
      importSource: {
        sizeBytes,
        checksum,
        sourcePath: request.sourcePath ?? null,
        sourceExtension: extension ?? null,
        mimeType: request.mimeType ?? null,
        encoding: typeof request.content === 'string' ? 'utf8' : 'binary',
      },
      ...(request.metadata ?? {}),
    } satisfies Record<string, unknown>;

    const descriptor = new AssetDescriptor({
      id: request.id,
      name: request.name,
      type: resolvedType,
      uri: request.uri,
      path: request.sourcePath,
      mimeType: request.mimeType,
      version: request.version,
      tags,
      metadata,
    });

    return new AssetImportResult({
      id: request.id,
      status: 'imported',
      descriptor,
      checksum,
      warnings,
      importedAt: Date.now(),
      diagnostics: {
        resolvedType,
        sizeBytes,
        sourceExtension: extension ?? null,
        tagCount: tags.length,
      },
    });
  }
}
