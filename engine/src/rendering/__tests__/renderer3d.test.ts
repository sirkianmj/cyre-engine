import { describe, it, expect } from 'vitest';
import { Transform3D } from '../Transform3D.js';
import { Material3D } from '../Material3D.js';
import { Mesh3D } from '../Mesh3D.js';
import { Camera3D } from '../Camera3D.js';
import { Light3D } from '../Light3D.js';
import { Scene3D } from '../Scene3D.js';
import { Renderer3D } from '../Renderer3D.js';
import { RenderTarget } from '../RenderTarget.js';

describe('Transform3D', () => {
  it('defaults to identity', () => {
    const transform = new Transform3D();
    expect(transform.x).toBe(0);
    expect(transform.y).toBe(0);
    expect(transform.z).toBe(0);
    expect(transform.scaleX).toBe(1);
    expect(transform.scaleY).toBe(1);
    expect(transform.scaleZ).toBe(1);
  });

  it('rejects non-finite values', () => {
    expect(() => new Transform3D({ x: Number.NaN })).toThrow(/finite/);
  });

  it('rejects zero scale', () => {
    expect(() => new Transform3D({ scaleZ: 0 })).toThrow(/scale/);
  });

  it('clones and round-trips through JSON', () => {
    const original = new Transform3D({ x: 1, y: 2, z: 3, rotationZ: 0.5 });
    const clone = original.clone();
    clone.z = 99;
    expect(original.z).toBe(3);
    const restored = Transform3D.fromJSON(original.toJSON());
    expect(restored.y).toBe(2);
  });
});

describe('Material3D', () => {
  it('creates with defaults', () => {
    const material = new Material3D({ id: 'mat', name: 'Default' });
    expect(material.color).toBe('#ffffff');
    expect(material.roughness).toBe(0.5);
    expect(material.metallic).toBe(0);
    expect(material.opacity).toBe(1);
    expect(material.doubleSided).toBe(false);
  });

  it('validates numeric ranges', () => {
    expect(() => new Material3D({ id: 'm', name: 'x', roughness: 1.1 })).toThrow(/roughness/);
    expect(() => new Material3D({ id: 'm', name: 'x', metallic: -0.1 })).toThrow(/metallic/);
    expect(() => new Material3D({ id: 'm', name: 'x', opacity: 1.5 })).toThrow(/opacity/);
  });
});

describe('Mesh3D', () => {
  it('creates with material and default geometry', () => {
    const mesh = new Mesh3D({ id: 'mesh', name: 'Server', materialId: 'mat' });
    expect(mesh.geometryType).toBe('box');
    expect(mesh.visible).toBe(true);
  });

  it('validates material id and geometry type', () => {
    expect(() => new Mesh3D({ id: 'm', name: 'x', materialId: '' })).toThrow(/materialId/);
    expect(
      () => new Mesh3D({ id: 'm', name: 'x', materialId: 'mat', geometryType: 'sphere2' as any }),
    ).toThrow(/geometry type/);
  });

  it('clones with deep-copied transform and metadata', () => {
    const mesh = new Mesh3D({
      id: 'm',
      name: 'x',
      materialId: 'mat',
      transform: { x: 1, y: 2, z: 3 },
      metadata: { nested: { value: 1 } },
    });
    const clone = mesh.clone();
    clone.transform.x = 99;
    clone.metadata!.nested!.value = 99;
    expect(mesh.transform.x).toBe(1);
    expect(mesh.metadata!.nested!.value).toBe(1);
  });
});

describe('Camera3D', () => {
  it('creates with defaults', () => {
    const camera = new Camera3D({ id: 'cam', name: 'Main Camera' });
    expect(camera.position).toEqual({ x: 0, y: 0, z: 10 });
    expect(camera.target).toEqual({ x: 0, y: 0, z: 0 });
    expect(camera.fov).toBe(60);
    expect(camera.aspect).toBe(16 / 9);
    expect(camera.visible).toBe(true);
  });

  it('validates fov, near, far, aspect', () => {
    expect(() => new Camera3D({ id: 'c', name: 'x', fov: 0 })).toThrow(/fov/);
    expect(() => new Camera3D({ id: 'c', name: 'x', near: 0 })).toThrow(/near/);
    expect(() => new Camera3D({ id: 'c', name: 'x', far: 1, near: 2 })).toThrow(/far/);
    expect(() => new Camera3D({ id: 'c', name: 'x', aspect: 0 })).toThrow(/aspect/);
  });
});

describe('Light3D', () => {
  it('creates ambient light', () => {
    const light = new Light3D({ id: 'l', name: 'Ambient', type: 'ambient' });
    expect(light.intensity).toBe(1);
    expect(light.position).toBeUndefined();
  });

  it('requires position for point light', () => {
    expect(() => new Light3D({ id: 'l', name: 'Point', type: 'point' })).toThrow(/position/);
  });

  it('requires direction for directional light', () => {
    expect(() => new Light3D({ id: 'l', name: 'Dir', type: 'directional' })).toThrow(/direction/);
  });

  it('requires both position and direction for spot light', () => {
    expect(
      () => new Light3D({
        id: 'l', name: 'Spot', type: 'spot',
        position: { x: 1, y: 2, z: 3 },
      }),
    ).toThrow(/position and direction/);
  });

  it('validates angle and penumbra', () => {
    expect(
      () => new Light3D({
        id: 'l', name: 'Spot', type: 'spot',
        position: { x: 1, y: 2, z: 3 }, direction: { x: 0, y: -1, z: 0 },
        angle: 200,
      }),
    ).toThrow(/angle/);
    expect(
      () => new Light3D({
        id: 'l', name: 'Spot', type: 'spot',
        position: { x: 1, y: 2, z: 3 }, direction: { x: 0, y: -1, z: 0 },
        penumbra: 1.5,
      }),
    ).toThrow(/penumbra/);
  });
});

describe('Scene3D', () => {
  function createScene(): Scene3D {
    const scene = new Scene3D();
    scene.addMaterial(new Material3D({ id: 'server-mat', name: 'Server Material', color: '#333333' }));
    scene.addMaterial(new Material3D({ id: 'floor-mat', name: 'Floor Material', color: '#666666' }));
    scene.addCamera(new Camera3D({ id: 'cam', name: 'Main Camera' }));
    scene.addLight(new Light3D({ id: 'amb', name: 'Ambient', type: 'ambient', intensity: 0.6 }));
    scene.addLight(new Light3D({
      id: 'dir',
      name: 'Directional',
      type: 'directional',
      direction: { x: -1, y: -1, z: 0 },
      intensity: 1.2,
    }));
    scene.addMesh(new Mesh3D({
      id: 'server-rack',
      name: 'Server Rack',
      materialId: 'server-mat',
      geometryType: 'box',
      transform: { x: 0, y: 1, z: -2 },
      castShadow: true,
      receiveShadow: true,
    }));
    scene.addMesh(new Mesh3D({
      id: 'floor',
      name: 'Floor',
      materialId: 'floor-mat',
      geometryType: 'plane',
      transform: { scaleX: 5, scaleY: 1, scaleZ: 5 },
      receiveShadow: true,
    }));
    return scene;
  }

  it('adds and retrieves entities with deep copies', () => {
    const scene = createScene();
    expect(scene.getMaterials()).toHaveLength(2);
    expect(scene.getCameras()).toHaveLength(1);
    expect(scene.getLights()).toHaveLength(2);
    expect(scene.getMeshes()).toHaveLength(2);

    const mesh = scene.getMesh('server-rack')!;
    mesh.transform.x = 99;
    expect(scene.getMesh('server-rack')!.transform.x).not.toBe(99);
  });

  it('prevents duplicate IDs', () => {
    const scene = createScene();
    expect(() => scene.addMaterial(new Material3D({ id: 'server-mat', name: 'Dup' }))).toThrow(/already exists/);
    expect(() => scene.addMesh(new Mesh3D({ id: 'server-rack', name: 'Dup', materialId: 'server-mat' }))).toThrow(/already exists/);
  });

  it('rejects mesh referencing missing material', () => {
    const scene = new Scene3D();
    expect(
      () => scene.addMesh(new Mesh3D({ id: 'm', name: 'x', materialId: 'missing' })),
    ).toThrow(/unknown material/);
  });

  it('validates material references', () => {
    const scene = new Scene3D();
    scene.addMaterial(new Material3D({ id: 'mat', name: 'Material' }));
    scene.addMesh(new Mesh3D({ id: 'm', name: 'Mesh', materialId: 'mat' }));
    expect(() => scene.validate()).not.toThrow();
  });

  it('round-trips through JSON', () => {
    const scene = createScene();
    const restored = Scene3D.fromJSON(scene.toJSON());
    expect(restored.getMaterials()).toHaveLength(2);
    expect(restored.getMeshes()).toHaveLength(2);
    expect(restored.getCameras()).toHaveLength(1);
    expect(restored.getLights()).toHaveLength(2);
  });
});

describe('Renderer3D', () => {
  it('has 3d capabilities and required features', () => {
    const renderer = new Renderer3D();
    expect(renderer.capabilities.hasMode('3d')).toBe(true);
    expect(renderer.capabilities.hasFeature('scene-graph')).toBe(true);
    expect(renderer.capabilities.hasFeature('meshes')).toBe(true);
    expect(renderer.capabilities.hasFeature('materials')).toBe(true);
    expect(renderer.capabilities.hasFeature('cameras')).toBe(true);
    expect(renderer.capabilities.hasFeature('lights')).toBe(true);
    expect(renderer.capabilities.hasFeature('transforms')).toBe(true);
    expect(renderer.capabilities.hasFeature('basic-render')).toBe(true);
    expect(renderer.capabilities.hasFeature('asset-loading')).toBe(true);
  });

  it('renders scene into perspective command list with stats', () => {
    const scene = new Scene3D();
    scene.addMaterial(new Material3D({ id: 'mat', name: 'Material' }));
    scene.addCamera(new Camera3D({ id: 'cam', name: 'Cam' }));
    scene.addLight(new Light3D({ id: 'light', name: 'Light', type: 'ambient' }));
    scene.addMesh(new Mesh3D({ id: 'mesh', name: 'Mesh', materialId: 'mat' }));

    const target = new RenderTarget({ id: 't', width: 1280, height: 720, mode: '3d' });
    const renderer = new Renderer3D();
    const result = renderer.render(scene, target);

    expect(result.backendId).toBe('renderer-3d');
    expect(result.stats).toMatchObject({
      materialCount: 1,
      meshCount: 1,
      cameraCount: 1,
      lightCount: 1,
      commandCount: expect.any(Number),
    });
    expect(result.data).toMatchObject({ projection: 'perspective' });
    expect(Array.isArray(result.data!.commands)).toBe(true);
    expect(result.data!.commands.length).toBeGreaterThan(0);
  });

  it('rejects non-3d targets', () => {
    const scene = new Scene3D();
    const target = new RenderTarget({ id: 't', width: 10, height: 10, mode: '2d' });
    const renderer = new Renderer3D();
    expect(() => renderer.render(scene, target)).toThrow(/only supports 3d/);
  });
});
