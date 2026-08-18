import { describe, it, expect } from 'vitest';
import * as CYRE from '../../index.js';
import {
  PublicApiRegistry,
  CYRE_ENGINE_VERSION,
  CYRE_PUBLIC_API_VERSION,
} from '../index.js';

describe('CYRE Public API', () => {
  it('exposes core public runtime modules from the root index', () => {
    expect(CYRE.Engine).toBeDefined();
    expect(CYRE.NetworkGraph).toBeDefined();
    expect(CYRE.MissionFactory).toBeDefined();
    expect(CYRE.ScenarioDefinition).toBeDefined();
    expect(CYRE.TelemetryRecorder).toBeDefined();
    expect(CYRE.MemoryStorageAdapter).toBeDefined();
  });

  it('registers all expected public API module names', () => {
    const names = PublicApiRegistry.getModuleNames();
    for (const expected of [
      'core',
      'cyber',
      'game',
      'scenario',
      'serialization',
      'project',
      'scene',
      'editor',
      'debug',
      'timeline',
      'replay',
      'analytics',
      'automation',
      'research',
      'platform',
      'ui',
    ]) {
      expect(names).toContain(expected);
    }
  });

  it('provides runtime symbols for core modules', () => {
    expect(PublicApiRegistry.getRuntimeSymbols('core')).toContain('Engine');
    expect(PublicApiRegistry.getRuntimeSymbols('cyber')).toContain('NetworkGraph');
    expect(PublicApiRegistry.getRuntimeSymbols('game')).toContain('MissionFactory');
    expect(PublicApiRegistry.getRuntimeSymbols('scene')).toContain('SceneModel');
    expect(PublicApiRegistry.getRuntimeSymbols('scene')).toContain('SceneEditor');
    expect(PublicApiRegistry.getRuntimeSymbols('editor')).toContain('CyberEntityPalette');
    expect(PublicApiRegistry.getRuntimeSymbols('editor')).toContain('Inspector');
    expect(PublicApiRegistry.getRuntimeSymbols('editor')).toContain('MultiSelectionManager');
    expect(PublicApiRegistry.getRuntimeSymbols('editor')).toContain('NetworkGraphEditor');
    expect(PublicApiRegistry.getRuntimeSymbols('editor')).toContain('AttackGraphEditor');
    expect(PublicApiRegistry.getRuntimeSymbols('editor')).toContain('EvidenceGraphEditor');
    expect(PublicApiRegistry.getRuntimeSymbols('editor')).toContain('TimelineEditor');
  });

  it('exposes version metadata', () => {
    expect(CYRE_ENGINE_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    expect(CYRE_PUBLIC_API_VERSION).toBe(1);
  });
});
