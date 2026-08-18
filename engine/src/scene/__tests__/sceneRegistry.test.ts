import { describe, it, expect } from 'vitest';
import { SceneRegistry } from '../SceneRegistry.js';
import { SceneModel } from '../SceneModel.js';

describe('SceneRegistry', () => {
  it('creates and stores a scene', () => {
    const registry = new SceneRegistry();
    const scene = registry.createScene('scene-1', 'Scene One');
    expect(scene.getId()).toBe('scene-1');
    expect(registry.hasScene('scene-1')).toBe(true);
  });

  it('throws when creating a duplicate scene', () => {
    const registry = new SceneRegistry();
    registry.createScene('scene-1', 'Scene One');
    expect(() => registry.createScene('scene-1', 'Duplicate')).toThrow(/already exists/);
  });

  it('retrieves a scene by id', () => {
    const registry = new SceneRegistry();
    registry.createScene('scene-1', 'Scene One');
    expect(registry.getScene('scene-1').getName()).toBe('Scene One');
  });

  it('throws when getting an unknown scene', () => {
    const registry = new SceneRegistry();
    expect(() => registry.getScene('missing')).toThrow(/does not exist/);
  });

  it('removes a scene', () => {
    const registry = new SceneRegistry();
    registry.createScene('scene-1', 'Scene One');
    expect(registry.removeScene('scene-1')).toBe(true);
    expect(registry.hasScene('scene-1')).toBe(false);
  });

  it('imports scene data and registers it', () => {
    const registry = new SceneRegistry();
    const sceneData = {
      id: 'scene-import',
      name: 'Imported Scene',
      components: [
        { id: 'org-1', type: 'organization' as const, name: 'Test Org' },
      ],
    };
    const scene = registry.importSceneData(sceneData);
    expect(scene.getComponents()).toHaveLength(1);
    expect(registry.hasScene('scene-import')).toBe(true);
  });

  it('lists scene summaries', () => {
    const registry = new SceneRegistry();
    registry.createScene('scene-1', 'Scene One');
    const scene2 = registry.createScene('scene-2', 'Scene Two');
    scene2.addOrganization({ id: 'org-1', name: 'Org' });
    const summary = registry.listScenes();
    expect(summary).toHaveLength(2);
    expect(summary.find((entry) => entry.id === 'scene-2')?.componentCount).toBe(1);
  });
});
