export const RELEASE_CHANNELS = [
  'nightly',
  'development',
  'beta',
  'stable',
] as const;

export type ReleaseChannel = (typeof RELEASE_CHANNELS)[number];

export function isReleaseChannel(value: string): value is ReleaseChannel {
  return (RELEASE_CHANNELS as readonly string[]).includes(value);
}

export interface ReleaseChannelManagerOptions {
  channels?: readonly ReleaseChannel[];
  activeChannel?: ReleaseChannel;
}

export interface ReleaseChannelManagerSnapshot {
  activeChannel: ReleaseChannel;
  channels: ReleaseChannel[];
}
