import { describe, expect, it } from 'vitest';
import {
  RELEASE_CHANNELS,
  isReleaseChannel,
} from '../ReleaseChannelTypes.js';
import { ReleaseChannelManager } from '../ReleaseChannelManager.js';

describe('ReleaseChannelTypes', () => {
  it('exposes the official release channels', () => {
    expect(RELEASE_CHANNELS).toEqual([
      'nightly',
      'development',
      'beta',
      'stable',
    ]);
  });

  it('recognizes valid and invalid channel names', () => {
    expect(isReleaseChannel('nightly')).toBe(true);
    expect(isReleaseChannel('stable')).toBe(true);
    expect(isReleaseChannel('production')).toBe(false);
    expect(isReleaseChannel('')).toBe(false);
  });
});

describe('ReleaseChannelManager', () => {
  it('defaults to development and includes all official channels', () => {
    const manager = new ReleaseChannelManager();

    expect(manager.getActive()).toBe('development');
    expect(manager.list()).toEqual([
      'nightly',
      'development',
      'beta',
      'stable',
    ]);
  });

  it('updates the active channel when valid and configured', () => {
    const manager = new ReleaseChannelManager();

    manager.setActive('stable');

    expect(manager.getActive()).toBe('stable');
    expect(manager.isSupported('stable')).toBe(true);
  });

  it('throws when setting an invalid or unconfigured channel', () => {
    const manager = new ReleaseChannelManager({
      channels: ['stable', 'beta'],
      activeChannel: 'beta',
    });

    expect(() => manager.setActive('nightly')).toThrow(/not configured/);
    expect(() => manager.setActive('production')).toThrow(/Invalid release channel/);
  });

  it('supports custom channel subsets', () => {
    const manager = new ReleaseChannelManager({
      channels: ['nightly', 'stable'],
      activeChannel: 'nightly',
    });

    expect(manager.list()).toEqual(['nightly', 'stable']);
    expect(manager.getActive()).toBe('nightly');
    expect(manager.isSupported('development')).toBe(false);
  });

  it('rejects duplicate channels', () => {
    expect(
      () =>
        new ReleaseChannelManager({
          channels: ['stable', 'stable'],
        }),
    ).toThrow(/must be unique/);
  });

  it('rejects an empty channel list', () => {
    expect(() => new ReleaseChannelManager({ channels: [] })).toThrow(
      /at least one release channel/,
    );
  });

  it('rejects an active channel that is not configured', () => {
    expect(
      () =>
        new ReleaseChannelManager({
          channels: ['stable', 'beta'],
          activeChannel: 'nightly',
        }),
    ).toThrow(/not in the configured channels/);
  });

  it('validates cleanly and produces a snapshot', () => {
    const manager = new ReleaseChannelManager({
      channels: ['development', 'stable'],
      activeChannel: 'stable',
    });

    expect(() => manager.validate()).not.toThrow();

    expect(manager.snapshot()).toEqual({
      activeChannel: 'stable',
      channels: ['development', 'stable'],
    });
  });
});
