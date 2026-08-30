import { describe, it, expect } from 'vitest';
import {
  AudioClipDescriptor,
  AudioMixer,
  AudioSystem,
  AUDIO_CHANNELS,
  AUDIO_CLIP_KINDS,
  AUDIO_PLAYBACK_STATES,
  AUDIO_EVENT_TYPES,
  isAudioChannel,
  isAudioClipKind,
  isAudioPlaybackState,
  isAudioEventType,
} from '../index.js';

describe('AudioTypes', () => {
  it('exposes audio enums and type guards', () => {
    expect(AUDIO_CHANNELS).toEqual(['master', 'music', 'ambient', 'sfx', 'voice']);
    expect(AUDIO_CLIP_KINDS).toEqual(['music', 'ambient', 'interface', 'alert', 'feedback']);
    expect(AUDIO_PLAYBACK_STATES).toEqual(['stopped', 'playing', 'paused']);
    expect(AUDIO_EVENT_TYPES).toContain('play');

    expect(isAudioChannel('sfx')).toBe(true);
    expect(isAudioChannel('invalid')).toBe(false);
    expect(isAudioClipKind('alert')).toBe(true);
    expect(isAudioClipKind('invalid')).toBe(false);
    expect(isAudioPlaybackState('playing')).toBe(true);
    expect(isAudioPlaybackState('invalid')).toBe(false);
    expect(isAudioEventType('pause')).toBe(true);
    expect(isAudioEventType('invalid')).toBe(false);
  });
});

describe('AudioClipDescriptor', () => {
  it('creates and validates a clip', () => {
    const clip = new AudioClipDescriptor({
      id: 'alert-high',
      name: 'High Alert',
      kind: 'alert',
      uri: 'assets://audio/alert-high.wav',
      durationMs: 1200,
      looped: false,
      metadata: { priority: 'high' },
    });

    expect(clip.kind).toBe('alert');
    expect(clip.durationMs).toBe(1200);
    expect(clip.metadata).toEqual({ priority: 'high' });
    expect(() => clip.validate()).not.toThrow();
  });

  it('rejects invalid clip data', () => {
    expect(
      () => new AudioClipDescriptor({ id: '', name: 'x', kind: 'alert' }),
    ).toThrow(/id/);
    expect(
      () => new AudioClipDescriptor({ id: 'x', name: '', kind: 'alert' }),
    ).toThrow(/name/);
    expect(
      () => new AudioClipDescriptor({ id: 'x', name: 'x', kind: 'invalid' as any }),
    ).toThrow(/kind/);
    expect(
      () => new AudioClipDescriptor({ id: 'x', name: 'x', kind: 'alert', durationMs: -1 }),
    ).toThrow(/durationMs/);
  });
});

describe('AudioMixer', () => {
  it('initializes all channels to full volume', () => {
    const mixer = new AudioMixer();
    const snapshot = mixer.getSnapshot();
    expect(snapshot.masterVolume).toBe(1);
    expect(snapshot.muted).toBe(false);
    expect(snapshot.channelVolumes.master).toBe(1);
    expect(snapshot.channelVolumes.music).toBe(1);
    expect(snapshot.channelVolumes.sfx).toBe(1);
  });

  it('sets master and channel volumes', () => {
    const mixer = new AudioMixer({ master: 0.8, sfx: 0.5 });
    expect(mixer.getMasterVolume()).toBe(1);
    expect(mixer.getChannelVolume('sfx')).toBe(0.5);

    mixer.setMasterVolume(0.25);
    mixer.setChannelVolume('music', 0.3);
    mixer.setMuted(true);

    expect(mixer.getMasterVolume()).toBe(0.25);
    expect(mixer.getChannelVolume('music')).toBe(0.3);
    expect(mixer.isMuted()).toBe(true);
  });

  it('rejects invalid volume and channel', () => {
    const mixer = new AudioMixer();
    expect(() => mixer.setMasterVolume(-0.1)).toThrow(/between 0 and 1/);
    expect(() => mixer.setChannelVolume('invalid' as any, 1)).toThrow(/channel/);
    expect(() => mixer.setChannelVolume('sfx', 1.5)).toThrow(/between 0 and 1/);
  });
});

describe('AudioSystem', () => {
  function createSystem(): AudioSystem {
    const system = new AudioSystem({ name: 'Test Audio', now: () => 1000 });
    system.registerClip(new AudioClipDescriptor({
      id: 'alert-high',
      name: 'High Alert',
      kind: 'alert',
      durationMs: 1200,
    }));
    system.registerClip(new AudioClipDescriptor({
      id: 'music-background',
      name: 'Background Music',
      kind: 'music',
      looped: true,
    }));
    system.registerClip(new AudioClipDescriptor({
      id: 'ambient-soc',
      name: 'SOC Ambience',
      kind: 'ambient',
    }));
    return system;
  }

  it('registers and lists clips', () => {
    const system = createSystem();
    expect(system.hasClip('alert-high')).toBe(true);
    expect(system.listClips()).toHaveLength(3);
    expect(system.listClipsByKind('music')).toHaveLength(1);
    expect(system.getClip('alert-high')!.kind).toBe('alert');
  });

  it('plays, pauses, resumes, and stops clips', () => {
    const system = createSystem();
    system.play('alert-high', 'sfx', { reason: 'incident' });
    expect(system.getPlaybackState('alert-high')).toBe('playing');
    expect(system.getActiveClips()).toEqual(['alert-high']);

    system.pause('alert-high');
    expect(system.getPlaybackState('alert-high')).toBe('paused');

    system.resume('alert-high');
    expect(system.getPlaybackState('alert-high')).toBe('playing');

    system.stop('alert-high');
    expect(system.getPlaybackState('alert-high')).toBe('stopped');
    expect(system.getActiveClips()).toHaveLength(0);
  });

  it('rejects invalid playback transitions', () => {
    const system = createSystem();
    expect(() => system.pause('alert-high')).toThrow(/not playing/);
    system.play('alert-high');
    expect(() => system.play('alert-high')).toThrow(/already playing/);
    expect(() => system.resume('alert-high')).toThrow(/not paused/);
    system.stop('alert-high');
    expect(() => system.stop('alert-high')).toThrow(/already stopped/);
  });

  it('records audio events in order', () => {
    const system = createSystem();
    system.play('alert-high', 'sfx');
    system.stop('alert-high');
    const events = system.getEvents();
    expect(events[0].type).toBe('clip-registered');
    expect(events[events.length - 2].type).toBe('play');
    expect(events[events.length - 1].type).toBe('stop');
    expect(events.every((event) => event.timestamp === 1000)).toBe(true);
  });

  it('creates a full audio system snapshot', () => {
    const system = createSystem();
    system.play('music-background', 'music');
    system.play('ambient-soc', 'ambient');
    system.setMasterVolume(0.75);
    system.setChannelVolume('sfx', 0.4);

    const snapshot = system.createSnapshot();
    expect(snapshot.name).toBe('Test Audio');
    expect(snapshot.clipCount).toBe(3);
    expect(snapshot.activeClipCount).toBe(2);
    expect(snapshot.activeClips).toEqual(['ambient-soc', 'music-background']);
    expect(snapshot.mixer.masterVolume).toBe(0.75);
    expect(snapshot.mixer.channelVolumes.sfx).toBe(0.4);
    expect(snapshot.summary).toContain('Test Audio');
  });

  it('throws for missing clips and invalid channels', () => {
    const system = createSystem();
    expect(() => system.play('missing')).toThrow(/does not exist/);
    expect(() => system.play('alert-high', 'invalid' as any)).toThrow(/channel/);
    expect(() => system.setChannelVolume('invalid' as any, 1)).toThrow(/channel/);
  });

  it('validates cleanly', () => {
    const system = createSystem();
    system.play('alert-high');
    expect(() => system.validate()).not.toThrow();
  });
});
