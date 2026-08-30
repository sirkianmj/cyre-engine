import { describe, expect, it } from 'vitest';
import {
  FlagshipGameReleaseCandidate,
} from '../FlagshipGameReleaseCandidate.js';
import { ReleaseChannelManager } from '../ReleaseChannelManager.js';

describe('FlagshipGameReleaseCandidate', () => {
  it('creates a default release candidate from the real flagship identity', () => {
    const candidate = FlagshipGameReleaseCandidate.createDefault();

    expect(candidate.getIdentity().getId()).toBe('cyre-soc-command');
    expect(candidate.getIdentity().getTitle()).toBe('SOC Command');
    expect(candidate.getReleaseChannelManager().getActive()).toBe('beta');
    expect(candidate.getCampaign().getMissionIds()).toEqual([
      'mission-001',
      'mission-002',
      'mission-003',
      'mission-004',
      'mission-005',
    ]);
  });

  it('registers default production build profiles', () => {
    const candidate = FlagshipGameReleaseCandidate.createDefault();
    const profileIds = candidate.getBuildPipeline().listProfileIds();

    expect(profileIds).toEqual([
      'flagship-console-production',
      'flagship-desktop-production',
      'flagship-mobile-production',
      'flagship-web-production',
    ]);
  });

  it('registers default profiles idempotently', () => {
    const candidate = FlagshipGameReleaseCandidate.createDefault();
    const initialIds = candidate.getBuildPipeline().listProfileIds();

    candidate.registerDefaultBuildProfiles();

    expect(candidate.getBuildPipeline().listProfileIds()).toEqual(initialIds);
  });

  it('builds all release profiles successfully', () => {
    const candidate = FlagshipGameReleaseCandidate.createDefault();
    const results = candidate.buildAllReleaseProfiles();

    expect(results).toHaveLength(4);
    expect(results.every((result) => result.success)).toBe(true);
    expect(results.every((result) => result.flavor)).toBe(true);
  });

  it('validates the release candidate cleanly', () => {
    const candidate = FlagshipGameReleaseCandidate.createDefault();

    expect(() => candidate.validate()).not.toThrow();
  });

  it('produces a release snapshot with real campaign and channel state', () => {
    const candidate = FlagshipGameReleaseCandidate.createDefault();
    const snapshot = candidate.snapshot();

    expect(snapshot.gameTitle).toBe('SOC Command');
    expect(snapshot.gameCodename).toBe('Project Reality Breach');
    expect(snapshot.identityId).toBe('cyre-soc-command');
    expect(snapshot.releaseChannel).toBe('beta');
    expect(snapshot.campaignId).toBe('flagship-soc-command');
    expect(snapshot.currentMissionId).toBe('mission-001');
    expect(snapshot.campaignComplete).toBe(false);
    expect(snapshot.playerLevel).toBe(1);
    expect(snapshot.summary).toContain('SOC Command Release Candidate');
    expect(snapshot.summary).toContain('channel=beta');
  });

  it('supports injecting a stable release channel manager', () => {
    const releaseChannelManager = new ReleaseChannelManager({
      channels: ['beta', 'stable'],
      activeChannel: 'stable',
    });

    const candidate = FlagshipGameReleaseCandidate.createDefault({
      releaseChannelManager,
    });

    expect(candidate.getReleaseChannelManager().getActive()).toBe('stable');
    expect(candidate.snapshot().releaseChannel).toBe('stable');
  });

  it('throws when validation fails due to missing build profiles', () => {
    const candidate = FlagshipGameReleaseCandidate.createDefault();

    const profileIds = candidate.getBuildPipeline().listProfileIds();
    for (const profileId of profileIds) {
      candidate.getBuildPipeline().unregisterProfile(profileId);
    }

    expect(() => candidate.validate()).toThrow(/at least one build profile/);
  });
});
