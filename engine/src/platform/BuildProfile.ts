import {
  BUILD_FLAVORS,
  BUILD_TARGETS,
  isBuildFlavor,
  isBuildTarget,
  type BuildFlavor,
  type BuildTarget,
} from './BuildTypes.js';

export interface BuildProfileOptions {
  id: string;
  name: string;
  target: BuildTarget;
  flavor: BuildFlavor;
  settings?: Record<string, unknown>;
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export class BuildProfile {
  readonly id: string;
  readonly name: string;
  readonly target: BuildTarget;
  readonly flavor: BuildFlavor;
  readonly settings: Record<string, unknown>;

  constructor(options: BuildProfileOptions) {
    if (!options.id || options.id.trim() === '') {
      throw new Error('BuildProfile id is required.');
    }
    if (!options.name || options.name.trim() === '') {
      throw new Error('BuildProfile name is required.');
    }
    if (!isBuildTarget(options.target)) {
      throw new Error(`Invalid build target "${options.target}".`);
    }
    if (!isBuildFlavor(options.flavor)) {
      throw new Error(`Invalid build flavor "${options.flavor}".`);
    }
    if (options.settings !== undefined && !isRecord(options.settings)) {
      throw new Error('BuildProfile settings must be an object if provided.');
    }

    this.id = options.id;
    this.name = options.name;
    this.target = options.target;
    this.flavor = options.flavor;
    this.settings = options.settings !== undefined ? deepClone(options.settings) : {};
  }

  validate(): void {
    if (!this.id || this.id.trim() === '') {
      throw new Error('BuildProfile id is required.');
    }
    if (!this.name || this.name.trim() === '') {
      throw new Error('BuildProfile name is required.');
    }
    if (!isBuildTarget(this.target)) {
      throw new Error(`Invalid build target "${this.target}".`);
    }
    if (!isBuildFlavor(this.flavor)) {
      throw new Error(`Invalid build flavor "${this.flavor}".`);
    }
    if (!isRecord(this.settings)) {
      throw new Error('BuildProfile settings must be an object.');
    }
  }

  clone(): BuildProfile {
    return BuildProfile.fromJSON(this.toJSON());
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      name: this.name,
      target: this.target,
      flavor: this.flavor,
      settings: deepClone(this.settings),
    };
  }

  static fromJSON(data: Record<string, unknown>): BuildProfile {
    return new BuildProfile({
      id: typeof data.id === 'string' ? data.id : '',
      name: typeof data.name === 'string' ? data.name : '',
      target: typeof data.target === 'string'
        ? (data.target as BuildTarget)
        : 'web',
      flavor: typeof data.flavor === 'string'
        ? (data.flavor as BuildFlavor)
        : 'development',
      settings: isRecord(data.settings) ? data.settings : undefined,
    });
  }
}
