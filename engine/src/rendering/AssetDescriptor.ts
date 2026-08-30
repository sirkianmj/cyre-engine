import { isAssetType, type AssetType } from './AssetTypes.js';

export interface AssetDescriptorOptions {
  id: string;
  name: string;
  type: AssetType;
  uri?: string;
  path?: string;
  mimeType?: string;
  version?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateTags(tags: string[] | undefined): void {
  if (tags === undefined) return;
  if (!Array.isArray(tags)) {
    throw new Error('Asset tags must be an array.');
  }
  const seen = new Set<string>();
  for (const tag of tags) {
    if (typeof tag !== 'string' || tag.trim() === '') {
      throw new Error('Asset tags must be non-empty strings.');
    }
    if (seen.has(tag)) {
      throw new Error(`Asset tag "${tag}" is duplicated.`);
    }
    seen.add(tag);
  }
}

export class AssetDescriptor {
  readonly id: string;
  readonly name: string;
  readonly type: AssetType;
  readonly uri?: string;
  readonly path?: string;
  readonly mimeType?: string;
  readonly version?: string;
  readonly tags: readonly string[];
  readonly metadata?: Record<string, unknown>;

  constructor(options: AssetDescriptorOptions) {
    if (!options.id || options.id.trim() === '') {
      throw new Error('Asset id is required.');
    }
    if (!options.name || options.name.trim() === '') {
      throw new Error('Asset name is required.');
    }
    if (!isAssetType(options.type)) {
      throw new Error(`Invalid asset type "${options.type}".`);
    }
    if (options.uri !== undefined && options.uri.trim() === '') {
      throw new Error('Asset uri cannot be empty if provided.');
    }
    if (options.path !== undefined && options.path.trim() === '') {
      throw new Error('Asset path cannot be empty if provided.');
    }
    if (options.mimeType !== undefined && options.mimeType.trim() === '') {
      throw new Error('Asset mimeType cannot be empty if provided.');
    }
    if (options.version !== undefined && options.version.trim() === '') {
      throw new Error('Asset version cannot be empty if provided.');
    }
    validateTags(options.tags);
    if (options.metadata !== undefined && !isRecord(options.metadata)) {
      throw new Error('Asset metadata must be an object if provided.');
    }

    this.id = options.id;
    this.name = options.name;
    this.type = options.type;
    this.uri = options.uri;
    this.path = options.path;
    this.mimeType = options.mimeType;
    this.version = options.version;
    this.tags = Object.freeze([...(options.tags ?? [])]);
    this.metadata = options.metadata !== undefined ? deepClone(options.metadata) : undefined;
  }

  validate(): void {
    if (!this.id || this.id.trim() === '') {
      throw new Error('Asset id is required.');
    }
    if (!this.name || this.name.trim() === '') {
      throw new Error('Asset name is required.');
    }
    if (!isAssetType(this.type)) {
      throw new Error(`Invalid asset type "${this.type}".`);
    }
    if (this.uri !== undefined && this.uri.trim() === '') {
      throw new Error('Asset uri cannot be empty if provided.');
    }
    if (this.path !== undefined && this.path.trim() === '') {
      throw new Error('Asset path cannot be empty if provided.');
    }
    validateTags([...this.tags]);
  }

  clone(): AssetDescriptor {
    return AssetDescriptor.fromJSON(this.toJSON());
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      uri: this.uri,
      path: this.path,
      mimeType: this.mimeType,
      version: this.version,
      tags: [...this.tags],
      metadata: this.metadata !== undefined ? deepClone(this.metadata) : undefined,
    };
  }

  static fromJSON(data: Record<string, unknown>): AssetDescriptor {
    return new AssetDescriptor({
      id: typeof data.id === 'string' ? data.id : '',
      name: typeof data.name === 'string' ? data.name : '',
      type: typeof data.type === 'string' ? (data.type as AssetType) : 'other',
      uri: typeof data.uri === 'string' ? data.uri : undefined,
      path: typeof data.path === 'string' ? data.path : undefined,
      mimeType: typeof data.mimeType === 'string' ? data.mimeType : undefined,
      version: typeof data.version === 'string' ? data.version : undefined,
      tags: Array.isArray(data.tags) ? (data.tags as string[]) : undefined,
      metadata: isRecord(data.metadata) ? data.metadata : undefined,
    });
  }
}
