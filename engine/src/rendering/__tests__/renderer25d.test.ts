import { describe, it, expect } from 'vitest';
import { Transform25D } from '../Transform25D.js';
import { Light25D } from '../Light25D.js';
import { Camera25D } from '../Camera25D.js';
import { Layer25D } from '../Layer25D.js';
import { Sprite25D } from '../Sprite25D.js';
import { Scene25D } from '../Scene25D.js';
import { Renderer25D } from '../Renderer25D.js';
import { RenderTarget } from '../RenderTarget.js';

describe('Transform25D', () => {
  it('defaults to identity', () => {
    const transform = new Transform25D();
    expect(transform.x).toBe(0);
    expect(transform.y).toBe(0);
    expect(transform.z).toBe(0);
    expect(transform.scaleX).toBe(1);
    expect(transform.scaleY).toBe(1);
    expect(transform.scaleZ).toBe(1);
  });

  it('rejects non-finite values', () => {
    expect(() => new Transform25D({ x: Number.NaN })).toThrow(/finite/);
  });

  it('rejects zero scale', () => {
    expect(() => new Transform25D({ scaleZ: 0 })).toThrow(/scale/);
  });

  it('clones and round-trips through JSON', () => {
    const original = new Transform25D({ x: 1, y: 2, z: 3, rotationZ: 0.5 });
    const clone = original.clone();
    clone.z = 99;
    expect(original.z).toBe(3);
    const restored = Transform25D.fromJSON(original.toJSON());
    expect(restored.y).toBe(2);
  });
});

describe('Light25D', () => {
  it('creates ambient light', () => {
    const light = new Light25D({ id: 'amb', name: 'Ambient', type: 'ambient' });
    expect(light.color).toBe('#ffffff');
    expect(light.intensity).toBe(1);
  });

  it('requires position for point light', () => {
    expect(
      () => new Light25D({ id: 'p', name: 'Point', type: 'point' }),
    ).toThrow(/position/);
  });

  it('requires direction for directional light', () => {
    expect(
      () => new Light25D({ id: 'd', name: 'Directional', type: 'directional' }),
    ).toThrow(/direction/);
  });

  it('validates intensity', () => {
    expect(
      () => new Light25D({ id: 'l', name: 'Light', type: 'ambient', intensity: -1 }),
    ).toThrow(/intensity/);
  });

  it('clones and round-trips through JSON', () => {
    const original = new Light25D({
      id: 'pt',
      name: 'Point',
      type: 'point',
      position: { x: 1, y: 2, z: 3 },
      intensity: 2,
    });
    const clone = original.clone();
    expect(clone.position).toEqual({ x: 1, y: 2, z: 3 });
    const restored = Light25D.fromJSON(original.toJSON());
    expect(restored.intensity).toBe(2);
  });
});

describe('Camera25D', () => {
  it('creates with defaults', () => {
    const camera = new Camera25D({ id: 'cam', name: 'Camera' });
    expect(camera.position).toEqual({ x: 0, y: 0, z: 10 });
    expect(camera.lookAt).toEqual({ x: 0, y: 0, z: 0 });
    expect(camera.fov).toBe(60);
    expect(camera.visible).toBe(true);
  });

  it('validates fov range', () => {
    expect(() => new Camera25D({ id: 'c', name: 'x', fov: 0 })).toThrow(/fov/);
    expect(() => new Camera25D({ id: 'c', name: 'x', fov: 180 })).toThrow(/fov/);
  });

  it('validates near/far', () => {
    expect(() => new Camera25D({ id: 'c', name: 'x', near: 0 })).toThrow(/near/);
    expect(() => new Camera25D({ id: 'c', name: 'x', near: 10, far: 5 })).toThrow(/far/);
  });

  it('clones and round-trips through JSON', () => {
    const original = new Camera25D({
      id: 'cam',
      name: 'Camera',
      position: { x: 1, y: 2, z: 3 },
      lookAt: { x: 4, y: 5, z: 6 },
      fov: 45,
      near: 1,
      far: 100,
    });
    const restored = Camera25D.fromJSON(original.toJSON());
    expect(restored.position).toEqual({ x: 1, y: 2, z: 3 });
    expect(restored.fov).toBe(45);
  });
});

describe('Layer25D', () => {
  it('validates order integer', () => {
    expect(() => new Layer25D({ id: 'l', name: 'Layer', order: 1.5 })).toThrow(/integer/);
  });

  it('validates depth finite', () => {
    expect(() => new Layer25D({ id: 'l', name: 'Layer', depth: Number.NaN })).toThrow(/finite/);
  });

  it('validates opacity range', () => {
    expect(() => new Layer25D({ id: 'l', name: 'Layer', opacity: 1.1 })).toThrow(/opacity/);
  });
});

describe('Sprite25D', () => {
  it('creates with deep-copied transform and metadata', () => {
    const sprite = new Sprite25D({
      id: 's',
      name: 'Sprite',
      transform: { x: 1, y: 2, z: 3 },
      metadata: { nested: { value: 1 } },
    });
    sprite.transform.x = 99;
    sprite.metadata!.nested!.value = 99;
    expect(sprite.transform.x).toBe(99);
    expect(sprite.metadata!.nested!.value).toBe(99);
  });

  it('clone creates isolated copy', () => {
    const sprite = new Sprite25D({ id: 's', name: 'Sprite', transform: { x: 1 } });
    const clone = sprite.clone();
    clone.transform.x = 99;
    expect(sprite.transform.x).toBe(1);
  });

  it('rejects invalid opacity', () => {
    expect(() => new Sprite25D({ id: 's', name: 'x', opacity: -0.1 })).toThrow(/opacity/);
  });
});

describe('Scene25D', () => {
  function createScene(): Scene25D {
    const scene = new Scene25D();
    scene.addLayer(new Layer25D({ id: 'bg', name: 'Background', order: 0, depth: -10 }));
    scene.addLayer(new Layer25D({ id: 'fg', name: 'Foreground', order: 10, depth: 10 }));
    scene.addCamera(new Camera25D({ id: 'cam', name: 'Main Camera' }));
    scene.addLight(new Light25D({ id: 'light', name: 'Directional', type: 'directional', direction: { x: 0, y: -1, z: 0 } }));
    scene.addSprite(new Sprite25D({
      id: 'sprite1',
      name: 'Server Rack',
      layerId: 'bg',
      transform: { x: 10, y: 20, z: -5 },
    }));
    scene.addSprite(new Sprite25D({
      id: 'sprite2',
      name: 'Player',
      layerId: 'fg',
      transform: { x: 0, y: 0, z: 5 },
    }));
    return scene;
  }

  it('adds and retrieves entities with deep copies', () => {
    const scene = createScene();
    expect(scene.getLayers()).toHaveLength(2);
    expect(scene.getCameras()).toHaveLength(1);
    expect(scene.getLights()).toHaveLength(1);
    expect(scene.getSprites()).toHaveLength(2);

    const sprite = scene.getSprite('sprite1')!;
    sprite.transform.z = 99;
    expect(scene.getSprite('sprite1')!.transform.z).not.toBe(99);
  });

  it('prevents duplicate IDs', () => {
    const scene = createScene();
    expect(() => scene.addLayer(new Layer25D({ id: 'bg', name: 'dup' }))).toThrow(/already exists/);
  });

  it('rejects sprite referencing unknown layer', () => {
    const scene = new Scene25D();
    expect(
      () => scene.addSprite(new Sprite25D({ id: 's', name: 'x', layerId: 'missing' })),
    ).toThrow(/unknown layer/);
  });

  it('round-trips through JSON', () => {
    const scene = createScene();
    const restored = Scene25D.fromJSON(scene.toJSON());
    expect(restored.getLayers()).toHaveLength(2);
    expect(restored.getCameras()).toHaveLength(1);
    expect(restored.getLights()).toHaveLength(1);
    expect(restored.getSprites()).toHaveLength(2);
  });
});

describe('Renderer25D', () => {
  it('has 2.5d capabilities and required features', () => {
    const renderer = new Renderer25D();
    expect(renderer.capabilities.hasMode('2.5d')).toBe(true);
    expect(renderer.capabilities.hasFeature('depth')).toBe(true);
    expect(renderer.capabilities.hasFeature('perspective-camera')).toBe(true);
    expect(renderer.capabilities.hasFeature('layers')).toBe(true);
    expect(renderer.capabilities.hasFeature('sprites')).toBe(true);
    expect(renderer.capabilities.hasFeature('spatial-presentation')).toBe(true);
    expect(renderer.capabilities.hasFeature('lighting')).toBe(true);
    expect(renderer.capabilities.hasFeature('camera-perspective')).toBe(true);
  });

  it('renders scene into perspective command list with stats', () => {
    const scene = new Scene25D();
    scene.addLayer(new Layer25D({ id: 'far', name: 'Far', order: 0, depth: -10 }));
    scene.addLayer(new Layer25D({ id: 'near', name: 'Near', order: 1, depth: 10 }));
    scene.addCamera(new Camera25D({ id: 'cam', name: 'Cam' }));
    scene.addLight(new Light25D({ id: 'light', name: 'Light', type: 'ambient' }));
    scene.addSprite(new Sprite25D({ id: 's1', name: 'One', layerId: 'far', transform: { z: -5 } }));
    scene.addSprite(new Sprite25D({ id: 's2', name: 'Two', layerId: 'near', transform: { z: 5 } }));

    const target = new RenderTarget({ id: 't', width: 800, height: 600, mode: '2.5d' });
    const renderer = new Renderer25D();
    const result = renderer.render(scene, target);

    expect(result.backendId).toBe('renderer-2.5d');
    expect(result.stats).toMatchObject({
      layerCount: 2,
      cameraCount: 1,
      lightCount: 1,
      spriteCount: 2,
      commandCount: expect.any(Number),
    });
    expect(result.data).toMatchObject({
      projection: 'perspective',
      depthSorting: 'far-to-near',
    });
    expect(Array.isArray(result.data!.commands)).toBe(true);
    expect(result.data!.commands.length).toBeGreaterThan(0);
  });

  it('rejects non-2.5d targets', () => {
    const scene = new Scene25D();
    const target = new RenderTarget({ id: 't', width: 10, height: 10, mode: '2d' });
    const renderer = new Renderer25D();
    expect(() => renderer.render(scene, target)).toThrow(/only supports 2.5d/);
  });
});
