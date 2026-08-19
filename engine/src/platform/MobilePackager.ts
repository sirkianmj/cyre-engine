import { BuildProfile } from './BuildProfile.js';
import { MobilePackage } from './MobilePackage.js';
import { isRecord } from './MobilePackageUtils.js';
import type {
  MobilePackageManifest,
  MobilePlatform,
} from './MobilePackageTypes.js';

export interface MobilePackagerOptions {
  name?: string;
  now?: () => number;
}

export interface MobilePackageBuildInput {
  id: string;
  name: string;
  version: string;
  bundleId: string;
  platforms?: MobilePlatform[];
  files?: string[];
  description?: string;
  profile?: BuildProfile;
  settings?: Record<string, unknown>;
}

export interface MobilePackageBuildResult {
  success: boolean;
  package: MobilePackage;
  profileId?: string;
  startedAt: number;
  endedAt: number;
  durationMs: number;
}

export class MobilePackager {
  readonly name: string;
  private readonly nowFn: () => number;

  constructor(options: MobilePackagerOptions = {}) {
    if (options.name !== undefined && options.name.trim() === '') {
      throw new Error('MobilePackager name cannot be empty if provided.');
    }
    if (options.now !== undefined && typeof options.now !== 'function') {
      throw new Error('MobilePackager now must be a function if provided.');
    }

    this.name = options.name ?? 'CYRE Mobile Packager';
    this.nowFn = options.now ?? (() => Date.now());
  }

  now(): number {
    return this.nowFn();
  }

  package(input: MobilePackageBuildInput): MobilePackageBuildResult {
    this.validateInput(input);

    const startedAt = this.now();

    const profile = input.profile;
    if (profile !== undefined) {
      profile.validate();
      if (profile.target !== 'mobile') {
        throw new Error('MobilePackager requires a build profile targeting "mobile".');
      }
    }

    const settings = {
      packager: this.name,
      profileId: profile?.id ?? null,
      ...(input.settings ?? {}),
    };

    const pkg = new MobilePackage({
      id: input.id,
      name: input.name,
      version: input.version,
      description: input.description,
      bundleId: input.bundleId,
      platforms: input.platforms,
      files: input.files,
      settings,
      generatedAt: startedAt,
    });

    const endedAt = this.now();
    return {
      success: true,
      package: pkg,
      profileId: profile?.id,
      startedAt,
      endedAt,
      durationMs: endedAt - startedAt,
    };
  }

  packageManifest(input: MobilePackageBuildInput): MobilePackageManifest {
    return this.package(input).package.getManifest();
  }

  validate(): void {
    if (!this.name || this.name.trim() === '') {
      throw new Error('MobilePackager name is required.');
    }
  }

  private validateInput(input: MobilePackageBuildInput): void {
    if (!isRecord(input)) {
      throw new Error('MobilePackageBuildInput must be an object.');
    }
    if (!input.id || input.id.trim() === '') {
      throw new Error('Mobile package id is required.');
    }
    if (!input.name || input.name.trim() === '') {
      throw new Error('Mobile package name is required.');
    }
    if (!input.version || input.version.trim() === '') {
      throw new Error('Mobile package version is required.');
    }
    if (!input.bundleId || input.bundleId.trim() === '') {
      throw new Error('Mobile package bundleId is required.');
    }
    if (input.description !== undefined && typeof input.description !== 'string') {
      throw new Error('Mobile package description must be a string if provided.');
    }
    if (input.settings !== undefined && !isRecord(input.settings)) {
      throw new Error('Mobile package settings must be an object if provided.');
    }
  }
}
