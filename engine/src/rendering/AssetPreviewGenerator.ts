import { AssetDescriptor } from './AssetDescriptor.js';
import { AssetManager } from './AssetManager.js';
import { AssetPreview } from './AssetPreview.js';
import type { AssetPreviewKind } from './AssetPreview.js';
import { isAssetType, type AssetType } from './AssetTypes.js';

function pickKnownKeys(
  metadata: Record<string, unknown> | undefined,
  keys: string[],
): Record<string, unknown> {
  if (metadata === undefined) return {};
  const result: Record<string, unknown> = {};
  for (const key of keys) {
    if (metadata[key] !== undefined) {
      result[key] = metadata[key];
    }
  }
  return result;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function createBasePreview(
  descriptor: AssetDescriptor,
  kind: AssetPreviewKind,
  title: string,
): AssetPreview {
  return new AssetPreview({
    id: `preview-${descriptor.id}`,
    assetId: descriptor.id,
    kind,
    title,
    mimeType: descriptor.mimeType,
  });
}

const METADATA_KEYS_BY_TYPE: Partial<Record<AssetType, string[]>> = {
  image: ['width', 'height', 'colorSpace', 'format', 'encoding'],
  model: ['geometryType', 'vertexCount', 'triangleCount', 'format'],
  texture: ['width', 'height', 'format', 'compression'],
  audio: ['duration', 'sampleRate', 'channels', 'codec'],
  font: ['family', 'weight', 'style', 'format'],
  data: ['schema', 'rowCount', 'encoding'],
  scenario: ['organizationSize', 'attackPath', 'objectives', 'difficulty'],
  other: ['description'],
};

const PREVIEW_TITLE_BY_TYPE: Record<AssetType, string> = {
  image: 'Image Preview',
  model: 'Model Preview',
  texture: 'Texture Preview',
  audio: 'Audio Preview',
  font: 'Font Preview',
  data: 'Data Preview',
  scenario: 'Scenario Preview',
  other: 'Asset Preview',
};

export class AssetPreviewGenerator {
  private readonly manager: AssetManager;

  constructor(manager: AssetManager) {
    this.manager = manager;
  }

  preview(assetId: string): AssetPreview {
    if (!assetId || assetId.trim() === '') {
      throw new Error('Asset id is required.');
    }

    const descriptor = this.manager.get(assetId);
    if (descriptor === undefined) {
      throw new Error(`Asset "${assetId}" does not exist.`);
    }

    const base = createBasePreview(
      descriptor,
      this.getPreviewKindForType(descriptor.type),
      PREVIEW_TITLE_BY_TYPE[descriptor.type],
    );

    const knownData = pickKnownKeys(
      descriptor.metadata,
      METADATA_KEYS_BY_TYPE[descriptor.type] ?? [],
    );

    const fallbackData: Record<string, unknown> =
      descriptor.metadata !== undefined
        ? {
            type: descriptor.type,
            sourcePath: descriptor.path ?? null,
            sourceUri: descriptor.uri ?? null,
            version: descriptor.version ?? null,
            tags: [...descriptor.tags],
            ...knownData,
          }
        : {
            type: descriptor.type,
            sourcePath: descriptor.path ?? null,
            sourceUri: descriptor.uri ?? null,
            version: descriptor.version ?? null,
            tags: [...descriptor.tags],
          };

    const warnings: string[] = [];
    if (Object.keys(knownData).length === 0) {
      warnings.push(
        'No specialized preview metadata found for this asset. Using generic metadata preview.',
      );
    }

    const data =
      descriptor.type === 'data' && descriptor.metadata !== undefined
        ? isRecord(descriptor.metadata) && typeof descriptor.metadata.value === 'object'
          ? (descriptor.metadata.value as Record<string, unknown>)
          : fallbackData
        : fallbackData;

    return new AssetPreview({
      id: base.id,
      assetId: base.assetId,
      kind: base.kind,
      title: base.title,
      mimeType: base.mimeType,
      data,
      warnings,
    });
  }

  previewAll(): AssetPreview[] {
    return this.manager.list().map((asset) => this.preview(asset.id));
  }

  getPreviewKindForType(type: AssetType): AssetPreviewKind {
    if (!isAssetType(type)) {
      throw new Error(`Invalid asset type "${type}".`);
    }
    if (type === 'data') return 'json';
    if (type === 'scenario') return 'metadata';
    if (type === 'other') return 'metadata';
    return 'metadata';
  }

  listSupportedTypes(): AssetType[] {
    return this.manager
      .list()
      .map((asset) => asset.type)
      .filter((type, index, array) => array.indexOf(type) === index)
      .sort();
  }

  validate(): void {
    this.manager.validate();
  }
}
