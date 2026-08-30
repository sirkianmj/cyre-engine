import {
  AUDIO_CHANNELS,
  isAudioChannel,
  type AudioChannel,
} from './AudioTypes.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function assertVolume(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`${label} must be between 0 and 1.`);
  }
}

export interface AudioMixerSnapshot {
  masterVolume: number;
  muted: boolean;
  channelVolumes: Record<AudioChannel, number>;
}

export class AudioMixer {
  private masterVolume = 1;
  private muted = false;
  private readonly channelVolumes: Map<AudioChannel, number>;

  constructor(initialVolumes: Partial<Record<AudioChannel, number>> = {}) {
    this.channelVolumes = new Map();
    for (const channel of AUDIO_CHANNELS) {
      this.channelVolumes.set(channel, 1);
    }
    if (!isRecord(initialVolumes)) {
      throw new Error('Audio mixer initial volumes must be an object.');
    }
    for (const [channel, volume] of Object.entries(initialVolumes)) {
      if (!isAudioChannel(channel)) {
        throw new Error(`Invalid audio channel "${channel}".`);
      }
      this.setChannelVolume(channel, volume);
    }
  }

  getMasterVolume(): number {
    return this.masterVolume;
  }

  isMuted(): boolean {
    return this.muted;
  }

  setMasterVolume(volume: number): void {
    assertVolume(volume, 'Master volume');
    this.masterVolume = volume;
  }

  setMuted(muted: boolean): void {
    if (typeof muted !== 'boolean') {
      throw new Error('Audio mixer muted must be a boolean.');
    }
    this.muted = muted;
  }

  setChannelVolume(channel: AudioChannel, volume: number): void {
    if (!isAudioChannel(channel)) {
      throw new Error(`Invalid audio channel "${channel}".`);
    }
    assertVolume(volume, `Channel "${channel}" volume`);
    this.channelVolumes.set(channel, volume);
  }

  getChannelVolume(channel: AudioChannel): number {
    if (!isAudioChannel(channel)) {
      throw new Error(`Invalid audio channel "${channel}".`);
    }
    return this.channelVolumes.get(channel) ?? 1;
  }

  getSnapshot(): AudioMixerSnapshot {
    const channelVolumes = {} as Record<AudioChannel, number>;
    for (const channel of AUDIO_CHANNELS) {
      channelVolumes[channel] = this.getChannelVolume(channel);
    }

    return {
      masterVolume: this.masterVolume,
      muted: this.muted,
      channelVolumes: deepClone(channelVolumes),
    };
  }

  validate(): void {
    assertVolume(this.masterVolume, 'Master volume');
    for (const channel of AUDIO_CHANNELS) {
      this.getChannelVolume(channel);
    }
  }
}
