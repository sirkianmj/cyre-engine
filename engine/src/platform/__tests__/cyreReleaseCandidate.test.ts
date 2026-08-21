import { describe, expect, it } from 'vitest';
import { CyreReleaseCandidate } from '../CyreReleaseCandidate.js';
import { ReleaseChannelManager } from '../ReleaseChannelManager.js';
import { BuildPipeline } from '../BuildPipeline.js';
import { BuildProfile } from '../BuildProfile.js';

describe('CyreReleaseCandidate', () => {
  it('creates a default stable CYRE release candidate', () => {
    const candidate = CyreReleaseCandidate.createDefault();

    expect(candidate.getEngineVersion().toString()).toBe('1.0.0');
    expect(candidate.getReleaseChannelManager().getActive()).toBe('stable');
    expect(candidate.getFlagshipCandidate().getIdentity().getTitle()).toBe('SOC Command');
    expect(candidate.getMissionIds()).toEqual([
      'mission-001',
      'mission-002',
      'mission-003',
      'mission-004',
      'mission-005',
    ]);
  });

  it('runs the full release candidate successfully', () => {
    const candidate = CyreReleaseCandidate.createDefault();
    const report = candidate.run();

    expect(report.passed).toBe(true);
    expect(report.engineVersion).toBe('1.0.0');
    expect(report.releaseChannel).toBe('stable');
    expect(report.gameTitle).toBe('SOC Command');
    expect(report.campaignId).toBe('flagship-soc-command');
    expect(report.missionCount).toBe(5);
    expect(report.validatedMissionCount).toBe(5);
    expect(report.buildProfileCount).toBe(4);
    expect(report.successfulBuildCount).toBe(4);
    expect(report.summary).toContain('passed=true');
  });

  it('validates cleanly', () => {
    const candidate = CyreReleaseCandidate.createDefault();

    expect(() => candidate.validate()).not.toThrow();
  });

  it('rejects a non-stable engine version when stable is required', () => {
    const candidate = CyreReleaseCandidate.createDefault({
      engineVersion: '1.0.0-rc.1',
    });

    expect(() => candidate.validate()).toThrow(/stable engine version/);
  });

  it('rejects a non-stable release channel when stable is required', () => {
    const candidate = CyreReleaseCandidate.createDefault({
      releaseChannelManager: new ReleaseChannelManager({
        channels: ['beta', 'stable'],
        activeChannel: 'beta',
      }),
    });

    expect(() => candidate.validate()).toThrow(/stable release channel/);
  });

  it('supports custom mission lists', () => {
    const candidate = CyreReleaseCandidate.createDefault({
      missionIds: ['mission-001', 'mission-002'],
    });

    expect(candidate.getMissionIds()).toEqual(['mission-001', 'mission-002']);
    expect(candidate.run().missionCount).toBe(2);
  });

  it('rejects missing mission registration', () => {
    const candidate = CyreReleaseCandidate.createDefault({
      missionIds: ['missing-mission'],
    });

    expect(() => candidate.validate()).toThrow(/is not registered/);
  });

  it('uses an injected valid build pipeline and produces a successful report', () => {
    const pipeline = new BuildPipeline();
    pipeline.registerProfile(new BuildProfile({
      id: 'custom-release-profile',
      name: 'Custom Release Profile',
      target: 'web',
      flavor: 'production',
    }));

    const candidate = CyreReleaseCandidate.createDefault({
      buildPipeline: pipeline,
    });

    const report = candidate.run();

    expect(candidate.getBuildPipeline().listProfileIds()).toEqual([
      'custom-release-profile',
    ]);
    expect(report.passed).toBe(true);
    expect(report.buildProfileCount).toBe(1);
    expect(report.successfulBuildCount).toBe(1);
    expect(report.summary).toContain('passed=true');
  });

  it('injects a stable release channel manager', () => {
    const manager = new ReleaseChannelManager({
      channels: ['stable'],
      activeChannel: 'stable',
    });

    const candidate = CyreReleaseCandidate.createDefault({
      releaseChannelManager: manager,
    });

    expect(candidate.getReleaseChannelManager().getActive()).toBe('stable');
    expect(candidate.run().releaseChannel).toBe('stable');
  });
});
