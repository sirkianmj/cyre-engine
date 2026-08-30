import { describe, it, expect } from 'vitest';
import { ASSET_TYPES, isAssetType } from '../AssetTypes.js';
import { AssetDescriptor } from '../AssetDescriptor.js';
import { AssetManager } from '../AssetManager.js';

describe('AssetTypes', () => {
  it('validates known asset types', () => {
    expect(isAssetType('image')).toBe(true);
    expect(isAssetType('model')).toBe(true);
    expect(isAssetType('not-type')).toBe(false);
  });

  it('exposes expected asset types', () => {
    expect(ASSET_TYPES).toContain('image');
    expect(ASSET_TYPES).toContain('model');
    expect(ASSET_TYPES).toContain('texture');
    expect(ASSET_TYPES).toContain('audio');
    expect(ASSET_TYPES).toContain('font');
    expect(ASSET_TYPES).toContain('data');
    expect(ASSET_TYPES).toContain('scenario');
    expect(ASSET_TYPES).toContain('other');
  });
});

describe('AssetDescriptor', () => {
  it('creates a valid descriptor', () => {
    const asset = new AssetDescriptor({
      id: 'tex-floor',
      name: 'Floor Texture',
      type: 'texture',
      tags: ['environment', 'floor'],
      metadata: { nested: { value: 1 } },
    });
    expect(asset.id).toBe('tex-floor');
    expect(asset.type).toBe('texture');
    expect(asset.tags).toEqual(['environment', 'floor']);
    expect(asset.metadata).toEqual({ nested: { value: 1 } });
  });

  it('rejects empty id, name, and invalid type', () => {
    expect(() => new AssetDescriptor({ id: '', name: 'x', type: 'image' })).toThrow(/id/);
    expect(() => new AssetDescriptor({ id: 'x', name: '', type: 'image' })).toThrow(/name/);
    expect(() => new AssetDescriptor({ id: 'x', name: 'x', type: 'invalid' as any })).toThrow(/type/);
  });

  it('rejects empty uri, path, mimeType, and version', () => {
    expect(() => new AssetDescriptor({ id: 'a', name: 'x', type: 'image', uri: '' })).toThrow(/uri/);
    expect(() => new AssetDescriptor({ id: 'a', name: 'x', type: 'image', path: '' })).toThrow(/path/);
    expect(() => new AssetDescriptor({ id: 'a', name: 'x', type: 'image', mimeType: '' })).toThrow(/mimeType/);
    expect(() => new AssetDescriptor({ id: 'a', name: 'x', type: 'image', version: '' })).toThrow(/version/);
  });

  it('rejects duplicate and empty tags', () => {
    expect(
      () => new AssetDescriptor({ id: 'a', name: 'x', type: 'image', tags: ['env', 'env'] }),
    ).toThrow(/duplicated/);
    expect(
      () => new AssetDescriptor({ id: 'a', name: 'x', type: 'image', tags: [''] }),
    ).toThrow(/non-empty/);
  });

  it('clones with deep-copied metadata and tags', () => {
    const original = new AssetDescriptor({
      id: 'a',
      name: 'x',
      type: 'image',
      tags: ['tag'],
      metadata: { nested: { value: 1 } },
    });
    const clone = original.clone();
    clone.metadata!.nested!.value = 99;
    expect(original.metadata!.nested!.value).toBe(1);
  });

  it('round-trips through JSON', () => {
    const original = new AssetDescriptor({
      id: 'a',
      name: 'Test Asset',
      type: 'model',
      uri: 'assets://models/test.glb',
      version: '1.0.0',
      tags: ['model', 'test'],
    });
    const restored = AssetDescriptor.fromJSON(original.toJSON());
    expect(restored.id).toBe('a');
    expect(restored.type).toBe('model');
    expect(restored.uri).toBe('assets://models/test.glb');
    expect(restored.tags).toEqual(['model', 'test']);
  });
});

describe('AssetManager', () => {
  function createManager(): AssetManager {
    const manager = new AssetManager();
    manager.register(new AssetDescriptor({
      id: 'img-player',
      name: 'Player Sprite',
      type: 'image',
      tags: ['2d', 'player'],
    }));
    manager.register(new AssetDescriptor({
      id: 'model-server',
      name: 'Server Rack Model',
      type: 'model',
      tags: ['3d', 'environment'],
    }));
    manager.register(new AssetDescriptor({
      id: 'audio-alert',
      name: 'Security Alert Sound',
      type: 'audio',
      tags: ['sfx', 'alert'],
    }));
    return manager;
  }

  it('registers and retrieves assets with deep copies', () => {
    const manager = createManager();
    expect(manager.has('img-player')).toBe(true);
    expect(manager.list()).toHaveLength(3);

    const image = manager.get('img-player')!;
    image.metadata = { changed: true };
    expect(manager.get('img-player')!.metadata).toBeUndefined();
  });

  it('rejects duplicate asset ids', () => {
    const manager = createManager();
    expect(
      () => manager.register(new AssetDescriptor({ id: 'img-player', name: 'Dup', type: 'image' })),
    ).toThrow(/already exists/);
  });

  it('lists by type and tag', () => {
    const manager = createManager();
    expect(manager.listByType('model')).toHaveLength(1);
    expect(manager.listByTag('player')).toHaveLength(1);
    expect(manager.listByTag('environment')).toHaveLength(1);
    expect(manager.listByTag('sfx')).toHaveLength(1);
  });

  it('adds and removes tags', () => {
    const manager = createManager();
    manager.addTag('img-player', 'protagonist');
    expect(manager.get('img-player')!.tags).toContain('protagonist');
    expect(() => manager.addTag('img-player', 'protagonist')).toThrow(/already has tag/);

    manager.removeTag('img-player', 'protagonist');
    expect(manager.get('img-player')!.tags).not.toContain('protagonist');
  });

  it('updates asset metadata and properties', () => {
    const manager = createManager();
    manager.update('img-player', { name: 'Hero Sprite', version: '2.0.0' });
    const updated = manager.get('img-player')!;
    expect(updated.name).toBe('Hero Sprite');
    expect(updated.version).toBe('2.0.0');

    manager.setMetadata('img-player', { source: 'editor' });
    expect(manager.get('img-player')!.metadata).toEqual({ source: 'editor' });
  });

  it('unregisters assets', () => {
    const manager = createManager();
    manager.unregister('img-player');
    expect(manager.has('img-player')).toBe(false);
    expect(manager.list()).toHaveLength(2);
  });

  it('throws for missing asset operations', () => {
    const manager = createManager();
    expect(() => manager.unregister('missing')).toThrow(/does not exist/);
    expect(() => manager.update('missing', { name: 'x' })).toThrow(/does not exist/);
    expect(() => manager.addTag('missing', 'tag')).toThrow(/does not exist/);
    expect(() => manager.removeTag('missing', 'tag')).toThrow(/does not exist/);
  });

  it('validates full manager state', () => {
    const manager = createManager();
    expect(() => manager.validate()).not.toThrow();
  });

  it('round-trips through JSON', () => {
    const manager = createManager();
    const restored = AssetManager.fromJSON(manager.toJSON());
    expect(restored.list()).toHaveLength(3);
    expect(restored.get('model-server')!.type).toBe('model');
    expect(restored.get('audio-alert')!.tags).toContain('alert');
  });

  it('clone creates an isolated copy', () => {
    const manager = createManager();
    const clone = manager.clone();
    clone.unregister('img-player');
    expect(clone.has('img-player')).toBe(false);
    expect(manager.has('img-player')).toBe(true);
  });
});
