export const AUDIO_CHANNELS = [
  'master',
  'music',
  'ambient',
  'sfx',
  'voice',
] as const;

export type AudioChannel = (typeof AUDIO_CHANNELS)[number];

export function isAudioChannel(value: string): value is AudioChannel {
  return (AUDIO_CHANNELS as readonly string[]).includes(value);
}

export const AUDIO_CLIP_KINDS = [
  'music',
  'ambient',
  'interface',
  'alert',
  'feedback',
] as const;

export type AudioClipKind = (typeof AUDIO_CLIP_KINDS)[number];

export function isAudioClipKind(value: string): value is AudioClipKind {
  return (AUDIO_CLIP_KINDS as readonly string[]).includes(value);
}

export const AUDIO_PLAYBACK_STATES = [
  'stopped',
  'playing',
  'paused',
] as const;

export type AudioPlaybackState = (typeof AUDIO_PLAYBACK_STATES)[number];

export function isAudioPlaybackState(value: string): value is AudioPlaybackState {
  return (AUDIO_PLAYBACK_STATES as readonly string[]).includes(value);
}

export const AUDIO_EVENT_TYPES = [
  'clip-registered',
  'clip-unregistered',
  'play',
  'pause',
  'resume',
  'stop',
  'volume-change',
] as const;

export type AudioEventType = (typeof AUDIO_EVENT_TYPES)[number];

export function isAudioEventType(value: string): value is AudioEventType {
  return (AUDIO_EVENT_TYPES as readonly string[]).includes(value);
}

export interface AudioEvent {
  id: string;
  type: AudioEventType;
  timestamp: number;
  clipId?: string;
  channel?: AudioChannel;
  data?: Record<string, unknown>;
}
