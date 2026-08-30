import { SemanticVersion } from '../core/index.js';
import { MissionFactory } from '../game/index.js';
import { ScenarioValidator } from '../scenario/index.js';
import { BuildPipeline } from './BuildPipeline.js';
import { FlagshipGameReleaseCandidate } from './FlagshipGameReleaseCandidate.js';
import { ReleaseChannelManager } from './ReleaseChannelManager.js';
import type { ReleaseChannel } from './ReleaseChannelTypes.js';

export interface CyreReleaseCandidateOptions {
  engineVersion?: string;
  releaseChannelManager?: ReleaseChannelManager;
  buildPipeline?: BuildPipeline;
  flagshipCandidate?: FlagshipGameReleaseCandidate;
  missionIds?: string[];
  requireStableVersion?: boolean;
  now?: () => number;
}

export interface CyreReleaseCandidateReport {
  engineVersion: string;
  releaseChannel: ReleaseChannel;
  gameTitle: string;
  campaignId: string;
  missionCount: number;
  validatedMissionCount: number;
  buildProfileCount: number;
  successfulBuildCount: number;
  passed: boolean;
  durationMs: number;
  summary: string;
}

export class CyreReleaseCandidate {
  private readonly engineVersion: SemanticVersion;
  private readonly releaseChannelManager: ReleaseChannelManager;
  private readonly buildPipeline: BuildPipeline;
  private readonly flagshipCandidate: FlagshipGameReleaseCandidate;
  private readonly missionIds: string[];
  private readonly requireStableVersion: boolean;
  private readonly nowFn: () => number;

  constructor(options: CyreReleaseCandidateOptions = {}) {
    if (options.now !== undefined && typeof options.now !== 'function') {
      throw new Error('CyreReleaseCandidate now must be a function if provided.');
    }

    this.nowFn = options.now ?? (() => Date.now());
    this.engineVersion = SemanticVersion.parse(options.engineVersion ?? '1.0.0');

    this.releaseChannelManager =
      options.releaseChannelManager ??
      new ReleaseChannelManager({
        channels: ['nightly', 'development', 'beta', 'stable'],
        activeChannel: 'stable',
      });

    this.buildPipeline = options.buildPipeline ?? new BuildPipeline();

    this.flagshipCandidate =
      options.flagshipCandidate ?? FlagshipGameReleaseCandidate.createDefault();

    this.requireStableVersion = options.requireStableVersion ?? true;

    const candidateMissionIds = options.missionIds ?? MissionFactory.list().sort();
    this.missionIds = [...candidateMissionIds];

    if (this.missionIds.length === 0) {
      throw new Error('CYRE release candidate requires at least one mission.');
    }

    this.syncBuildPipelineFromFlagship();
  }

  static createDefault(
    options: CyreReleaseCandidateOptions = {},
  ): CyreReleaseCandidate {
    return new CyreReleaseCandidate(options);
  }

  getEngineVersion(): SemanticVersion {
    return this.engineVersion;
  }

  getReleaseChannelManager(): ReleaseChannelManager {
    return this.releaseChannelManager;
  }

  getBuildPipeline(): BuildPipeline {
    return this.buildPipeline;
  }

  getFlagshipCandidate(): FlagshipGameReleaseCandidate {
    return this.flagshipCandidate;
  }

  getMissionIds(): string[] {
    return [...this.missionIds];
  }

  validate(): void {
    if (this.requireStableVersion && !this.engineVersion.isStable()) {
      throw new Error(
        `CYRE release candidate requires a stable engine version; got "${this.engineVersion.toString()}".`,
      );
    }

    if (
      this.requireStableVersion &&
      this.releaseChannelManager.getActive() !== 'stable'
    ) {
      throw new Error(
        `CYRE release candidate requires the stable release channel; got "${this.releaseChannelManager.getActive()}".`,
      );
    }

    this.flagshipCandidate.validate();

    for (const missionId of this.missionIds) {
      if (!MissionFactory.has(missionId)) {
        throw new Error(`Release mission "${missionId}" is not registered.`);
      }

      const scenario = MissionFactory.create(missionId);
      const validationResult = new ScenarioValidator().validate(scenario.toJSON());

      if (!validationResult.isValid) {
        throw new Error(
          `Release mission "${missionId}" scenario validation failed: ${validationResult.errors.join(', ')}`,
        );
      }
    }

    this.buildPipeline.validate();
  }

  run(): CyreReleaseCandidateReport {
    const startedAt = this.nowFn();
    this.validate();

    const buildResults = this.buildPipeline.buildAll();
    const successfulBuildCount = buildResults.filter((result) => result.success).length;

    if (successfulBuildCount !== buildResults.length) {
      const failedProfiles = buildResults
        .filter((result) => !result.success)
        .map((result) => result.profileId)
        .join(', ');

      const endedAt = this.nowFn();
      return this.createReport(
        false,
        successfulBuildCount,
        Math.max(0, endedAt - startedAt),
        failedProfiles,
      );
    }

    const endedAt = this.nowFn();
    return this.createReport(
      true,
      successfulBuildCount,
      Math.max(0, endedAt - startedAt),
    );
  }

  private syncBuildPipelineFromFlagship(): void {
    if (this.buildPipeline.listProfileIds().length > 0) {
      return;
    }

    const flagshipProfiles = this.flagshipCandidate
      .getBuildPipeline()
      .listProfiles();

    for (const profile of flagshipProfiles) {
      this.buildPipeline.registerProfile(profile.clone());
    }
  }

  private createReport(
    passed: boolean,
    successfulBuildCount: number,
    durationMs: number,
    failureDetails?: string,
  ): CyreReleaseCandidateReport {
    const flagshipSnapshot = this.flagshipCandidate.snapshot();
    const buildProfileCount = this.buildPipeline.listProfileIds().length;

    const summary = [
      `CYRE Engine ${this.engineVersion.toString()} Release Candidate`,
      `channel=${this.releaseChannelManager.getActive()}`,
      `game=${flagshipSnapshot.gameTitle}`,
      `missions=${this.missionIds.length}`,
      `builds=${successfulBuildCount}/${buildProfileCount}`,
      `passed=${passed}`,
      failureDetails ? `failures=${failureDetails}` : undefined,
    ]
      .filter(Boolean)
      .join(' | ');

    return {
      engineVersion: this.engineVersion.toString(),
      releaseChannel: this.releaseChannelManager.getActive(),
      gameTitle: flagshipSnapshot.gameTitle,
      campaignId: flagshipSnapshot.campaignId,
      missionCount: this.missionIds.length,
      validatedMissionCount: this.missionIds.length,
      buildProfileCount,
      successfulBuildCount,
      passed,
      durationMs,
      summary,
    };
  }
}
