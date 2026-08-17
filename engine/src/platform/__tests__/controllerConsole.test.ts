import { describe, it, expect, vi } from 'vitest';
import { GamepadInputAdapter } from '../GamepadInputAdapter.js';
import { PerformanceProfile, PERFORMANCE_SETTINGS } from '../PerformanceProfile.js';
import { ResolutionSettings } from '../ResolutionSettings.js';
import { ConsolePlatformAdapter } from '../ConsolePlatformAdapter.js';

describe('GamepadInputAdapter', () => {
  it('maps button A to confirm', () => {
    const adapter = new GamepadInputAdapter();
    const handler = vi.fn();
    adapter.setCommandHandler(handler);
    adapter.button('A', true);
    expect(handler).toHaveBeenCalledWith({ type: 'confirm' });
  });

  it('maps DPad navigation', () => {
    const adapter = new GamepadInputAdapter();
    const handler = vi.fn();
    adapter.setCommandHandler(handler);
    adapter.button('DPadLeft', true);
    expect(handler).toHaveBeenCalledWith({ type: 'navigate', position: { x: -1, y: 0 } });
  });

  it('ignores unknown button', () => {
    const adapter = new GamepadInputAdapter();
    const handler = vi.fn();
    adapter.setCommandHandler(handler);
    adapter.button('Unknown', true);
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('PerformanceProfile', () => {
  it('has settings for all profiles', () => {
    expect(PERFORMANCE_SETTINGS[PerformanceProfile.Low].maxFPS).toBe(30);
    expect(PERFORMANCE_SETTINGS[PerformanceProfile.Ultra].maxFPS).toBe(240);
  });
});

describe('ResolutionSettings', () => {
  it('defaults to 1920x1080', () => {
    const res = new ResolutionSettings();
    expect(res.getInfo().width).toBe(1920);
    expect(res.getInfo().height).toBe(1080);
    expect(res.getInfo().scaleFactor).toBe(1);
  });

  it('sets size and scale factor', () => {
    const res = new ResolutionSettings({ width: 1280, height: 720, scaleFactor: 1.5 });
    res.setSize(2560, 1440);
    res.setScaleFactor(2);
    const info = res.getInfo();
    expect(info.width).toBe(2560);
    expect(info.height).toBe(1440);
    expect(info.scaleFactor).toBe(2);
  });

  it('throws on invalid size or scale', () => {
    expect(() => new ResolutionSettings({ width: 0, height: 100 })).toThrow(/positive/);
    const res = new ResolutionSettings();
    expect(() => res.setScaleFactor(0)).toThrow(/positive/);
  });
});

describe('ConsolePlatformAdapter', () => {
  it('has name console and memory storage', () => {
    const adapter = new ConsolePlatformAdapter();
    expect(adapter.name).toBe('console');
    expect(adapter.performanceProfile).toBe(PerformanceProfile.Medium);
  });

  it('uses configured performance profile', () => {
    const adapter = new ConsolePlatformAdapter(PerformanceProfile.High);
    expect(adapter.getPerformanceSettings().maxFPS).toBe(120);
  });

  it('handles lifecycle pause/resume', () => {
    const adapter = new ConsolePlatformAdapter();
    const pauseSpy = vi.fn();
    const resumeSpy = vi.fn();
    adapter.lifecycle.onPause(pauseSpy);
    adapter.lifecycle.onResume(resumeSpy);
    adapter.simulatePause();
    adapter.simulateResume();
    expect(pauseSpy).toHaveBeenCalledTimes(1);
    expect(resumeSpy).toHaveBeenCalledTimes(1);
  });
});
