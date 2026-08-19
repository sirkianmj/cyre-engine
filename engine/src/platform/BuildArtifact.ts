import {
  isBuildFlavor,
  isBuildTarget,
  type BuildFlavor,
  type BuildTarget,
} from './BuildTypes.js';

export interface BuildArtifactOptions {
  id: string;
  name: string;
  target: BuildTarget;
  flavor: BuildFlavor;
  profileId: string;
  sizeBytes: number;
  checksum?: string;
  createdAt?: number;
  metadata?: Record<string, unknown>;
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export class BuildArtifact {
  readonly id: string;
  readonly name: string;
  readonly target: BuildTarget;
  readonly flavor: BuildFlavor;
  readonly profileId: string;
  readonly sizeBytes: number;
  readonly checksum?: string;
  readonly createdAt: number;
  readonly metadata?: Record<string, unknown>;

  constructor(options: BuildArtifactOptions) {
    if (!options.id || options.id.trim() === '') {
      throw new Error('BuildArtifact id is required.');
    }
    if (!options.name || options.name.trim() === '') {
      throw new Error('BuildArtifact name is required.');
    }
    if (!options.profileId || options.profileId.trim() === '') {
      throw new Error('BuildArtifact profileId is required.');
    }
    if (!isBuildTarget(options.target)) {
      throw new Error(`Invalid build target "${options.target}".`);
    }
    if (!isBuildFlavor(options.flavor)) {
      throw new Error(`Invalid build flavor "${options.flavor}".`);
    }
    if (!Number.isInteger(options.sizeBytes) || options.sizeBytes < 0) {
      throw new Error('BuildArtifact sizeBytes must be a non-negative integer.');
    }
    if (options.checksum !== undefined && options.checksum.trim() === '') {
      throw new Error('BuildArtifact checksum cannot be empty if provided.');
    }
    if (options.createdAt !== undefined && !Number.isFinite(options.createdAt)) {
      throw new Error('BuildArtifact createdAt must be a finite number if provided.');
    }
    if (options.metadata !== undefined && !isRecord(options.metadata)) {
      throw new Error('BuildArtifact metadata must be an object if provided.');
    }

    this.id = options.id;
    this.name = options.name;
    this.target = options.target;
    this.flavor = options.flavor;
    this.profileId = options.profileId;
    this.sizeBytes = options.sizeBytes;
    this.checksum = options.checksum;
    this.createdAt = options.createdAt ?? Date.now();
    this.metadata = options.metadata !== undefined ? deepClone(options.metadata) : undefined;
  }

  validate(): void {
    if (!this.id || this.id.trim() === '') {
      throw new Error('BuildArtifact id is required.');
    }
    if (!this.name || this.name.trim() === '') {
      throw new Error('BuildArtifact name is required.');
    }
    if (!this.profileId || this.profileId.trim() === '') {
      throw new Error('BuildArtifact profileId is required.');
    }
    if (!isBuildTarget(this.target)) {
      throw new Error(`Invalid build target "${this.target}".`);
    }
    if (!isBuildFlavor(this.flavor)) {
      throw new Error(`Invalid build flavor "${this.flavor}".`);
    }
    if (!Number.isInteger(this.sizeBytes) || this.sizeBytes < 0) {
      throw new Error('BuildArtifact sizeBytes must be a non-negative integer.');
    }
  }

  clone(): BuildArtifact {
    return BuildArtifact.fromJSON(this.toJSON());
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      name: this.name,
      target: this.target,
      flavor: this.flavor,
      profileId: this.profileId,
      sizeBytes: this.sizeBytes,
      checksum: this.checksum,
      createdAt: this.createdAt,
      metadata: this.metadata !== undefined ? deepClone(this.metadata) : undefined,
    };
  }

  static fromJSON(data: Record<string, unknown>): BuildArtifact {
    return new BuildArtifact({
      id: typeof data.id === 'string' ? data.id : '',
      name: typeof data.name === 'string' ? data.name : '',
      target: typeof data.target === 'string'
        ? (data.target as BuildTarget)
        : 'web',
      flavor: typeof data.flavor === 'string'
        ? (data.flavor as BuildFlavor)
        : 'development',
      profileId: typeof data.profileId === 'string' ? data.profileId : '',
      sizeBytes: typeof data.sizeBytes === 'number' ? data.sizeBytes : 0,
      checksum: typeof data.checksum === 'string' ? data.checksum : undefined,
      createdAt: typeof data.createdAt === 'number' ? data.createdAt : undefined,
      metadata: isRecord(data.metadata) ? data.metadata : undefined,
    });
  }
}
