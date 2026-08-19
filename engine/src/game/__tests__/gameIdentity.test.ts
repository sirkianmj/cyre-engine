import { describe, it, expect } from 'vitest';
import { GameIdentity } from '../GameIdentity.js';
import { GameIdentityRegistry } from '../GameIdentityRegistry.js';
import {
  ACCESSIBILITY_TARGETS,
  ART_DIRECTION_STYLES,
  GAME_PILLAR_CATEGORIES,
  GAME_TARGET_PLATFORMS,
  NARRATIVE_TONES,
  PLAYER_ROLES,
  PROGRESSION_STYLES,
  isAccessibilityTarget,
  isArtDirectionStyle,
  isGamePillarCategory,
  isGameTargetPlatform,
  isNarrativeTone,
  isPlayerRole,
  isProgressionStyle,
} from '../GameIdentityTypes.js';

function createIdentity(): GameIdentity {
  return new GameIdentity({
    id: 'identity-test',
    title: 'Test SOC',
    codename: 'Project Test',
    description: 'A test cybersecurity game identity.',
    playerFantasy: 'Be the investigator.',
    playerRoles: ['soc-analyst', 'incident-responder'],
    artDirection: 'hybrid',
    narrativeTone: 'thriller',
    progressionStyle: 'linear-campaign',
    pillars: [
      {
        id: 'pillar-1',
        name: 'Investigation',
        description: 'Investigate incidents.',
        category: 'cyber-investigation',
        weight: 1,
      },
      {
        id: 'pillar-2',
        name: 'Defense',
        description: 'Defend the network.',
        category: 'defense',
        weight: 1,
      },
    ],
    targetPlatforms: ['web', 'desktop'],
    uiIdentity: 'soc-console',
    accessibilityTargets: ['keyboard', 'screen-reader'],
    tags: ['test', 'soc'],
    metadata: { project: 'cyre' },
  });
}

describe('GameIdentityTypes', () => {
  it('exposes expected enumerations', () => {
    expect(GAME_TARGET_PLATFORMS).toEqual(['web', 'mobile', 'desktop', 'console']);
    expect(ART_DIRECTION_STYLES).toContain('hybrid');
    expect(PLAYER_ROLES).toContain('soc-analyst');
    expect(NARRATIVE_TONES).toContain('thriller');
    expect(PROGRESSION_STYLES).toContain('linear-campaign');
    expect(GAME_PILLAR_CATEGORIES).toContain('defense');
    expect(ACCESSIBILITY_TARGETS).toContain('screen-reader');
  });

  it('validates type guards', () => {
    expect(isGameTargetPlatform('console')).toBe(true);
    expect(isGameTargetPlatform('invalid')).toBe(false);
    expect(isArtDirectionStyle('immersive-3d')).toBe(true);
    expect(isArtDirectionStyle('invalid')).toBe(false);
    expect(isPlayerRole('threat-hunter')).toBe(true);
    expect(isPlayerRole('invalid')).toBe(false);
    expect(isNarrativeTone('educational')).toBe(true);
    expect(isNarrativeTone('invalid')).toBe(false);
    expect(isProgressionStyle('adaptive')).toBe(true);
    expect(isProgressionStyle('invalid')).toBe(false);
    expect(isGamePillarCategory('automation')).toBe(true);
    expect(isGamePillarCategory('invalid')).toBe(false);
    expect(isAccessibilityTarget('controller')).toBe(true);
    expect(isAccessibilityTarget('invalid')).toBe(false);
  });
});

describe('GameIdentity', () => {
  it('creates a valid identity', () => {
    const identity = createIdentity();
    expect(identity.getId()).toBe('identity-test');
    expect(identity.getTitle()).toBe('Test SOC');
    expect(identity.getCodename()).toBe('Project Test');
    expect(identity.getPlayerRoles()).toEqual(['soc-analyst', 'incident-responder']);
    expect(identity.getTargetPlatforms()).toEqual(['web', 'desktop']);
    expect(identity.getPillars()).toHaveLength(2);
    expect(() => identity.validate()).not.toThrow();
  });

  it('creates default flagship identity', () => {
    const identity = GameIdentity.createDefaultFlagshipIdentity();
    expect(identity.getId()).toBe('cyre-soc-command');
    expect(identity.getTitle()).toBe('SOC Command');
    expect(identity.getPlayerRoles()).toContain('soc-analyst');
    expect(identity.getTargetPlatforms()).toContain('console');
    expect(identity.getPillars()).toHaveLength(3);
  });

  it('rejects invalid identity data', () => {
    expect(() => new GameIdentity({
      id: '',
      title: 'x',
      codename: 'x',
      description: 'x',
      playerFantasy: 'x',
      playerRoles: ['soc-analyst'],
      artDirection: 'hybrid',
      narrativeTone: 'thriller',
      progressionStyle: 'linear-campaign',
      pillars: [{ id: 'p', name: 'P', description: 'D', category: 'defense', weight: 1 }],
      targetPlatforms: ['web'],
    })).toThrow(/id/);

    expect(() => new GameIdentity({
      id: 'x',
      title: '',
      codename: 'x',
      description: 'x',
      playerFantasy: 'x',
      playerRoles: ['soc-analyst'],
      artDirection: 'hybrid',
      narrativeTone: 'thriller',
      progressionStyle: 'linear-campaign',
      pillars: [{ id: 'p', name: 'P', description: 'D', category: 'defense', weight: 1 }],
      targetPlatforms: ['web'],
    })).toThrow(/title/);

    expect(() => new GameIdentity({
      id: 'x',
      title: 'x',
      codename: 'x',
      description: 'x',
      playerFantasy: 'x',
      playerRoles: [],
      artDirection: 'hybrid',
      narrativeTone: 'thriller',
      progressionStyle: 'linear-campaign',
      pillars: [{ id: 'p', name: 'P', description: 'D', category: 'defense', weight: 1 }],
      targetPlatforms: ['web'],
    })).toThrow(/player role/);

    expect(() => new GameIdentity({
      id: 'x',
      title: 'x',
      codename: 'x',
      description: 'x',
      playerFantasy: 'x',
      playerRoles: ['soc-analyst'],
      artDirection: 'invalid' as any,
      narrativeTone: 'thriller',
      progressionStyle: 'linear-campaign',
      pillars: [{ id: 'p', name: 'P', description: 'D', category: 'defense', weight: 1 }],
      targetPlatforms: ['web'],
    })).toThrow(/artDirection/);

    expect(() => new GameIdentity({
      id: 'x',
      title: 'x',
      codename: 'x',
      description: 'x',
      playerFantasy: 'x',
      playerRoles: ['soc-analyst'],
      artDirection: 'hybrid',
      narrativeTone: 'thriller',
      progressionStyle: 'linear-campaign',
      pillars: [{ id: '', name: 'P', description: 'D', category: 'defense', weight: 1 }],
      targetPlatforms: ['web'],
    })).toThrow(/Pillar id/);

    expect(() => new GameIdentity({
      id: 'x',
      title: 'x',
      codename: 'x',
      description: 'x',
      playerFantasy: 'x',
      playerRoles: ['soc-analyst'],
      artDirection: 'hybrid',
      narrativeTone: 'thriller',
      progressionStyle: 'linear-campaign',
      pillars: [{ id: 'p', name: 'P', description: 'D', category: 'invalid' as any, weight: 1 }],
      targetPlatforms: ['web'],
    })).toThrow(/category/);
  });

  it('clones and round-trips through JSON', () => {
    const identity = createIdentity();
    const clone = identity.clone();
    clone.getDefinition().metadata!.project = 'changed';
    expect(identity.getDefinition().metadata!.project).toBe('cyre');

    const restored = GameIdentity.fromJSON(identity.toJSON());
    expect(restored.getId()).toBe('identity-test');
    expect(restored.getPillars()).toHaveLength(2);
    expect(restored.getDefinition().metadata).toEqual({ project: 'cyre' });
  });
});

describe('GameIdentityRegistry', () => {
  it('registers identities and lists them', () => {
    const registry = new GameIdentityRegistry();
    const identity = createIdentity();
    registry.register(identity);

    expect(registry.has(identity.getId())).toBe(true);
    expect(registry.list()).toHaveLength(1);
    expect(registry.listIds()).toEqual(['identity-test']);
    expect(registry.listByPlatform('web')).toHaveLength(1);
  });

  it('rejects duplicate registration and missing unregister', () => {
    const registry = new GameIdentityRegistry();
    const identity = createIdentity();
    registry.register(identity);

    expect(() => registry.register(identity)).toThrow(/already registered/);
    expect(() => registry.unregister('missing')).toThrow(/does not exist/);
  });

  it('creates a snapshot with platform counts', () => {
    const registry = new GameIdentityRegistry();
    registry.register(createIdentity());

    const snapshot = registry.createSnapshot();
    expect(snapshot.name).toBe('CYRE Game Identity Registry');
    expect(snapshot.identityCount).toBe(1);
    expect(snapshot.platformCounts).toEqual({ web: 1, desktop: 1 });
    expect(snapshot.identities).toHaveLength(1);
    expect(snapshot.summary).toContain('CYRE Game Identity Registry');
  });

  it('round-trips through JSON', () => {
    const registry = new GameIdentityRegistry();
    registry.register(createIdentity());

    const restored = GameIdentityRegistry.fromJSON(registry.toJSON());
    expect(restored.has('identity-test')).toBe(true);
    expect(restored.list()).toHaveLength(1);
  });

  it('validates cleanly', () => {
    const registry = new GameIdentityRegistry();
    registry.register(createIdentity());
    expect(() => registry.validate()).not.toThrow();
  });
});
