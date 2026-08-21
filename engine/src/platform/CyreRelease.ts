import { SemanticVersion } from '../core/index.js';
import { MissionFactory } from '../game/index.js';
import { CyreReleaseCandidate } from './CyreReleaseCandidate.js';
import { ReleaseChannelManager } from './ReleaseChannelManager.js';
import type { ReleaseChannel } from './ReleaseChannelTypes.js';

export interface CyreReleaseManifest {
  engineVersion: string;
  releaseChannel: ReleaseChannel;
  gameTitle: string;
  gameCodename: string;
  identityId: string;
  targetPlatforms: string[];
  campaignId: string;
  missionIds: string[];
  buildProfileIds: string[];
  successfulBuildCount: number;
  totalBuildCount: number;
  releasedAt: number;
  summary: string;
}

export interface CyreReleaseOptions {
  engineVersion?: string;
  releaseCandidate?: CyreReleaseCandidate;
  releaseChannelManager?: ReleaseChannelManager;
  now?: () => number;
}

const OFFICIAL_ENGINE_VERSION = '1.0.0';
const OFFICIAL_FLAGSHIP_IDENTITY_ID = 'cyre-soc-command';
const OFFICIAL_FLAGSHIP_TITLE = 'SOC Command';
const OFFICIAL_MISSION_IDS = [
  'mission-001',
  'mission-002',
  'mission-003',
  'mission-004',
  'mission-005',
] as const;

function arraysEqualSorted(
  left: readonly string[],
  right: readonly string[],
): boolean {
  if (left.length !== right.length) {
    return false;
  }

  const sortedLeft = [...left].sort();
  const sortedRight = [...right].sort();

  for (let index = 0; index < sortedLeft.length; index += 1) {
    if (sortedLeft[index] !== sortedRight[index]) {
      return false;
    }
  }

  return true;
}

export class CyreRelease {
  static readonly OFFICIAL_ENGINE_VERSION = OFFICIAL_ENGINE_VERSION;
  static readonly OFFICIAL_FLAGSHIP_IDENTITY_ID = OFFICIAL_FLAGSHIP_IDENTITY_ID;
  static readonly OFFICIAL_FLAGSHIP_TITLE = OFFICIAL_FLAGSHIP_TITLE;
  static readonly OFFICIAL_MISSION_IDS = [...OFFICIAL_MISSION_IDS];

  private readonly releaseCandidate: CyreReleaseCandidate;
  private readonly nowFn: () => number;

  constructor(options: CyreReleaseOptions = {}) {
    if (options.now !== undefined && typeof options.now !== 'function') {
      throw new Error('CyreRelease now must be a function if provided.');
    }

    this.nowFn = options.now ?? (() => Date.now());

    if (options.releaseCandidate !== undefined) {
      if (!(options.releaseCandidate instanceof CyreReleaseCandidate)) {
        throw new Error(
          'CyreRelease releaseCandidate must be a CyreReleaseCandidate instance if provided.',
        );
      }

      this.releaseCandidate = options.releaseCandidate;
      return;
    }

    const releaseChannelManager =
      options.releaseChannelManager ??
      new ReleaseChannelManager({
        channels: ['nightly', 'development', 'beta', 'stable'],
        activeChannel: 'stable',
      });

    this.releaseCandidate = new CyreReleaseCandidate({
      engineVersion: options.engineVersion ?? OFFICIAL_ENGINE_VERSION,
      releaseChannelManager,
      requireStableVersion: true,
    });
  }

  static createDefault(options: CyreReleaseOptions = {}): CyreRelease {
    return new CyreRelease(options);
  }

  getReleaseCandidate(): CyreReleaseCandidate {
    return this.releaseCandidate;
  }

  validate(): void {
    const version = this.releaseCandidate.getEngineVersion();
    const expectedVersion = SemanticVersion.parse(OFFICIAL_ENGINE_VERSION);

    if (!version.equals(expectedVersion)) {
      throw new Error(
        `CYRE v1.0 requires engine version ${OFFICIAL_ENGINE_VERSION}; got ${version.toString()}.`,
      );
    }

    this.releaseCandidate.validate();

    const flagshipSnapshot = this.releaseCandidate
      .getFlagshipCandidate()
      .snapshot();

    if (flagshipSnapshot.identityId !== OFFICIAL_FLAGSHIP_IDENTITY_ID) {
      throw new Error(
        `CYRE v1.0 requires flagship identity "${OFFICIAL_FLAGSHIP_IDENTITY_ID}"; got "${flagshipSnapshot.identityId}".`,
      );
    }

    if (flagshipSnapshot.gameTitle !== OFFICIAL_FLAGSHIP_TITLE) {
      throw new Error(
        `CYRE v1.0 requires flagship title "${OFFICIAL_FLAGSHIP_TITLE}"; got "${flagshipSnapshot.gameTitle}".`,
      );
    }

    if (!arraysEqualSorted(this.releaseCandidate.getMissionIds(), OFFICIAL_MISSION_IDS)) {
      throw new Error(
        `CYRE v1.0 requires official missions: ${OFFICIAL_MISSION_IDS.join(', ')}.`,
      );
    }
  }

  release(): CyreReleaseManifest {
    this.validate();

    const report = this.releaseCandidate.run();

    if (!report.passed) {
      throw new Error(`CYRE v1.0 release failed: ${report.summary}`);
    }

    const flagshipSnapshot = this.releaseCandidate
      .getFlagshipCandidate()
      .snapshot();

    const releasedAt = this.nowFn();
    const totalBuildCount = report.buildProfileCount;
    const successfulBuildCount = report.successfulBuildCount;

    return {
      engineVersion: this.releaseCandidate.getEngineVersion().toString(),
      releaseChannel: this.releaseCandidate.getReleaseChannelManager().getActive(),
      gameTitle: flagshipSnapshot.gameTitle,
      gameCodename: flagshipSnapshot.gameCodename,
      identityId: flagshipSnapshot.identityId,
      targetPlatforms: [...flagshipSnapshot.targetPlatforms],
      campaignId: flagshipSnapshot.campaignId,
      missionIds: [...this.releaseCandidate.getMissionIds()],
      buildProfileIds: [
        ...this.releaseCandidate.getBuildPipeline().listProfileIds(),
      ],
      successfulBuildCount,
      totalBuildCount,
      releasedAt,
      summary: [
        'CYRE v1.0',
        `engine=${this.releaseCandidate.getEngineVersion().toString()}`,
        `channel=${this.releaseCandidate.getReleaseChannelManager().getActive()}`,
        `game=${flagshipSnapshot.gameTitle}`,
        `missions=${this.releaseCandidate.getMissionIds().length}`,
        `builds=${successfulBuildCount}/${totalBuildCount}`,
        'passed=true',
      ].join(' | '),
    };
  }
}
