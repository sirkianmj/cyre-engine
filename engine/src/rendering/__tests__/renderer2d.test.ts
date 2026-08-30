import { describe, it, expect } from 'vitest';
import { Transform2D } from '../Transform2D.js';
import { Sprite2D } from '../Sprite2D.js';
import { Layer2D } from '../Layer2D.js';
import { Camera2D } from '../Camera2D.js';
import { ParticleSystem2D } from '../ParticleSystem2D.js';
import { AnimationClip2D } from '../AnimationClip2D.js';
import { Scene2D } from '../Scene2D.js';
import { Renderer2D } from '../Renderer2D.js';
import { RenderTarget } from '../RenderTarget.js';

describe('Transform2D', () => {
  it('defaults to identity', () => {
    const transform = new Transform2D();
    expect(transform.x).toBe(0);
    expect(transform.y).toBe(0);
    expect(transform.scaleX).toBe(1);
    expect(transform.scaleY).toBe(1);
  });

  it('rejects non-finite values', () => {
    expect(() => new Transform2D({ x: Number.NaN })).toThrow(/finite/);
  });

  it('rejects zero scale', () => {
    expect(() => new Transform2D({ scaleX: 0 })).toThrow(/scale/);
  });

  it('clones and round-trips through JSON', () => {
    const original = new Transform2D({ x: 5, y: 10, rotation: 0.5 });
    const clone = original.clone();
    clone.x = 99;
    expect(original.x).toBe(5);
    const restored = Transform2D.fromJSON(original.toJSON());
    expect(restored.y).toBe(10);
  });
});

describe('Sprite2D', () => {
  it('creates with valid options', () => {
    const sprite = new Sprite2D({
      id: 's1',
      name: 'Player',
      layerId: 'layer1',
      opacity: 0.8,
    });
    expect(sprite.visible).toBe(true);
    expect(sprite.opacity).toBe(0.8);
  });

  it('rejects empty id or name', () => {
    expect(() => new Sprite2D({ id: '', name: 'x' })).toThrow(/id/);
    expect(() => new Sprite2D({ id: 'x', name: '' })).toThrow(/name/);
  });

  it('rejects invalid opacity', () => {
    expect(() => new Sprite2D({ id: 's', name: 'x', opacity: 1.2 })).toThrow(/opacity/);
  });

  it('clones with deep-copied transform', () => {
    const sprite = new Sprite2D({ id: 's', name: 'x', transform: { x: 1 } });
    const clone = sprite.clone();
    clone.transform.x = 2;
    expect(sprite.transform.x).toBe(1);
  });
});

describe('Layer2D', () => {
  it('validates zIndex integer', () => {
    expect(() => new Layer2D({ id: 'l', name: 'x', zIndex: 1.5 })).toThrow(/integer/);
  });
});

describe('Camera2D', () => {
  it('requires positive zoom and viewport', () => {
    expect(() => new Camera2D({ id: 'c', name: 'x', zoom: 0 })).toThrow(/zoom/);
    expect(() => new Camera2D({ id: 'c', name: 'x', width: 0 })).toThrow(/width/);
  });
});

describe('ParticleSystem2D', () => {
  it('validates numeric ranges', () => {
    expect(
      () => new ParticleSystem2D({
        id: 'p', name: 'x', maxParticles: 0, emissionRate: 1, lifetime: 1, speed: 1,
      }),
    ).toThrow(/maxParticles/);
    expect(
      () => new ParticleSystem2D({
        id: 'p', name: 'x', maxParticles: 10, emissionRate: -1, lifetime: 1, speed: 1,
      }),
    ).toThrow(/emissionRate/);
  });
});

describe('AnimationClip2D', () => {
  it('validates frame times and values', () => {
    expect(
      () => new AnimationClip2D({
        id: 'a', name: 'x', duration: 1,
        frames: [{ time: 2, value: {} }],
      }),
    ).toThrow(/frame time/);
    expect(
      () => new AnimationClip2D({
        id: 'a', name: 'x', duration: 1,
        frames: [{ time: 0.5, value: null as any }],
      }),
    ).toThrow(/frame value/);
  });
});

describe('Scene2D', () => {
  function createScene(): Scene2D {
    const scene = new Scene2D();
    scene.addLayer(new Layer2D({ id: 'bg', name: 'Background', zIndex: 0 }));
    scene.addLayer(new Layer2D({ id: 'fg', name: 'Foreground', zIndex: 10 }));
    scene.addCamera(new Camera2D({ id: 'cam', name: 'Main Camera', width: 800, height: 600 }));
    scene.addSprite(new Sprite2D({ id: 'sprite1', name: 'Enemy', layerId: 'bg' }));
    scene.addParticleSystem(new ParticleSystem2D({
      id: 'ps', name: 'Sparks', layerId: 'fg', maxParticles: 100, emissionRate: 5, lifetime: 2, speed: 10,
    }));
    scene.addAnimationClip(new AnimationClip2D({
      id: 'clip', name: 'Idle', duration: 2, loop: true,
      frames: [{ time: 0, value: { opacity: 1 } }, { time: 2, value: { opacity: 0.5 } }],
    }));
    return scene;
  }

  it('adds and retrieves entities with deep copies', () => {
    const scene = createScene();
    expect(scene.getLayers()).toHaveLength(2);
    expect(scene.getSprites()).toHaveLength(1);
    expect(scene.getParticleSystems()).toHaveLength(1);
    expect(scene.getAnimationClips()).toHaveLength(1);

    const sprite = scene.getSprite('sprite1')!;
    sprite.transform.x = 99;
    expect(scene.getSprite('sprite1')!.transform.x).not.toBe(99);
  });

  it('prevents duplicate IDs', () => {
    const scene = createScene();
    expect(() => scene.addLayer(new Layer2D({ id: 'bg', name: 'dup' }))).toThrow(/already exists/);
  });

  it('rejects sprite referencing unknown layer', () => {
    const scene = new Scene2D();
    expect(
      () => scene.addSprite(new Sprite2D({ id: 's', name: 'x', layerId: 'missing' })),
    ).toThrow(/unknown layer/);
  });

  it('validates scene references', () => {
    const scene = new Scene2D();
    scene.addLayer(new Layer2D({ id: 'l', name: 'Layer' }));
    const sprite = new Sprite2D({ id: 's', name: 'Sprite', layerId: 'l' });
    scene.addSprite(sprite);
    expect(() => scene.validate()).not.toThrow();
  });

  it('round-trips through JSON', () => {
    const scene = createScene();
    const restored = Scene2D.fromJSON(scene.toJSON());
    expect(restored.getLayers()).toHaveLength(2);
    expect(restored.getSprites()).toHaveLength(1);
    expect(restored.getParticleSystems()).toHaveLength(1);
  });
});

describe('Renderer2D', () => {
  it('has 2d capabilities and required features', () => {
    const renderer = new Renderer2D();
    expect(renderer.capabilities.hasMode('2d')).toBe(true);
    expect(renderer.capabilities.hasFeature('sprites')).toBe(true);
    expect(renderer.capabilities.hasFeature('layers')).toBe(true);
    expect(renderer.capabilities.hasFeature('cameras')).toBe(true);
    expect(renderer.capabilities.hasFeature('transforms')).toBe(true);
    expect(renderer.capabilities.hasFeature('ui')).toBe(true);
    expect(renderer.capabilities.hasFeature('animation')).toBe(true);
    expect(renderer.capabilities.hasFeature('particles')).toBe(true);
  });

  it('renders scene into command list with stats', () => {
    const scene = new Scene2D();
    scene.addLayer(new Layer2D({ id: 'l1', name: 'Layer 1', zIndex: 1 }));
    scene.addLayer(new Layer2D({ id: 'l2', name: 'Layer 2', zIndex: 0 }));
    scene.addCamera(new Camera2D({ id: 'cam', name: 'Cam' }));
    scene.addSprite(new Sprite2D({ id: 's', name: 'Sprite', layerId: 'l1' }));
    scene.addParticleSystem(new ParticleSystem2D({
      id: 'ps', name: 'Particles', layerId: 'l2', maxParticles: 10, emissionRate: 2, lifetime: 1, speed: 5,
    }));

    const target = new RenderTarget({ id: 't', width: 800, height: 600, mode: '2d' });
    const renderer = new Renderer2D();
    const result = renderer.render(scene, target);

    expect(result.backendId).toBe('renderer-2d');
    expect(result.stats).toMatchObject({
      layerCount: 2,
      spriteCount: 1,
      cameraCount: 1,
      particleSystemCount: 1,
      commandCount: expect.any(Number),
    });
    expect(Array.isArray(result.data!.commands)).toBe(true);
    expect(result.data!.commands.length).toBeGreaterThan(0);
  });

  it('rejects non-2d targets', () => {
    const scene = new Scene2D();
    const target = new RenderTarget({ id: 't', width: 10, height: 10, mode: '3d' });
    const renderer = new Renderer2D();
    expect(() => renderer.render(scene, target)).toThrow(/only supports 2d/);
  });
});
