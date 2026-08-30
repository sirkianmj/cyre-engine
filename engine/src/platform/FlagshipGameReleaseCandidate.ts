import {
  Campaign,
  Difficulty,
  GameIdentity,
  GameIdentityRegistry,
  MissionFactory,
  PlayerProgression,
} from '../game/index.js';
import { BuildPipeline } from './BuildPipeline.js';
import type { BuildResult } from './BuildPipeline.js';
import { BuildProfile } from './BuildProfile.js';
import { ReleaseChannelManager } from './ReleaseChannelManager.js';
import type { ReleaseChannel } from './ReleaseChannelTypes.js';

export interface FlagshipGameReleaseCandidateOptions {
  identity?: GameIdentity;
  campaign?: Campaign;
  player?: PlayerProgression;
  releaseChannelManager?: ReleaseChannelManager;
  buildPipeline?: BuildPipeline;
  missionIds?: string[];
  difficulty?: Difficulty;
}

export interface FlagshipGameReleaseCandidateSnapshot {
  gameTitle: string;
  gameCodename: string;
  identityId: string;
  targetPlatforms: string[];
  releaseChannel: ReleaseChannel;
  campaignId: string;
  currentMissionId: string | null;
  completedMissionIds: string[];
  availableMissionIds: string[];
  campaignComplete: boolean;
  playerLevel: number;
  buildProfileIds: string[];
  summary: string;
}

const DEFAULT_RELEASE_CHANNELS: ReleaseChannel[] = [
  'nightly',
  'development',
  'beta',
  'stable',
];

export class FlagshipGameReleaseCandidate {
  private readonly identity: GameIdentity;
  private readonly identityRegistry: GameIdentityRegistry;
  private readonly campaign: Campaign;
  private readonly releaseChannelManager: ReleaseChannelManager;
  private readonly buildPipeline: BuildPipeline;

  constructor(options: FlagshipGameReleaseCandidateOptions = {}) {
    const identity =
      options.identity ?? GameIdentity.createDefaultFlagshipIdentity();

    this.identity = identity.clone();
    this.identityRegistry = new GameIdentityRegistry(
      'CYRE Flagship Game Identity Registry',
    );
    this.identityRegistry.register(this.identity.clone());

    this.releaseChannelManager =
      options.releaseChannelManager ??
      new ReleaseChannelManager({
        channels: DEFAULT_RELEASE_CHANNELS,
        activeChannel: 'beta',
      });

    this.buildPipeline = options.buildPipeline ?? new BuildPipeline();

    const missionIds = options.missionIds ?? MissionFactory.list().sort();
    this.campaign =
      options.campaign ??
      new Campaign(
        'flagship-soc-command',
        this.identity.getTitle(),
        missionIds,
        {
          difficulty: options.difficulty ?? Difficulty.Normal,
          player: options.player ?? new PlayerProgression(),
        },
      );

    this.registerDefaultBuildProfiles();
  }

  static createDefault(
    options: FlagshipGameReleaseCandidateOptions = {},
  ): FlagshipGameReleaseCandidate {
    return new FlagshipGameReleaseCandidate(options);
  }

  getIdentity(): GameIdentity {
    return this.identity.clone();
  }

  getIdentityRegistry(): GameIdentityRegistry {
    return this.identityRegistry;
  }

  getCampaign(): Campaign {
    return this.campaign;
  }

  getReleaseChannelManager(): ReleaseChannelManager {
    return this.releaseChannelManager;
  }

  getBuildPipeline(): BuildPipeline {
    return this.buildPipeline;
  }

  registerDefaultBuildProfiles(): void {
    const profiles = [
      new BuildProfile({
        id: 'flagship-web-production',
        name: 'SOC Command Web Production',
        target: 'web',
        flavor: 'production',
        settings: { game: this.identity.getId() },
      }),
      new BuildProfile({
        id: 'flagship-mobile-production',
        name: 'SOC Command Mobile Production',
        target: 'mobile',
        flavor: 'production',
        settings: { game: this.identity.getId() },
      }),
      new BuildProfile({
        id: 'flagship-desktop-production',
        name: 'SOC Command Desktop Production',
        target: 'desktop',
        flavor: 'production',
        settings: { game: this.identity.getId() },
      }),
      new BuildProfile({
        id: 'flagship-console-production',
        name: 'SOC Command Console Production',
        target: 'console',
        flavor: 'production',
        settings: { game: this.identity.getId() },
      }),
    ];

    for (const profile of profiles) {
      if (!this.buildPipeline.listProfileIds().includes(profile.id)) {
        this.buildPipeline.registerProfile(profile);
      }
    }
  }

  buildAllReleaseProfiles(): BuildResult[] {
    return this.buildPipeline.buildAll();
  }

  validate(): void {
    this.identityRegistry.validate();
    this.releaseChannelManager.validate();
    this.buildPipeline.validate();

    if (this.buildPipeline.listProfileIds().length === 0) {
      throw new Error('Flagship release candidate requires at least one build profile.');
    }

    if (this.campaign.getMissionIds().length === 0) {
      throw new Error('Flagship release candidate campaign must contain at least one mission.');
    }
  }

  snapshot(): FlagshipGameReleaseCandidateSnapshot {
    const campaignProgress = this.campaign.getProgress();
    const playerStats = this.campaign.getPlayer().getStats();
    const buildProfileIds = this.buildPipeline.listProfileIds();
    const completedMissions = campaignProgress.completedMissionIds.length;
    const availableMissions = campaignProgress.availableMissionIds.length;

    return {
      gameTitle: this.identity.getTitle(),
      gameCodename: this.identity.getCodename(),
      identityId: this.identity.getId(),
      targetPlatforms: [...this.identity.getTargetPlatforms()],
      releaseChannel: this.releaseChannelManager.getActive(),
      campaignId: this.campaign.id,
      currentMissionId: campaignProgress.currentMissionId,
      completedMissionIds: [...campaignProgress.completedMissionIds],
      availableMissionIds: [...campaignProgress.availableMissionIds],
      campaignComplete: campaignProgress.isComplete,
      playerLevel: playerStats.level,
      buildProfileIds: [...buildProfileIds],
      summary: [
        `${this.identity.getTitle()} Release Candidate`,
        `channel=${this.releaseChannelManager.getActive()}`,
        `missions=${completedMissions}/${availableMissions}`,
        `profiles=${buildProfileIds.length}`,
      ].join(' | '),
    };
  }
}
