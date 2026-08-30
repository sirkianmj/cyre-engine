import {
  isRecord,
  normalizeFiles,
  normalizePlatforms,
  validateMobilePackageOptions,
} from './MobilePackageUtils.js';
import type {
  MobilePackageManifest,
  MobilePackageOptions,
  MobilePlatform,
} from './MobilePackageTypes.js';

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export class MobilePackage {
  private readonly manifest: MobilePackageManifest;

  constructor(options: MobilePackageOptions) {
    validateMobilePackageOptions(options);

    const platforms = normalizePlatforms(options.platforms);
    const files = normalizeFiles(options.files);
    const settings = options.settings !== undefined
      ? deepClone(options.settings)
      : {};

    const generatedAt = options.generatedAt ?? Date.now();
    const payload = JSON.stringify({
      id: options.id,
      name: options.name,
      version: options.version,
      bundleId: options.bundleId,
      description: options.description,
      platforms,
      files,
      settings,
    });

    this.manifest = {
      id: options.id,
      name: options.name,
      version: options.version,
      description: options.description,
      bundleId: options.bundleId,
      platforms: Object.freeze([...platforms]),
      files: Object.freeze([...files]),
      settings,
      generatedAt,
      checksum: MobilePackage.computeChecksum(payload),
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

  getBundleId(): string {
    return this.manifest.bundleId;
  }

  getManifest(): Readonly<MobilePackageManifest> {
    return {
      ...this.manifest,
      platforms: [...this.manifest.platforms],
      files: [...this.manifest.files],
      settings: deepClone(this.manifest.settings),
    };
  }

  validate(): void {
    validateMobilePackageOptions({
      id: this.manifest.id,
      name: this.manifest.name,
      version: this.manifest.version,
      bundleId: this.manifest.bundleId,
      description: this.manifest.description,
      platforms: [...this.manifest.platforms],
      files: [...this.manifest.files],
      settings: this.manifest.settings,
      generatedAt: this.manifest.generatedAt,
    });
  }

  clone(): MobilePackage {
    return MobilePackage.fromJSON(this.toJSON());
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.manifest.id,
      name: this.manifest.name,
      version: this.manifest.version,
      description: this.manifest.description,
      bundleId: this.manifest.bundleId,
      platforms: [...this.manifest.platforms],
      files: [...this.manifest.files],
      settings: deepClone(this.manifest.settings),
      generatedAt: this.manifest.generatedAt,
      checksum: this.manifest.checksum,
      sizeBytes: this.manifest.sizeBytes,
    };
  }

  static fromJSON(data: Record<string, unknown>): MobilePackage {
    if (!isRecord(data)) {
      throw new Error('MobilePackage JSON data must be an object.');
    }

    const platforms = Array.isArray(data.platforms)
      ? (data.platforms as unknown[]).map((entry) => entry as MobilePlatform)
      : undefined;
    const files = Array.isArray(data.files)
      ? (data.files as unknown[]).map((entry) => String(entry))
      : undefined;

    return new MobilePackage({
      id: typeof data.id === 'string' ? data.id : '',
      name: typeof data.name === 'string' ? data.name : '',
      version: typeof data.version === 'string' ? data.version : '',
      description: typeof data.description === 'string' ? data.description : undefined,
      bundleId: typeof data.bundleId === 'string' ? data.bundleId : '',
      platforms,
      files,
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
