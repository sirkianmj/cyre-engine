import { BuildPipeline } from './BuildPipeline.js';
import type { BuildResult } from './BuildPipeline.js';
import { BuildProfile } from './BuildProfile.js';
import type { BuildTarget } from './BuildTypes.js';
import { WebPackager } from './WebPackager.js';
import type { WebPackageBuildInput } from './WebPackager.js';
import { DesktopPackager } from './DesktopPackager.js';
import type { DesktopPackageBuildInput } from './DesktopPackager.js';
import { MobilePackager } from './MobilePackager.js';
import type { MobilePackageBuildInput } from './MobilePackager.js';
import {
  CI_CD_STAGES,
  type CiCdPipelineResult,
  type CiCdStage,
  type CiCdStageResult,
  type CiCdStageStatus,
} from './CiCdTypes.js';

export type CiCdPackageInput =
  | { target: 'web'; input: WebPackageBuildInput }
  | { target: 'desktop'; input: DesktopPackageBuildInput }
  | { target: 'mobile'; input: MobilePackageBuildInput };

export interface CiCdPipelineOptions {
  buildPipeline?: BuildPipeline;
  webPackager?: WebPackager;
  desktopPackager?: DesktopPackager;
  mobilePackager?: MobilePackager;
  now?: () => number;
}

export class CiCdPipeline {
  private readonly buildPipeline: BuildPipeline;
  private readonly webPackager: WebPackager;
  private readonly desktopPackager: DesktopPackager;
  private readonly mobilePackager: MobilePackager;
  private readonly packageInputs = new Map<string, CiCdPackageInput>();
  private readonly nowFn: () => number;

  constructor(options: CiCdPipelineOptions = {}) {
    if (options.now !== undefined && typeof options.now !== 'function') {
      throw new Error('CiCdPipeline now must be a function if provided.');
    }

    this.nowFn = options.now ?? (() => Date.now());
    this.buildPipeline = options.buildPipeline ?? new BuildPipeline({ now: this.nowFn });
    this.webPackager = options.webPackager ?? new WebPackager({ now: this.nowFn });
    this.desktopPackager = options.desktopPackager ?? new DesktopPackager({ now: this.nowFn });
    this.mobilePackager = options.mobilePackager ?? new MobilePackager({ now: this.nowFn });
  }

  now(): number {
    return this.nowFn();
  }

  registerProfile(profile: BuildProfile): void {
    this.buildPipeline.registerProfile(profile);
  }

  listProfileIds(): string[] {
    return this.buildPipeline.listProfileIds();
  }

  registerPackage(profileId: string, packageInput: CiCdPackageInput): void {
    if (!profileId || profileId.trim() === '') {
      throw new Error('CI/CD package registration requires a profile id.');
    }

    const profile = this.buildPipeline.getProfile(profileId);
    if (!profile) {
      throw new Error(`CI/CD profile "${profileId}" does not exist.`);
    }

    if (profile.target !== packageInput.target) {
      throw new Error(
        `CI/CD package target "${packageInput.target}" does not match profile target "${profile.target}".`,
      );
    }

    if (this.packageInputs.has(profileId)) {
      throw new Error(`CI/CD package input for profile "${profileId}" is already registered.`);
    }

    this.packageInputs.set(profileId, packageInput);
  }

  validate(): void {
    this.buildPipeline.validate();
    this.webPackager.validate();
    this.desktopPackager.validate();
    this.mobilePackager.validate();
  }

  run(): CiCdPipelineResult {
    const startedAt = this.now();
    const stages: CiCdStageResult[] = [];
    let success = true;
    let buildResults: BuildResult[] = [];
    let packageCount = 0;
    let profileIds: string[] = [];

    // Stage 1: validate
    const validateStartedAt = this.now();
    try {
      this.validate();
      stages.push(
        this.createStageResult('validate', 'succeeded', validateStartedAt),
      );
    } catch (error) {
      success = false;
      stages.push(
        this.createStageResult('validate', 'failed', validateStartedAt, error),
      );
      return this.createFinalResult(startedAt, success, [], 0, stages);
    }

    // Stage 2: build
    const buildStartedAt = this.now();
    try {
      buildResults = this.buildPipeline.buildAll();
      profileIds = buildResults.map((result) => result.profileId);
      stages.push(
        this.createStageResult('build', 'succeeded', buildStartedAt, undefined, {
          profileIds,
        }),
      );
    } catch (error) {
      success = false;
      stages.push(
        this.createStageResult('build', 'failed', buildStartedAt, error),
      );
      return this.createFinalResult(startedAt, success, [], 0, stages);
    }

    // Stage 3: package
    const packageStartedAt = this.now();
    try {
      for (const result of buildResults) {
        if (!result.success) {
          throw new Error(`Build result "${result.profileId}" was not successful.`);
        }

        const packageInput = this.packageInputs.get(result.profileId);
        if (!packageInput) {
          continue;
        }

        this.packageWith(packageInput);
        packageCount += 1;
      }

      stages.push(
        this.createStageResult('package', 'succeeded', packageStartedAt, undefined, {
          packageCount,
        }),
      );
    } catch (error) {
      success = false;
      stages.push(
        this.createStageResult('package', 'failed', packageStartedAt, error),
      );
      return this.createFinalResult(startedAt, success, profileIds, packageCount, stages);
    }

    // Stage 4: report
    const reportStartedAt = this.now();
    stages.push(
      this.createStageResult('report', 'succeeded', reportStartedAt, undefined, {
        profileIds,
        packageCount,
      }),
    );

    return this.createFinalResult(startedAt, success, profileIds, packageCount, stages);
  }

  private packageWith(input: CiCdPackageInput): void {
    switch (input.target) {
      case 'web':
        this.webPackager.package(input.input);
        break;
      case 'desktop':
        this.desktopPackager.package(input.input);
        break;
      case 'mobile':
        this.mobilePackager.package(input.input);
        break;
    }
  }

  private createStageResult(
    stage: CiCdStage,
    status: CiCdStageStatus,
    startedAt: number,
    error?: unknown,
    data?: Record<string, unknown>,
  ): CiCdStageResult {
    const endedAt = this.now();
    return {
      stage,
      status,
      startedAt,
      endedAt,
      durationMs: endedAt - startedAt,
      message: error instanceof Error ? error.message : undefined,
      data,
    };
  }

  private createFinalResult(
    startedAt: number,
    success: boolean,
    profileIds: string[],
    packageCount: number,
    stages: CiCdStageResult[],
  ): CiCdPipelineResult {
    const endedAt = this.now();
    return {
      success,
      startedAt,
      endedAt,
      durationMs: endedAt - startedAt,
      profileIds,
      packageCount,
      stages,
    };
  }
}
