import { BuildProfile } from './BuildProfile.js';
import { DesktopPackage } from './DesktopPackage.js';
import { isRecord } from './DesktopPackageUtils.js';
import type {
  DesktopPackageManifest,
  DesktopPlatform,
} from './DesktopPackageTypes.js';

export interface DesktopPackagerOptions {
  name?: string;
  now?: () => number;
}

export interface DesktopPackageBuildInput {
  id: string;
  name: string;
  version: string;
  executableName: string;
  platforms?: DesktopPlatform[];
  files?: string[];
  description?: string;
  profile?: BuildProfile;
  settings?: Record<string, unknown>;
}

export interface DesktopPackageBuildResult {
  success: boolean;
  package: DesktopPackage;
  profileId?: string;
  startedAt: number;
  endedAt: number;
  durationMs: number;
}

export class DesktopPackager {
  readonly name: string;
  private readonly nowFn: () => number;

  constructor(options: DesktopPackagerOptions = {}) {
    if (options.name !== undefined && options.name.trim() === '') {
      throw new Error('DesktopPackager name cannot be empty if provided.');
    }
    if (options.now !== undefined && typeof options.now !== 'function') {
      throw new Error('DesktopPackager now must be a function if provided.');
    }

    this.name = options.name ?? 'CYRE Desktop Packager';
    this.nowFn = options.now ?? (() => Date.now());
  }

  now(): number {
    return this.nowFn();
  }

  package(input: DesktopPackageBuildInput): DesktopPackageBuildResult {
    this.validateInput(input);

    const startedAt = this.now();

    const profile = input.profile;
    if (profile !== undefined) {
      profile.validate();
      if (profile.target !== 'desktop') {
        throw new Error('DesktopPackager requires a build profile targeting "desktop".');
      }
    }

    const settings = {
      packager: this.name,
      profileId: profile?.id ?? null,
      ...(input.settings ?? {}),
    };

    const pkg = new DesktopPackage({
      id: input.id,
      name: input.name,
      version: input.version,
      description: input.description,
      executableName: input.executableName,
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

  packageManifest(input: DesktopPackageBuildInput): DesktopPackageManifest {
    return this.package(input).package.getManifest();
  }

  validate(): void {
    if (!this.name || this.name.trim() === '') {
      throw new Error('DesktopPackager name is required.');
    }
  }

  private validateInput(input: DesktopPackageBuildInput): void {
    if (!isRecord(input)) {
      throw new Error('DesktopPackageBuildInput must be an object.');
    }
    if (!input.id || input.id.trim() === '') {
      throw new Error('Desktop package id is required.');
    }
    if (!input.name || input.name.trim() === '') {
      throw new Error('Desktop package name is required.');
    }
    if (!input.version || input.version.trim() === '') {
      throw new Error('Desktop package version is required.');
    }
    if (!input.executableName || input.executableName.trim() === '') {
      throw new Error('Desktop package executableName is required.');
    }
    if (input.description !== undefined && typeof input.description !== 'string') {
      throw new Error('Desktop package description must be a string if provided.');
    }
    if (input.settings !== undefined && !isRecord(input.settings)) {
      throw new Error('Desktop package settings must be an object if provided.');
    }
  }
}
