import { describe, expect, it } from 'vitest';
import { CyreRelease } from '../CyreRelease.js';
import { CyreReleaseCandidate } from '../CyreReleaseCandidate.js';
import { ReleaseChannelManager } from '../ReleaseChannelManager.js';

describe('CyreRelease', () => {
  it('releases CYRE v1.0 successfully by default', () => {
    const release = CyreRelease.createDefault();
    const manifest = release.release();

    expect(manifest.engineVersion).toBe('1.0.0');
    expect(manifest.releaseChannel).toBe('stable');
    expect(manifest.gameTitle).toBe('SOC Command');
    expect(manifest.identityId).toBe('cyre-soc-command');
    expect(manifest.missionIds).toEqual([
      'mission-001',
      'mission-002',
      'mission-003',
      'mission-004',
      'mission-005',
    ]);
    expect(manifest.successfulBuildCount).toBe(manifest.totalBuildCount);
    expect(manifest.successfulBuildCount).toBe(4);
    expect(manifest.summary).toContain('CYRE v1.0');
    expect(manifest.summary).toContain('passed=true');
  });

  it('validates cleanly for CYRE v1.0', () => {
    const release = CyreRelease.createDefault();

    expect(() => release.validate()).not.toThrow();
  });

  it('rejects a non-official engine version', () => {
    const release = CyreRelease.createDefault({
      engineVersion: '1.0.1',
    });

    expect(() => release.validate()).toThrow(/requires engine version 1\.0\.0/);
  });

  it('rejects a pre-release engine version when stable is required', () => {
    const release = CyreRelease.createDefault({
      engineVersion: '1.0.0-rc.1',
    });

    expect(() => release.release()).toThrow(/requires engine version 1\.0\.0/);
  });

  it('rejects a non-stable release channel', () => {
    const release = CyreRelease.createDefault({
      releaseChannelManager: new ReleaseChannelManager({
        channels: ['beta', 'stable'],
        activeChannel: 'beta',
      }),
    });

    expect(() => release.release()).toThrow(/stable release channel/);
  });

  it('rejects a release candidate without the official mission set', () => {
    const candidate = new CyreReleaseCandidate({
      missionIds: ['mission-001', 'mission-002'],
    });

    const release = new CyreRelease({ releaseCandidate: candidate });

    expect(() => release.release()).toThrow(/requires official missions/);
  });

  it('accepts an injected valid release candidate', () => {
    const candidate = CyreReleaseCandidate.createDefault();
    const release = new CyreRelease({ releaseCandidate: candidate });

    const manifest = release.release();

    expect(manifest.engineVersion).toBe('1.0.0');
    expect(manifest.gameTitle).toBe('SOC Command');
    expect(manifest.successfulBuildCount).toBe(4);
  });

  it('exposes official CYRE v1.0 constants', () => {
    expect(CyreRelease.OFFICIAL_ENGINE_VERSION).toBe('1.0.0');
    expect(CyreRelease.OFFICIAL_FLAGSHIP_IDENTITY_ID).toBe('cyre-soc-command');
    expect(CyreRelease.OFFICIAL_FLAGSHIP_TITLE).toBe('SOC Command');
    expect(CyreRelease.OFFICIAL_MISSION_IDS).toEqual([
      'mission-001',
      'mission-002',
      'mission-003',
      'mission-004',
      'mission-005',
    ]);
  });
});
