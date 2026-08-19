import { AudioClipDescriptor } from './AudioClipDescriptor.js';
import { AudioMixer } from './AudioMixer.js';
import type { AudioMixerSnapshot } from './AudioMixer.js';
import {
  AUDIO_CHANNELS,
  isAudioChannel,
  isAudioEventType,
  type AudioChannel,
  type AudioClipKind,
  type AudioEvent,
  type AudioEventType,
  type AudioPlaybackState,
} from './AudioTypes.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export interface AudioSystemSnapshot {
  name: string;
  clipCount: number;
  activeClipCount: number;
  eventCount: number;
  mixer: AudioMixerSnapshot;
  activeClips: string[];
  recentEvents: AudioEvent[];
  summary: string;
}

export interface AudioSystemOptions {
  name?: string;
  now?: () => number;
}

export class AudioSystem {
  readonly name: string;
  private readonly nowFn: () => number;
  private readonly clips = new Map<string, AudioClipDescriptor>();
  private readonly playbackStates = new Map<string, AudioPlaybackState>();
  private readonly mixer = new AudioMixer();
  private readonly events: AudioEvent[] = [];
  private nextEventSequence = 1;

  constructor(options: AudioSystemOptions = {}) {
    if (options.name !== undefined && options.name.trim() === '') {
      throw new Error('AudioSystem name cannot be empty if provided.');
    }
    if (options.now !== undefined && typeof options.now !== 'function') {
      throw new Error('AudioSystem now must be a function if provided.');
    }

    this.name = options.name ?? 'CYRE Audio System';
    this.nowFn = options.now ?? (() => Date.now());
  }

  now(): number {
    return this.nowFn();
  }

  registerClip(descriptor: AudioClipDescriptor): void {
    descriptor.validate();
    if (this.clips.has(descriptor.id)) {
      throw new Error(`Audio clip "${descriptor.id}" is already registered.`);
    }
    this.clips.set(descriptor.id, descriptor.clone());
    this.playbackStates.set(descriptor.id, 'stopped');
    this.recordEvent('clip-registered', {
      clipId: descriptor.id,
      kind: descriptor.kind,
    });
  }

  unregisterClip(id: string): void {
    this.ensureClip(id);
    this.clips.delete(id);
    this.playbackStates.delete(id);
    this.recordEvent('clip-unregistered', { clipId: id });
  }

  hasClip(id: string): boolean {
    return this.clips.has(id);
  }

  getClip(id: string): AudioClipDescriptor | undefined {
    const clip = this.clips.get(id);
    return clip !== undefined ? clip.clone() : undefined;
  }

  listClips(): AudioClipDescriptor[] {
    return Array.from(this.clips.values()).map((clip) => clip.clone());
  }

  listClipsByKind(kind: AudioClipKind): AudioClipDescriptor[] {
    return this.listClips().filter((clip) => clip.kind === kind);
  }

  play(
    clipId: string,
    channel: AudioChannel = 'sfx',
    data?: Record<string, unknown>,
  ): void {
    this.ensureClip(clipId);
    if (!isAudioChannel(channel)) {
      throw new Error(`Invalid audio channel "${channel}".`);
    }
    if (data !== undefined && !isRecord(data)) {
      throw new Error('Audio play data must be an object if provided.');
    }
    if (this.playbackStates.get(clipId) === 'playing') {
      throw new Error(`Audio clip "${clipId}" is already playing.`);
    }

    this.playbackStates.set(clipId, 'playing');
    this.recordEvent('play', { clipId, channel, data });
  }

  pause(clipId: string): void {
    this.ensureClip(clipId);
    if (this.playbackStates.get(clipId) !== 'playing') {
      throw new Error(`Audio clip "${clipId}" is not playing.`);
    }
    this.playbackStates.set(clipId, 'paused');
    this.recordEvent('pause', { clipId });
  }

  resume(clipId: string): void {
    this.ensureClip(clipId);
    if (this.playbackStates.get(clipId) !== 'paused') {
      throw new Error(`Audio clip "${clipId}" is not paused.`);
    }
    this.playbackStates.set(clipId, 'playing');
    this.recordEvent('resume', { clipId });
  }

  stop(clipId: string): void {
    this.ensureClip(clipId);
    if (this.playbackStates.get(clipId) === 'stopped') {
      throw new Error(`Audio clip "${clipId}" is already stopped.`);
    }
    this.playbackStates.set(clipId, 'stopped');
    this.recordEvent('stop', { clipId });
  }

  getPlaybackState(clipId: string): AudioPlaybackState {
    this.ensureClip(clipId);
    return this.playbackStates.get(clipId) ?? 'stopped';
  }

  getActiveClips(): string[] {
    return Array.from(this.playbackStates.entries())
      .filter(([, state]) => state === 'playing')
      .map(([id]) => id)
      .sort();
  }

  setMasterVolume(volume: number): void {
    this.mixer.setMasterVolume(volume);
    this.recordEvent('volume-change', { channel: 'master', volume });
  }

  getMasterVolume(): number {
    return this.mixer.getMasterVolume();
  }

  setMuted(muted: boolean): void {
    this.mixer.setMuted(muted);
    this.recordEvent('volume-change', { channel: 'master', muted });
  }

  isMuted(): boolean {
    return this.mixer.isMuted();
  }

  setChannelVolume(channel: AudioChannel, volume: number): void {
    if (!isAudioChannel(channel)) {
      throw new Error(`Invalid audio channel "${channel}".`);
    }
    this.mixer.setChannelVolume(channel, volume);
    this.recordEvent('volume-change', { channel, volume });
  }

  getChannelVolume(channel: AudioChannel): number {
    return this.mixer.getChannelVolume(channel);
  }

  getMixerSnapshot(): AudioMixerSnapshot {
    return this.mixer.getSnapshot();
  }

  getEvents(): AudioEvent[] {
    return this.events.map((event) => deepClone(event));
  }

  getRecentEvents(limit = 20): AudioEvent[] {
    if (!Number.isInteger(limit) || limit < 0) {
      throw new Error('Audio event limit must be a non-negative integer.');
    }
    return this.events.slice(-limit).map((event) => deepClone(event));
  }

  validate(): void {
    if (!this.name || this.name.trim() === '') {
      throw new Error('AudioSystem name is required.');
    }
    this.mixer.validate();
    for (const clip of this.clips.values()) {
      clip.validate();
    }
    for (const event of this.events) {
      if (!isAudioEventType(event.type)) {
        throw new Error(`Invalid audio event type "${event.type}".`);
      }
    }
  }

  createSnapshot(): AudioSystemSnapshot {
    const mixer = this.mixer.getSnapshot();
    const activeClips = this.getActiveClips();

    return {
      name: this.name,
      clipCount: this.clips.size,
      activeClipCount: activeClips.length,
      eventCount: this.events.length,
      mixer,
      activeClips,
      recentEvents: this.getRecentEvents(20),
      summary: [
        this.name,
        `${this.clips.size} clips`,
        `${activeClips.length} active`,
        `${this.events.length} events`,
        `masterVolume=${mixer.masterVolume}`,
        mixer.muted ? 'muted' : 'unmuted',
      ].join(' | '),
    };
  }

  private ensureClip(id: string): void {
    if (!this.clips.has(id)) {
      throw new Error(`Audio clip "${id}" does not exist.`);
    }
  }

  private recordEvent(
    type: AudioEventType,
    data: { clipId?: string; channel?: AudioChannel; kind?: AudioClipKind; volume?: number; muted?: boolean; data?: Record<string, unknown> } = {},
  ): void {
    const event: AudioEvent = {
      id: `audio-event-${this.nextEventSequence}`,
      type,
      timestamp: this.now(),
      clipId: data.clipId,
      channel: data.channel,
      data: data.data !== undefined ? deepClone(data.data) : undefined,
    };
    this.nextEventSequence += 1;
    this.events.push(event);
  }
}
