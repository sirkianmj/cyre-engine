import { describe, it, expect } from 'vitest';
import {
  MotionSystem,
  UIThemeManager,
  VisualPolishProfile,
  VisualPolishSystem,
  VISUAL_INTENSITIES,
  VISUAL_MOTION_PRESETS,
  isVisualIntensity,
  isVisualMotionPreset,
} from '../index.js';

describe('VisualPolishTypes', () => {
  it('exposes visual intensity and motion presets', () => {
    expect(VISUAL_INTENSITIES).toEqual(['minimal', 'balanced', 'high']);
    expect(VISUAL_MOTION_PRESETS).toEqual(['instant', 'fast', 'normal', 'slow']);
    expect(isVisualIntensity('balanced')).toBe(true);
    expect(isVisualIntensity('invalid')).toBe(false);
    expect(isVisualMotionPreset('fast')).toBe(true);
    expect(isVisualMotionPreset('invalid')).toBe(false);
  });
});

describe('VisualPolishProfile', () => {
  it('creates a valid profile', () => {
    const profile = new VisualPolishProfile({
      id: 'polish-test',
      name: 'Test Polish',
      themeId: 'cyre-light',
      motionPreset: 'fast',
      reduceMotion: true,
      visualIntensity: 'minimal',
      colorblindSafe: true,
      highContrast: true,
      metadata: { source: 'test' },
    });

    expect(profile.themeId).toBe('cyre-light');
    expect(profile.motionPreset).toBe('fast');
    expect(profile.reduceMotion).toBe(true);
    expect(profile.visualIntensity).toBe('minimal');
    expect(profile.colorblindSafe).toBe(true);
    expect(profile.highContrast).toBe(true);
    expect(() => profile.validate()).not.toThrow();
  });

  it('creates default SOC polish', () => {
    const profile = VisualPolishProfile.createDefaultSocPolish();
    expect(profile.id).toBe('soc-command-polish');
    expect(profile.themeId).toBe('cyre-dark');
    expect(profile.colorblindSafe).toBe(true);
  });

  it('rejects invalid profile values', () => {
    expect(
      () => new VisualPolishProfile({ id: '', name: 'x' }),
    ).toThrow(/id/);
    expect(
      () => new VisualPolishProfile({ id: 'x', name: '' }),
    ).toThrow(/name/);
    expect(
      () => new VisualPolishProfile({
        id: 'x',
        name: 'x',
        motionPreset: 'invalid' as any,
      }),
    ).toThrow(/motion preset/);
    expect(
      () => new VisualPolishProfile({
        id: 'x',
        name: 'x',
        visualIntensity: 'invalid' as any,
      }),
    ).toThrow(/visual intensity/);
  });

  it('clones and round-trips through JSON', () => {
    const original = new VisualPolishProfile({
      id: 'clone-profile',
      name: 'Clone Profile',
      metadata: { nested: { value: 1 } },
    });

    const clone = original.clone();
    clone.metadata!.nested!.value = 99;
    expect(original.metadata!.nested!.value).toBe(1);

    const restored = VisualPolishProfile.fromJSON(original.toJSON());
    expect(restored.id).toBe('clone-profile');
    expect(restored.metadata).toEqual({ nested: { value: 1 } });
  });
});

describe('VisualPolishSystem', () => {
  it('applies a profile and activates theme/motion', () => {
    const profile = new VisualPolishProfile({
      id: 'profile-light',
      name: 'Light Polish',
      themeId: 'cyre-light',
      motionPreset: 'fast',
      reduceMotion: false,
      visualIntensity: 'balanced',
    });

    const system = new VisualPolishSystem({ profile });
    expect(system.getActiveThemeId()).toBe('cyre-light');
    expect(system.getMotionSnapshot().preset).toBe('fast');
    expect(system.getMotionSnapshot().durationMs).toBe(120);
  });

  it('enables reduced motion', () => {
    const system = new VisualPolishSystem({
      profile: new VisualPolishProfile({
        id: 'reduced',
        name: 'Reduced',
        reduceMotion: true,
        motionPreset: 'slow',
      }),
    });

    expect(system.getMotionSnapshot().reduceMotion).toBe(true);
    expect(system.getMotionSnapshot().durationMs).toBe(0);
    expect(system.getMotionSystem()).toBeInstanceOf(MotionSystem);
  });

  it('rejects missing theme id', () => {
    const profile = new VisualPolishProfile({
      id: 'missing-theme',
      name: 'Missing Theme',
      themeId: 'does-not-exist',
    });

    expect(() => new VisualPolishSystem({ profile })).toThrow(/does not exist/);
  });

  it('creates a snapshot and render output', () => {
    const profile = VisualPolishProfile.createDefaultSocPolish();
    const system = new VisualPolishSystem({ profile });
    const snapshot = system.createSnapshot();

    expect(snapshot.profile.id).toBe('soc-command-polish');
    expect(snapshot.activeThemeId).toBe('cyre-dark');
    expect(snapshot.motion.preset).toBe('fast');
    expect(snapshot.colorblindSafe).toBe(true);
    expect(snapshot.highContrast).toBe(false);
    expect(snapshot.summary).toContain('SOC Command Visual Polish');

    const rendered = system.render();
    expect(rendered.type).toBe('visual-polish');
    expect(rendered.activeThemeId).toBe('cyre-dark');
  });

  it('uses a provided UIThemeManager', () => {
    const themes = new UIThemeManager();
    const system = new VisualPolishSystem({ themeManager: themes });
    expect(system.getThemeManager()).toBe(themes);
  });

  it('validates cleanly', () => {
    const system = new VisualPolishSystem();
    expect(() => system.validate()).not.toThrow();
  });
});
