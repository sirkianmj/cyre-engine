import type { AssetType } from './AssetTypes.js';
import type { AssetContent } from './AssetImportUtils.js';
import { isAssetType } from './AssetTypes.js';

export interface AssetImportRequestOptions {
  id: string;
  name: string;
  type: AssetType;
  content?: AssetContent;
  sourcePath?: string;
  uri?: string;
  mimeType?: string;
  version?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function contentToJSON(content: AssetContent | undefined): unknown {
  if (content === undefined) return undefined;
  if (typeof content === 'string') return content;
  return { __type: 'bytes', data: Array.from(content) };
}

function contentFromJSON(value: unknown): AssetContent | undefined {
  if (typeof value === 'string') return value;
  if (
    isRecord(value) &&
    value.__type === 'bytes' &&
    Array.isArray(value.data) &&
    value.data.every((entry) => typeof entry === 'number')
  ) {
    return Uint8Array.from(value.data as number[]);
  }
  return undefined;
}

export class AssetImportRequest {
  readonly id: string;
  readonly name: string;
  readonly type: AssetType;
  readonly content?: AssetContent;
  readonly sourcePath?: string;
  readonly uri?: string;
  readonly mimeType?: string;
  readonly version?: string;
  readonly tags: readonly string[];
  readonly metadata?: Record<string, unknown>;

  constructor(options: AssetImportRequestOptions) {
    if (!options.id || options.id.trim() === '') {
      throw new Error('AssetImportRequest id is required.');
    }
    if (!options.name || options.name.trim() === '') {
      throw new Error('AssetImportRequest name is required.');
    }
    if (!isAssetType(options.type)) {
      throw new Error(`Invalid asset type "${options.type}".`);
    }
    if (options.sourcePath !== undefined && options.sourcePath.trim() === '') {
      throw new Error('AssetImportRequest sourcePath cannot be empty if provided.');
    }
    if (options.uri !== undefined && options.uri.trim() === '') {
      throw new Error('AssetImportRequest uri cannot be empty if provided.');
    }
    if (options.mimeType !== undefined && options.mimeType.trim() === '') {
      throw new Error('AssetImportRequest mimeType cannot be empty if provided.');
    }
    if (options.version !== undefined && options.version.trim() === '') {
      throw new Error('AssetImportRequest version cannot be empty if provided.');
    }
    if (options.tags !== undefined) {
      if (!Array.isArray(options.tags)) {
        throw new Error('AssetImportRequest tags must be an array.');
      }
      for (const tag of options.tags) {
        if (typeof tag !== 'string' || tag.trim() === '') {
          throw new Error('AssetImportRequest tags must be non-empty strings.');
        }
      }
    }
    if (options.metadata !== undefined && !isRecord(options.metadata)) {
      throw new Error('AssetImportRequest metadata must be an object if provided.');
    }

    this.id = options.id;
    this.name = options.name;
    this.type = options.type;
    this.content = options.content instanceof Uint8Array
      ? options.content.slice()
      : options.content;
    this.sourcePath = options.sourcePath;
    this.uri = options.uri;
    this.mimeType = options.mimeType;
    this.version = options.version;
    this.tags = Object.freeze([...(options.tags ?? [])]);
    this.metadata = options.metadata !== undefined
      ? JSON.parse(JSON.stringify(options.metadata))
      : undefined;
  }

  getContentSizeBytes(): number {
    if (this.content === undefined) return 0;
    if (typeof this.content === 'string') {
      return new TextEncoder().encode(this.content).byteLength;
    }
    return this.content.byteLength;
  }

  getContentAsUint8Array(): Uint8Array {
    if (this.content === undefined) return new Uint8Array(0);
    if (typeof this.content === 'string') return new TextEncoder().encode(this.content);
    return this.content.slice();
  }

  validate(): void {
    if (!this.id || this.id.trim() === '') {
      throw new Error('AssetImportRequest id is required.');
    }
    if (!this.name || this.name.trim() === '') {
      throw new Error('AssetImportRequest name is required.');
    }
    if (!isAssetType(this.type)) {
      throw new Error(`Invalid asset type "${this.type}".`);
    }
    if (this.sourcePath !== undefined && this.sourcePath.trim() === '') {
      throw new Error('AssetImportRequest sourcePath cannot be empty if provided.');
    }
    if (this.uri !== undefined && this.uri.trim() === '') {
      throw new Error('AssetImportRequest uri cannot be empty if provided.');
    }
    if (this.mimeType !== undefined && this.mimeType.trim() === '') {
      throw new Error('AssetImportRequest mimeType cannot be empty if provided.');
    }
    if (this.version !== undefined && this.version.trim() === '') {
      throw new Error('AssetImportRequest version cannot be empty if provided.');
    }
  }

  clone(): AssetImportRequest {
    return AssetImportRequest.fromJSON(this.toJSON());
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      content: contentToJSON(this.content),
      sourcePath: this.sourcePath,
      uri: this.uri,
      mimeType: this.mimeType,
      version: this.version,
      tags: [...this.tags],
      metadata: this.metadata !== undefined
        ? JSON.parse(JSON.stringify(this.metadata))
        : undefined,
    };
  }

  static fromJSON(data: Record<string, unknown>): AssetImportRequest {
    return new AssetImportRequest({
      id: typeof data.id === 'string' ? data.id : '',
      name: typeof data.name === 'string' ? data.name : '',
      type: typeof data.type === 'string' ? (data.type as AssetType) : 'other',
      content: contentFromJSON(data.content),
      sourcePath: typeof data.sourcePath === 'string' ? data.sourcePath : undefined,
      uri: typeof data.uri === 'string' ? data.uri : undefined,
      mimeType: typeof data.mimeType === 'string' ? data.mimeType : undefined,
      version: typeof data.version === 'string' ? data.version : undefined,
      tags: Array.isArray(data.tags) ? (data.tags as string[]) : undefined,
      metadata: isRecord(data.metadata) ? data.metadata : undefined,
    });
  }
}
