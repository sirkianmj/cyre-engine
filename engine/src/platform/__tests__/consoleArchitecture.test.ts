import { describe, it, expect } from 'vitest';
import {
  CONSOLE_FAMILIES,
  CONSOLE_INPUT_ABSTRACTIONS,
  CONSOLE_RENDERING_ABSTRACTIONS,
  CONSOLE_SAVE_SYSTEMS,
  CONSOLE_SERVICES,
  isConsoleFamily,
  isConsoleInputAbstraction,
  isConsoleRenderingAbstraction,
  isConsoleSaveSystem,
  isConsoleService,
} from '../ConsoleArchitectureTypes.js';
import { ConsoleArchitectureProfile } from '../ConsoleArchitectureProfile.js';
import { ConsoleArchitecture } from '../ConsoleArchitecture.js';
import { PerformanceProfile } from '../PerformanceProfile.js';

describe('ConsoleArchitectureTypes', () => {
  it('exposes console architecture enumerations', () => {
    expect(CONSOLE_FAMILIES).toEqual(['playstation', 'xbox', 'nintendo', 'generic']);
    expect(CONSOLE_RENDERING_ABSTRACTIONS).toEqual(['2d', '2.5d', '3d']);
    expect(CONSOLE_INPUT_ABSTRACTIONS).toEqual(['gamepad', 'controller']);
    expect(CONSOLE_SAVE_SYSTEMS).toEqual(['memory', 'persistent', 'cloud-save']);
    expect(CONSOLE_SERVICES).toContain('achievements');
    expect(CONSOLE_SERVICES).toContain('cloud-save');
  });

  it('validates type guards', () => {
    expect(isConsoleFamily('playstation')).toBe(true);
    expect(isConsoleFamily('invalid')).toBe(false);
    expect(isConsoleRenderingAbstraction('3d')).toBe(true);
    expect(isConsoleRenderingAbstraction('4d')).toBe(false);
    expect(isConsoleInputAbstraction('gamepad')).toBe(true);
    expect(isConsoleInputAbstraction('touch')).toBe(false);
    expect(isConsoleSaveSystem('cloud-save')).toBe(true);
    expect(isConsoleSaveSystem('remote')).toBe(false);
    expect(isConsoleService('leaderboards')).toBe(true);
    expect(isConsoleService('invalid')).toBe(false);
  });
});

describe('ConsoleArchitectureProfile', () => {
  it('creates and validates a profile', () => {
    const profile = new ConsoleArchitectureProfile({
      id: 'ps5-production',
      name: 'PlayStation 5 Production',
      family: 'playstation',
      inputAbstraction: 'gamepad',
      renderingAbstraction: '3d',
      saveSystem: 'persistent',
      performanceProfile: PerformanceProfile.High,
      services: ['achievements', 'cloud-save', 'leaderboards'],
      settings: { targetFPS: 60 },
      description: 'PS5 console architecture',
    });

    expect(profile.family).toBe('playstation');
    expect(profile.renderingAbstraction).toBe('3d');
    expect(profile.saveSystem).toBe('persistent');
    expect(profile.performanceProfile).toBe(PerformanceProfile.High);
    expect(profile.services).toEqual(['achievements', 'cloud-save', 'leaderboards']);
    expect(() => profile.validate()).not.toThrow();
  });

  it('rejects invalid profile values', () => {
    expect(
      () => new ConsoleArchitectureProfile({
        id: '',
        name: 'x',
        family: 'generic',
        inputAbstraction: 'gamepad',
        renderingAbstraction: '2d',
        saveSystem: 'memory',
        performanceProfile: PerformanceProfile.Medium,
      }),
    ).toThrow(/id/);
    expect(
      () => new ConsoleArchitectureProfile({
        id: 'x',
        name: '',
        family: 'generic',
        inputAbstraction: 'gamepad',
        renderingAbstraction: '2d',
        saveSystem: 'memory',
        performanceProfile: PerformanceProfile.Medium,
      }),
    ).toThrow(/name/);
    expect(
      () => new ConsoleArchitectureProfile({
        id: 'x',
        name: 'x',
        family: 'invalid' as any,
        inputAbstraction: 'gamepad',
        renderingAbstraction: '2d',
        saveSystem: 'memory',
        performanceProfile: PerformanceProfile.Medium,
      }),
    ).toThrow(/family/);
    expect(
      () => new ConsoleArchitectureProfile({
        id: 'x',
        name: 'x',
        family: 'generic',
        inputAbstraction: 'invalid' as any,
        renderingAbstraction: '2d',
        saveSystem: 'memory',
        performanceProfile: PerformanceProfile.Medium,
      }),
    ).toThrow(/input abstraction/);
    expect(
      () => new ConsoleArchitectureProfile({
        id: 'x',
        name: 'x',
        family: 'generic',
        inputAbstraction: 'gamepad',
        renderingAbstraction: 'invalid' as any,
        saveSystem: 'memory',
        performanceProfile: PerformanceProfile.Medium,
      }),
    ).toThrow(/rendering abstraction/);
    expect(
      () => new ConsoleArchitectureProfile({
        id: 'x',
        name: 'x',
        family: 'generic',
        inputAbstraction: 'gamepad',
        renderingAbstraction: '2d',
        saveSystem: 'invalid' as any,
        performanceProfile: PerformanceProfile.Medium,
      }),
    ).toThrow(/save system/);
    expect(
      () => new ConsoleArchitectureProfile({
        id: 'x',
        name: 'x',
        family: 'generic',
        inputAbstraction: 'gamepad',
        renderingAbstraction: '2d',
        saveSystem: 'memory',
        performanceProfile: 'invalid' as any,
      }),
    ).toThrow(/performance profile/);
  });

  it('deduplicates and validates services', () => {
    expect(
      () => new ConsoleArchitectureProfile({
        id: 'dup',
        name: 'Dup',
        family: 'xbox',
        inputAbstraction: 'controller',
        renderingAbstraction: '3d',
        saveSystem: 'cloud-save',
        performanceProfile: PerformanceProfile.Medium,
        services: ['achievements', 'achievements'],
      }),
    ).toThrow(/duplicated/);

    expect(
      () => new ConsoleArchitectureProfile({
        id: 'bad-service',
        name: 'Bad Service',
        family: 'xbox',
        inputAbstraction: 'controller',
        renderingAbstraction: '3d',
        saveSystem: 'cloud-save',
        performanceProfile: PerformanceProfile.Medium,
        services: ['invalid' as any],
      }),
    ).toThrow(/service/);
  });

  it('clones and round-trips through JSON', () => {
    const profile = new ConsoleArchitectureProfile({
      id: 'xbox-series',
      name: 'Xbox Series',
      family: 'xbox',
      inputAbstraction: 'controller',
      renderingAbstraction: '3d',
      saveSystem: 'cloud-save',
      performanceProfile: PerformanceProfile.High,
      services: ['achievements', 'notifications'],
      settings: { nested: { value: 1 } },
    });

    const clone = profile.clone();
    clone.settings.nested.value = 99;
    expect(profile.settings.nested.value).toBe(1);

    const restored = ConsoleArchitectureProfile.fromJSON(profile.toJSON());
    expect(restored.id).toBe('xbox-series');
    expect(restored.services).toEqual(['achievements', 'notifications']);
    expect(restored.settings).toEqual({ nested: { value: 1 } });
  });
});

describe('ConsoleArchitecture', () => {
  it('registers profiles and lists them', () => {
    const architecture = new ConsoleArchitecture();
    architecture.registerProfile(new ConsoleArchitectureProfile({
      id: 'ps5',
      name: 'PlayStation 5',
      family: 'playstation',
      inputAbstraction: 'gamepad',
      renderingAbstraction: '3d',
      saveSystem: 'persistent',
      performanceProfile: PerformanceProfile.High,
      services: ['achievements', 'cloud-save'],
    }));
    architecture.registerProfile(new ConsoleArchitectureProfile({
      id: 'switch',
      name: 'Nintendo Switch',
      family: 'nintendo',
      inputAbstraction: 'controller',
      renderingAbstraction: '2.5d',
      saveSystem: 'memory',
      performanceProfile: PerformanceProfile.Low,
      services: ['authentication'],
    }));

    expect(architecture.listProfileIds()).toEqual(['ps5', 'switch']);
    expect(architecture.listProfilesByFamily('playstation')).toHaveLength(1);
    expect(architecture.listProfilesByService('cloud-save')).toHaveLength(1);
  });

  it('creates a snapshot with profile counts and summaries', () => {
    const architecture = new ConsoleArchitecture({ name: 'Console Targets' });
    architecture.registerProfile(new ConsoleArchitectureProfile({
      id: 'xbox',
      name: 'Xbox',
      family: 'xbox',
      inputAbstraction: 'controller',
      renderingAbstraction: '3d',
      saveSystem: 'cloud-save',
      performanceProfile: PerformanceProfile.Medium,
      services: ['leaderboards', 'matchmaking'],
    }));

    const snapshot = architecture.createSnapshot();
    expect(snapshot.name).toBe('Console Targets');
    expect(snapshot.profileCount).toBe(1);
    expect(snapshot.familyCounts).toEqual({ xbox: 1 });
    expect(snapshot.serviceCounts).toEqual({ leaderboards: 1, matchmaking: 1 });
    expect(snapshot.profiles).toHaveLength(1);
    expect(snapshot.summary).toContain('Console Targets');
  });

  it('throws for duplicate registration and missing operations', () => {
    const architecture = new ConsoleArchitecture();
    const profile = new ConsoleArchitectureProfile({
      id: 'generic',
      name: 'Generic Console',
      family: 'generic',
      inputAbstraction: 'gamepad',
      renderingAbstraction: '2d',
      saveSystem: 'persistent',
      performanceProfile: PerformanceProfile.Low,
    });
    architecture.registerProfile(profile);

    expect(() => architecture.registerProfile(profile)).toThrow(/already registered/);
    expect(() => architecture.unregisterProfile('missing')).toThrow(/does not exist/);
    expect(() => architecture.listProfilesByFamily('invalid' as any)).toThrow(/family/);
    expect(() => architecture.listProfilesByService('invalid' as any)).toThrow(/service/);
  });

  it('validates cleanly', () => {
    const architecture = new ConsoleArchitecture();
    architecture.registerProfile(new ConsoleArchitectureProfile({
      id: 'clean',
      name: 'Clean',
      family: 'generic',
      inputAbstraction: 'gamepad',
      renderingAbstraction: '3d',
      saveSystem: 'persistent',
      performanceProfile: PerformanceProfile.Medium,
    }));
    expect(() => architecture.validate()).not.toThrow();
  });
});
