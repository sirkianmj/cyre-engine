import {
  RELEASE_CHANNELS,
  isReleaseChannel,
  type ReleaseChannel,
  type ReleaseChannelManagerOptions,
  type ReleaseChannelManagerSnapshot,
} from './ReleaseChannelTypes.js';

export class ReleaseChannelManager {
  private readonly channels: readonly ReleaseChannel[];
  private activeChannel: ReleaseChannel;

  constructor(options: ReleaseChannelManagerOptions = {}) {
    const channels = options.channels ? [...options.channels] : [...RELEASE_CHANNELS];

    if (channels.length === 0) {
      throw new Error('ReleaseChannelManager requires at least one release channel.');
    }

    const uniqueChannels = new Set(channels);
    if (uniqueChannels.size !== channels.length) {
      throw new Error('ReleaseChannelManager channels must be unique.');
    }

    for (const channel of channels) {
      if (!isReleaseChannel(channel)) {
        throw new Error(`Invalid release channel "${channel}".`);
      }
    }

    const activeChannel = options.activeChannel ?? 'development';
    if (!isReleaseChannel(activeChannel)) {
      throw new Error(`Invalid active release channel "${activeChannel}".`);
    }

    if (!channels.includes(activeChannel)) {
      throw new Error(
        `Active release channel "${activeChannel}" is not in the configured channels.`,
      );
    }

    this.channels = Object.freeze([...channels]);
    this.activeChannel = activeChannel;
  }

  list(): ReleaseChannel[] {
    return [...this.channels];
  }

  getActive(): ReleaseChannel {
    return this.activeChannel;
  }

  setActive(channel: string): void {
    if (!isReleaseChannel(channel)) {
      throw new Error(`Invalid release channel "${channel}".`);
    }

    if (!this.channels.includes(channel)) {
      throw new Error(`Release channel "${channel}" is not configured.`);
    }

    this.activeChannel = channel;
  }

  isSupported(channel: string): boolean {
    return isReleaseChannel(channel) && this.channels.includes(channel);
  }

  validate(): void {
    if (this.channels.length === 0) {
      throw new Error('ReleaseChannelManager must have at least one channel.');
    }

    if (!this.channels.includes(this.activeChannel)) {
      throw new Error('Active release channel is not configured.');
    }

    const uniqueChannels = new Set(this.channels);
    if (uniqueChannels.size !== this.channels.length) {
      throw new Error('ReleaseChannelManager channels must be unique.');
    }
  }

  snapshot(): ReleaseChannelManagerSnapshot {
    return {
      activeChannel: this.activeChannel,
      channels: [...this.channels],
    };
  }
}
