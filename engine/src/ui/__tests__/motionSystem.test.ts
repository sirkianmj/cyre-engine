import { describe, it, expect } from 'vitest';
import { MotionSystem, MOTION_PRESETS } from '../MotionSystem.js';

describe('MotionSystem', () => {
  it('creates a default motion system', () => {
    const motion = new MotionSystem();
    expect(motion.isMotionReduced()).toBe(false);
    expect(motion.getDurationMs()).toBe(240);
    expect(motion.getEasing()).toBe('ease-in-out');
    expect(motion.getDelayMs()).toBe(0);
  });

  it('creates a motion system from a preset', () => {
    const motion = MotionSystem.fromPreset('fast');
    expect(motion.getDurationMs()).toBe(120);
    expect(motion.getEasing()).toBe('ease-out');
  });

  it('throws for an unknown preset', () => {
    expect(() => MotionSystem.fromPreset('missing')).toThrow(/does not exist/);
  });

  it('enables reduced motion and sets transition duration to zero', () => {
    const motion = new MotionSystem();
    motion.setReduceMotion(true);
    expect(motion.isMotionReduced()).toBe(true);
    expect(motion.getDurationMs()).toBe(0);
    expect(motion.getDelayMs()).toBe(0);
  });

  it('sets duration, easing, and delay', () => {
    const motion = new MotionSystem();
    motion.setDuration(320);
    motion.setEasing('linear');
    motion.setDelay(20);

    expect(motion.getDurationMs()).toBe(320);
    expect(motion.getEasing()).toBe('linear');
    expect(motion.getDelayMs()).toBe(20);
  });

  it('rejects invalid duration and delay', () => {
    const motion = new MotionSystem();
    expect(() => motion.setDuration(-1)).toThrow(/non-negative finite number/);
    expect(() => motion.setDelay(-1)).toThrow(/non-negative finite number/);
  });

  it('rejects invalid easing', () => {
    const motion = new MotionSystem();
    expect(() => motion.setEasing('invalid' as any)).toThrow(/Invalid motion easing/);
  });

  it('returns a transition for a property', () => {
    const motion = new MotionSystem({ durationMs: 180, easing: 'ease-in', delayMs: 10 });
    expect(motion.getTransition('opacity')).toEqual({
      property: 'opacity',
      durationMs: 180,
      easing: 'ease-in',
      delayMs: 10,
      reduceMotion: false,
    });
  });

  it('returns reduced transition when motion is disabled', () => {
    const motion = new MotionSystem({ durationMs: 300, delayMs: 50 });
    motion.setReduceMotion(true);
    expect(motion.getTransition('opacity')).toEqual({
      property: 'opacity',
      durationMs: 0,
      easing: 'ease-in-out',
      delayMs: 0,
      reduceMotion: true,
    });
  });

  it('rejects invalid transition property', () => {
    const motion = new MotionSystem();
    expect(() => motion.getTransition('   ')).toThrow(/property is required/);
  });

  it('lists motion presets as copies', () => {
    const motion = new MotionSystem();
    const presets = motion.listPresets();
    presets[0].durationMs = 999;
    expect(MOTION_PRESETS[0].durationMs).toBe(0);
  });

  it('exports state as JSON', () => {
    const motion = new MotionSystem({ durationMs: 300, easing: 'ease-out', delayMs: 20 });
    expect(motion.toJSON()).toEqual({
      reduceMotion: false,
      durationMs: 300,
      easing: 'ease-out',
      delayMs: 20,
    });
  });
});
