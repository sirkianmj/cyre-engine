import {
  isRecord,
  normalizeAssets,
  validatePackageOptions,
} from './WebPackageUtils.js';
import type {
  WebPackageManifest,
  WebPackageOptions,
} from './WebPackageTypes.js';

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export class WebPackage {
  private readonly manifest: WebPackageManifest;

  constructor(options: WebPackageOptions) {
    validatePackageOptions(options);

    const assets = normalizeAssets(options.assets);
    const settings = options.settings !== undefined
      ? deepClone(options.settings)
      : {};

    const generatedAt = options.generatedAt ?? Date.now();
    const payload = JSON.stringify({
      id: options.id,
      name: options.name,
      version: options.version,
      entryPoint: options.entryPoint,
      assets,
      settings,
      description: options.description,
    });

    this.manifest = {
      id: options.id,
      name: options.name,
      version: options.version,
      description: options.description,
      entryPoint: options.entryPoint,
      assets: Object.freeze([...assets]),
      settings,
      generatedAt,
      checksum: WebPackage.computeChecksum(payload),
      sizeBytes: new TextEncoder().encode(payload).byteLength,
    };
  }

  getId(): string {
    return this.manifest.id;
  }

  getName(): string {
    return this.manifest.name;
  }

  getVersion(): string {
    return this.manifest.version;
  }

  getManifest(): Readonly<WebPackageManifest> {
    return {
      ...this.manifest,
      assets: [...this.manifest.assets],
      settings: deepClone(this.manifest.settings),
    };
  }

  validate(): void {
    validatePackageOptions({
      id: this.manifest.id,
      name: this.manifest.name,
      version: this.manifest.version,
      entryPoint: this.manifest.entryPoint,
      assets: [...this.manifest.assets],
      settings: this.manifest.settings,
      description: this.manifest.description,
      generatedAt: this.manifest.generatedAt,
    });
  }

  clone(): WebPackage {
    return WebPackage.fromJSON(this.toJSON());
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.manifest.id,
      name: this.manifest.name,
      version: this.manifest.version,
      description: this.manifest.description,
      entryPoint: this.manifest.entryPoint,
      assets: [...this.manifest.assets],
      settings: deepClone(this.manifest.settings),
      generatedAt: this.manifest.generatedAt,
      checksum: this.manifest.checksum,
      sizeBytes: this.manifest.sizeBytes,
    };
  }

  static fromJSON(data: Record<string, unknown>): WebPackage {
    if (!isRecord(data)) {
      throw new Error('WebPackage JSON data must be an object.');
    }

    return new WebPackage({
      id: typeof data.id === 'string' ? data.id : '',
      name: typeof data.name === 'string' ? data.name : '',
      version: typeof data.version === 'string' ? data.version : '',
      description: typeof data.description === 'string' ? data.description : undefined,
      entryPoint: typeof data.entryPoint === 'string' ? data.entryPoint : '',
      assets: Array.isArray(data.assets) ? (data.assets as string[]) : undefined,
      settings: isRecord(data.settings) ? data.settings : undefined,
      generatedAt: typeof data.generatedAt === 'number' ? data.generatedAt : undefined,
    });
  }

  static computeChecksum(content: string): string {
    let hash = 2166136261 >>> 0;
    const bytes = new TextEncoder().encode(content);
    for (const byte of bytes) {
      hash ^= byte;
      hash = Math.imul(hash, 16777619) >>> 0;
    }
    return `fnv1a-${hash.toString(16).padStart(8, '0')}`;
  }
}
