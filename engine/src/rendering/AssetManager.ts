import { AssetDescriptor, type AssetDescriptorOptions } from './AssetDescriptor.js';
import { isAssetType, type AssetType } from './AssetTypes.js';

export interface AssetUpdatePatch {
  name?: string;
  uri?: string;
  path?: string;
  mimeType?: string;
  version?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

function createPatchedDescriptor(
  asset: AssetDescriptor,
  patch: AssetUpdatePatch,
): AssetDescriptor {
  return new AssetDescriptor({
    id: asset.id,
    name: patch.name !== undefined ? patch.name : asset.name,
    type: asset.type,
    uri: patch.uri !== undefined ? patch.uri : asset.uri,
    path: patch.path !== undefined ? patch.path : asset.path,
    mimeType: patch.mimeType !== undefined ? patch.mimeType : asset.mimeType,
    version: patch.version !== undefined ? patch.version : asset.version,
    tags: patch.tags !== undefined ? patch.tags : [...asset.tags],
    metadata: patch.metadata !== undefined ? patch.metadata : asset.metadata,
  } satisfies AssetDescriptorOptions);
}

export class AssetManager {
  private assets: Map<string, AssetDescriptor> = new Map();

  register(asset: AssetDescriptor): void {
    asset.validate();
    if (this.assets.has(asset.id)) {
      throw new Error(`Asset "${asset.id}" already exists.`);
    }
    this.assets.set(asset.id, asset.clone());
  }

  unregister(id: string): void {
    if (!this.assets.delete(id)) {
      throw new Error(`Asset "${id}" does not exist.`);
    }
  }

  has(id: string): boolean {
    return this.assets.has(id);
  }

  get(id: string): AssetDescriptor | undefined {
    const asset = this.assets.get(id);
    return asset !== undefined ? asset.clone() : undefined;
  }

  list(): AssetDescriptor[] {
    return Array.from(this.assets.values()).map((asset) => asset.clone());
  }

  listByType(type: AssetType): AssetDescriptor[] {
    if (!isAssetType(type)) {
      throw new Error(`Invalid asset type "${type}".`);
    }
    return this.list().filter((asset) => asset.type === type);
  }

  listByTag(tag: string): AssetDescriptor[] {
    if (!tag || tag.trim() === '') {
      throw new Error('Asset tag must be a non-empty string.');
    }
    return this.list().filter((asset) => asset.tags.includes(tag));
  }

  update(id: string, patch: AssetUpdatePatch): void {
    const current = this.assets.get(id);
    if (current === undefined) {
      throw new Error(`Asset "${id}" does not exist.`);
    }
    const updated = createPatchedDescriptor(current, patch);
    updated.validate();
    this.assets.set(id, updated);
  }

  addTag(id: string, tag: string): void {
    if (!tag || tag.trim() === '') {
      throw new Error('Asset tag must be a non-empty string.');
    }
    const current = this.assets.get(id);
    if (current === undefined) {
      throw new Error(`Asset "${id}" does not exist.`);
    }
    if (current.tags.includes(tag)) {
      throw new Error(`Asset "${id}" already has tag "${tag}".`);
    }
    this.assets.set(id, createPatchedDescriptor(current, { tags: [...current.tags, tag] }));
  }

  removeTag(id: string, tag: string): void {
    const current = this.assets.get(id);
    if (current === undefined) {
      throw new Error(`Asset "${id}" does not exist.`);
    }
    if (!current.tags.includes(tag)) {
      throw new Error(`Asset "${id}" does not have tag "${tag}".`);
    }
    this.assets.set(id, createPatchedDescriptor(current, {
      tags: current.tags.filter((entry) => entry !== tag),
    }));
  }

  setMetadata(id: string, metadata: Record<string, unknown>): void {
    const current = this.assets.get(id);
    if (current === undefined) {
      throw new Error(`Asset "${id}" does not exist.`);
    }
    this.assets.set(id, createPatchedDescriptor(current, { metadata }));
  }

  validate(): void {
    for (const asset of this.assets.values()) {
      asset.validate();
    }
  }

  clone(): AssetManager {
    return AssetManager.fromJSON(this.toJSON());
  }

  toJSON(): Record<string, unknown> {
    return {
      assets: this.list().map((asset) => asset.toJSON()),
    };
  }

  static fromJSON(data: Record<string, unknown>): AssetManager {
    const manager = new AssetManager();
    const rawAssets = Array.isArray(data.assets)
      ? (data.assets as Record<string, unknown>[])
      : [];
    for (const rawAsset of rawAssets) {
      manager.register(AssetDescriptor.fromJSON(rawAsset));
    }
    return manager;
  }
}
