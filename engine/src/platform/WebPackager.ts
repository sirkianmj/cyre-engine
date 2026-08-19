import { BuildProfile } from './BuildProfile.js';
import { WebPackage } from './WebPackage.js';
import { isRecord } from './WebPackageUtils.js';
import type { WebPackageManifest } from './WebPackageTypes.js';

export interface WebPackagerOptions {
  name?: string;
  now?: () => number;
}

export interface WebPackageBuildInput {
  id: string;
  name: string;
  version: string;
  entryPoint: string;
  assets?: string[];
  description?: string;
  profile?: BuildProfile;
  settings?: Record<string, unknown>;
}

export interface WebPackageBuildResult {
  success: boolean;
  package: WebPackage;
  profileId?: string;
  startedAt: number;
  endedAt: number;
  durationMs: number;
}

export class WebPackager {
  readonly name: string;
  private readonly nowFn: () => number;

  constructor(options: WebPackagerOptions = {}) {
    if (options.name !== undefined && options.name.trim() === '') {
      throw new Error('WebPackager name cannot be empty if provided.');
    }
    if (options.now !== undefined && typeof options.now !== 'function') {
      throw new Error('WebPackager now must be a function if provided.');
    }

    this.name = options.name ?? 'CYRE Web Packager';
    this.nowFn = options.now ?? (() => Date.now());
  }

  now(): number {
    return this.nowFn();
  }

  package(input: WebPackageBuildInput): WebPackageBuildResult {
    this.validateInput(input);

    const startedAt = this.now();

    const profile = input.profile;
    if (profile !== undefined) {
      profile.validate();
      if (profile.target !== 'web') {
        throw new Error('WebPackager requires a build profile targeting "web".');
      }
    }

    const settings = {
      packager: this.name,
      profileId: profile?.id ?? null,
      ...(input.settings ?? {}),
    };

    const pkg = new WebPackage({
      id: input.id,
      name: input.name,
      version: input.version,
      description: input.description,
      entryPoint: input.entryPoint,
      assets: input.assets,
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

  packageManifest(input: WebPackageBuildInput): WebPackageManifest {
    return this.package(input).package.getManifest();
  }

  validate(): void {
    if (!this.name || this.name.trim() === '') {
      throw new Error('WebPackager name is required.');
    }
  }

  private validateInput(input: WebPackageBuildInput): void {
    if (!isRecord(input)) {
      throw new Error('WebPackageBuildInput must be an object.');
    }
    if (!input.id || input.id.trim() === '') {
      throw new Error('Web package id is required.');
    }
    if (!input.name || input.name.trim() === '') {
      throw new Error('Web package name is required.');
    }
    if (!input.version || input.version.trim() === '') {
      throw new Error('Web package version is required.');
    }
    if (!input.entryPoint || input.entryPoint.trim() === '') {
      throw new Error('Web package entryPoint is required.');
    }
    if (input.description !== undefined && typeof input.description !== 'string') {
      throw new Error('Web package description must be a string if provided.');
    }
    if (input.settings !== undefined && !isRecord(input.settings)) {
      throw new Error('Web package settings must be an object if provided.');
    }
  }
}
