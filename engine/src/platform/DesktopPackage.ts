import {
  isRecord,
  normalizeFiles,
  normalizePlatforms,
  validateDesktopPackageOptions,
} from './DesktopPackageUtils.js';
import type {
  DesktopPackageManifest,
  DesktopPackageOptions,
  DesktopPlatform,
} from './DesktopPackageTypes.js';

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export class DesktopPackage {
  private readonly manifest: DesktopPackageManifest;

  constructor(options: DesktopPackageOptions) {
    validateDesktopPackageOptions(options);

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
      executableName: options.executableName,
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
      executableName: options.executableName,
      platforms: Object.freeze([...platforms]),
      files: Object.freeze([...files]),
      settings,
      generatedAt,
      checksum: DesktopPackage.computeChecksum(payload),
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

  getManifest(): Readonly<DesktopPackageManifest> {
    return {
      ...this.manifest,
      platforms: [...this.manifest.platforms],
      files: [...this.manifest.files],
      settings: deepClone(this.manifest.settings),
    };
  }

  validate(): void {
    validateDesktopPackageOptions({
      id: this.manifest.id,
      name: this.manifest.name,
      version: this.manifest.version,
      executableName: this.manifest.executableName,
      description: this.manifest.description,
      platforms: [...this.manifest.platforms],
      files: [...this.manifest.files],
      settings: this.manifest.settings,
      generatedAt: this.manifest.generatedAt,
    });
  }

  clone(): DesktopPackage {
    return DesktopPackage.fromJSON(this.toJSON());
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.manifest.id,
      name: this.manifest.name,
      version: this.manifest.version,
      description: this.manifest.description,
      executableName: this.manifest.executableName,
      platforms: [...this.manifest.platforms],
      files: [...this.manifest.files],
      settings: deepClone(this.manifest.settings),
      generatedAt: this.manifest.generatedAt,
      checksum: this.manifest.checksum,
      sizeBytes: this.manifest.sizeBytes,
    };
  }

  static fromJSON(data: Record<string, unknown>): DesktopPackage {
    if (!isRecord(data)) {
      throw new Error('DesktopPackage JSON data must be an object.');
    }

    const platforms = Array.isArray(data.platforms)
      ? (data.platforms as unknown[]).map((entry) => entry as DesktopPlatform)
      : undefined;
    const files = Array.isArray(data.files)
      ? (data.files as unknown[]).map((entry) => String(entry))
      : undefined;

    return new DesktopPackage({
      id: typeof data.id === 'string' ? data.id : '',
      name: typeof data.name === 'string' ? data.name : '',
      version: typeof data.version === 'string' ? data.version : '',
      description: typeof data.description === 'string' ? data.description : undefined,
      executableName: typeof data.executableName === 'string' ? data.executableName : '',
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
