import {
  BUILD_FLAVORS,
  BUILD_TARGETS,
  isBuildFlavor,
  isBuildTarget,
  type BuildFlavor,
  type BuildTarget,
} from './BuildTypes.js';
import { BuildProfile } from './BuildProfile.js';
import { BuildArtifact } from './BuildArtifact.js';

export type BuildStage =
  | 'validate'
  | 'resolveTarget'
  | 'compileArtifact'
  | 'package'
  | 'finalize';

export interface BuildLogEntry {
  stage: BuildStage;
  message: string;
  timestamp: number;
  durationMs?: number;
}

export interface BuildResult {
  success: boolean;
  profileId: string;
  target: BuildTarget;
  flavor: BuildFlavor;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  artifact?: BuildArtifact;
  logs: BuildLogEntry[];
}

export interface BuildPipelineOptions {
  name?: string;
  now?: () => number;
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function computeChecksum(content: string): string {
  let hash = 2166136261 >>> 0;
  const bytes = new TextEncoder().encode(content);
  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return `fnv1a-${hash.toString(16).padStart(8, '0')}`;
}

export class BuildPipeline {
  readonly name: string;
  private readonly nowFn: () => number;
  private readonly profiles = new Map<string, BuildProfile>();

  constructor(options: BuildPipelineOptions = {}) {
    if (options.name !== undefined && options.name.trim() === '') {
      throw new Error('BuildPipeline name cannot be empty if provided.');
    }
    if (options.now !== undefined && typeof options.now !== 'function') {
      throw new Error('BuildPipeline now must be a function if provided.');
    }

    this.name = options.name ?? 'CYRE Build Pipeline';
    this.nowFn = options.now ?? (() => Date.now());
  }

  now(): number {
    return this.nowFn();
  }

  registerProfile(profile: BuildProfile): void {
    profile.validate();
    if (this.profiles.has(profile.id)) {
      throw new Error(`BuildProfile "${profile.id}" is already registered.`);
    }
    this.profiles.set(profile.id, profile.clone());
  }

  unregisterProfile(id: string): void {
    if (!this.profiles.delete(id)) {
      throw new Error(`BuildProfile "${id}" does not exist.`);
    }
  }

  hasProfile(id: string): boolean {
    return this.profiles.has(id);
  }

  getProfile(id: string): BuildProfile | undefined {
    const profile = this.profiles.get(id);
    return profile !== undefined ? profile.clone() : undefined;
  }

  listProfiles(): BuildProfile[] {
    return Array.from(this.profiles.values()).map((profile) => profile.clone());
  }

  listProfileIds(): string[] {
    return Array.from(this.profiles.keys()).sort();
  }

  listProfilesByTarget(target: BuildTarget): BuildProfile[] {
    if (!isBuildTarget(target)) {
      throw new Error(`Invalid build target "${target}".`);
    }
    return this.listProfiles().filter((profile) => profile.target === target);
  }

  listProfilesByFlavor(flavor: BuildFlavor): BuildProfile[] {
    if (!isBuildFlavor(flavor)) {
      throw new Error(`Invalid build flavor "${flavor}".`);
    }
    return this.listProfiles().filter((profile) => profile.flavor === flavor);
  }

  build(
    profileId: string,
    settingsOverrides: Record<string, unknown> = {},
  ): BuildResult {
    if (!profileId || profileId.trim() === '') {
      throw new Error('Build profile id is required.');
    }
    if (!isRecord(settingsOverrides)) {
      throw new Error('Build settingsOverrides must be an object.');
    }

    const profile = this.profiles.get(profileId);
    if (profile === undefined) {
      throw new Error(`BuildProfile "${profileId}" does not exist.`);
    }

    const startedAt = this.now();
    const logs: BuildLogEntry[] = [];
    const pushLog = (
      stage: BuildStage,
      message: string,
      timestamp: number,
      durationMs?: number,
    ): void => {
      logs.push({ stage, message, timestamp, durationMs });
    };

    const validateStageStart = this.now();
    profile.validate();
    pushLog('validate', 'Build profile validated.', this.now(), this.now() - validateStageStart);

    const resolveStageStart = this.now();
    if (!isBuildTarget(profile.target)) {
      throw new Error(`Unsupported build target "${profile.target}".`);
    }
    pushLog('resolveTarget', `Resolved target "${profile.target}".`, this.now(), this.now() - resolveStageStart);

    const mergedSettings = {
      ...profile.settings,
      ...deepClone(settingsOverrides),
    };

    const compileStageStart = this.now();
    const payload = {
      profileId: profile.id,
      name: profile.name,
      target: profile.target,
      flavor: profile.flavor,
      settings: mergedSettings,
    };
    const payloadText = JSON.stringify(payload);
    const sizeBytes = new TextEncoder().encode(payloadText).byteLength;
    const checksum = computeChecksum(payloadText);
    pushLog(
      'compileArtifact',
      `Compiled artifact payload (${sizeBytes} bytes).`,
      this.now(),
      this.now() - compileStageStart,
    );

    const packageStageStart = this.now();
    const artifact = new BuildArtifact({
      id: `${profile.id}-${profile.flavor}-${profile.target}-${this.now()}`,
      name: profile.name,
      target: profile.target,
      flavor: profile.flavor,
      profileId: profile.id,
      sizeBytes,
      checksum,
      createdAt: this.now(),
      metadata: {
        payload,
        buildPipeline: this.name,
      },
    });
    pushLog(
      'package',
      `Build artifact "${artifact.id}" packaged.`,
      this.now(),
      this.now() - packageStageStart,
    );

    const finalizeStageStart = this.now();
    const endedAt = this.now();
    pushLog('finalize', 'Build finalized.', endedAt, this.now() - finalizeStageStart);

    return {
      success: true,
      profileId: profile.id,
      target: profile.target,
      flavor: profile.flavor,
      startedAt,
      endedAt,
      durationMs: endedAt - startedAt,
      artifact,
      logs,
    };
  }

  buildAll(settingsOverrides: Record<string, unknown> = {}): BuildResult[] {
    return this.listProfileIds().map((id) => this.build(id, settingsOverrides));
  }

  validate(): void {
    if (!this.name || this.name.trim() === '') {
      throw new Error('BuildPipeline name is required.');
    }
    for (const profile of this.profiles.values()) {
      profile.validate();
    }
  }
}
