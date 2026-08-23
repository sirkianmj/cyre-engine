import {
  Camera2D,
  Camera25D,
  Camera3D,
  Layer2D,
  Layer25D,
  Light25D,
  Light3D,
  Material3D,
  Mesh3D,
  RenderRequest,
  RenderResult,
  RenderTarget,
  Renderer2D,
  Renderer25D,
  Renderer3D,
  Scene2D,
  Scene25D,
  Scene3D,
  SceneGraph,
  Sprite2D,
  Sprite25D,
} from '@cyre/engine';

import type { RenderBackend } from '@cyre/engine';

import { visualForType, worldFromGraph } from './entityVisuals';

function requireScene(scene: SceneGraph | undefined, backend: string): SceneGraph {
  if (!scene) {
    throw new Error(`${backend} requires a SceneGraph.`);
  }
  scene.validate();
  return scene;
}

function withMode(target: RenderTarget, mode: RenderTarget['mode']): RenderTarget {
  if (target.mode === mode || target.mode === 'headless') {
    return target;
  }

  return new RenderTarget({
    id: target.id,
    width: target.width,
    height: target.height,
    pixelRatio: target.pixelRatio,
    mode,
    metadata: target.metadata,
  });
}

export function buildScene2D(graph: SceneGraph, width: number, height: number): Scene2D {
  const scene = new Scene2D();
  scene.addLayer(new Layer2D({ id: 'world', name: 'World', zIndex: 0, visible: true, opacity: 1 }));
  scene.addCamera(
    new Camera2D({
      id: 'main-2d',
      name: 'Main 2D Camera',
      x: 0,
      y: 0,
      zoom: 1,
      width,
      height,
      visible: true,
    }),
  );

  graph.getNodes().forEach((node, index) => {
    const visual = visualForType(node.type);
    const meta = node.metadata ?? {};
    const x = typeof meta.x === 'number' ? meta.x : index * 96;
    const y = typeof meta.y === 'number' ? meta.y : 0;

    scene.addSprite(
      new Sprite2D({
        id: node.id,
        name: node.name,
        layerId: 'world',
        color: visual.color,
        visible: true,
        opacity: 1,
        transform: { x, y, rotation: 0, scaleX: 1, scaleY: 1 },
        metadata: { type: node.type ?? 'other' },
      }),
    );
  });

  return scene;
}

export function buildScene25D(graph: SceneGraph): Scene25D {
  const scene = new Scene25D();
  scene.addLayer(
    new Layer25D({ id: 'world', name: 'World', order: 0, depth: 0, visible: true, opacity: 1 }),
  );
  scene.addCamera(
    new Camera25D({
      id: 'main-25d',
      name: 'Main 2.5D Camera',
      position: { x: 0, y: 8, z: 14 },
      lookAt: { x: 0, y: 0, z: 0 },
      fov: 48,
      visible: true,
    }),
  );
  scene.addLight(
    new Light25D({
      id: 'key-25d',
      name: 'Key Light',
      type: 'directional',
      color: '#d7ecff',
      intensity: 1.2,
      direction: { x: -0.35, y: -1, z: -0.25 },
    }),
  );
  scene.addLight(
    new Light25D({
      id: 'fill-25d',
      name: 'Fill Light',
      type: 'ambient',
      color: '#7fb4ff',
      intensity: 0.55,
    }),
  );

  graph.getNodes().forEach((node, index) => {
    const visual = visualForType(node.type);
    const world = worldFromGraph(
      typeof node.metadata?.x === 'number' ? node.metadata.x : undefined,
      typeof node.metadata?.y === 'number' ? node.metadata.y : undefined,
      index,
    );

    scene.addSprite(
      new Sprite25D({
        id: node.id,
        name: node.name,
        layerId: 'world',
        color: visual.color,
        visible: true,
        opacity: 1,
        transform: {
          x: world.x,
          y: 0.4,
          z: world.z,
          scaleX: 1,
          scaleY: 1,
          scaleZ: 1,
        },
        metadata: { type: node.type ?? 'other' },
      }),
    );
  });

  return scene;
}

export function buildScene3D(graph: SceneGraph): Scene3D {
  const scene = new Scene3D();

  scene.addCamera(
    new Camera3D({
      id: 'main-3d',
      name: 'Main 3D Camera',
      position: { x: 8, y: 7, z: 12 },
      target: { x: 0, y: 0.2, z: 0 },
      fov: 48,
      near: 0.1,
      far: 200,
      visible: true,
    }),
  );

  scene.addLight(
    new Light3D({
      id: 'ambient-3d',
      name: 'Ambient',
      type: 'ambient',
      color: '#8ec8ff',
      intensity: 0.7,
    }),
  );
  scene.addLight(
    new Light3D({
      id: 'key-3d',
      name: 'Key',
      type: 'directional',
      color: '#ffffff',
      intensity: 1.6,
      direction: { x: -0.45, y: -1, z: -0.35 },
    }),
  );

  const materialIds = new Set<string>();

  graph.getNodes().forEach((node, index) => {
    const visual = visualForType(node.type);
    const materialId = `mat-${node.type ?? 'other'}`;

    if (!materialIds.has(materialId)) {
      scene.addMaterial(
        new Material3D({
          id: materialId,
          name: `${visual.label} Material`,
          color: visual.color,
          roughness: 0.42,
          metallic: 0.22,
          opacity: 1,
        }),
      );
      materialIds.add(materialId);
    }

    const world = worldFromGraph(
      typeof node.metadata?.x === 'number' ? node.metadata.x : undefined,
      typeof node.metadata?.y === 'number' ? node.metadata.y : undefined,
      index,
    );

    scene.addMesh(
      new Mesh3D({
        id: node.id,
        name: node.name,
        materialId,
        geometryType: visual.geometry,
        visible: true,
        castShadow: true,
        receiveShadow: true,
        transform: {
          x: world.x,
          y: visual.geometry === 'sphere' ? 0.8 : 0.55,
          z: world.z,
          scaleX: 1,
          scaleY: 1,
          scaleZ: 1,
        },
        metadata: { type: node.type ?? 'other' },
      }),
    );
  });

  return scene;
}

export class Cyre2DRenderBackend implements RenderBackend {
  readonly id = 'cyre-2d';
  readonly name = 'CYRE 2D Engine';
  private readonly impl = new Renderer2D();
  readonly capabilities = this.impl.capabilities;

  render(target: RenderTarget, request: RenderRequest, scene?: SceneGraph): RenderResult {
    request.validate();
    const graph = requireScene(scene, this.name);
    const scene2d = buildScene2D(graph, target.width, target.height);
    return this.impl.render(scene2d, withMode(target, '2d'));
  }
}

export class Cyre25DRenderBackend implements RenderBackend {
  readonly id = 'cyre-2.5d';
  readonly name = 'CYRE 2.5D Engine';
  private readonly impl = new Renderer25D();
  readonly capabilities = this.impl.capabilities;

  render(target: RenderTarget, request: RenderRequest, scene?: SceneGraph): RenderResult {
    request.validate();
    const graph = requireScene(scene, this.name);
    return this.impl.render(buildScene25D(graph), withMode(target, '2.5d'));
  }
}

export class Cyre3DRenderBackend implements RenderBackend {
  readonly id = 'cyre-3d';
  readonly name = 'CYRE 3D Engine';
  private readonly impl = new Renderer3D();
  readonly capabilities = this.impl.capabilities;

  render(target: RenderTarget, request: RenderRequest, scene?: SceneGraph): RenderResult {
    request.validate();
    const graph = requireScene(scene, this.name);
    return this.impl.render(buildScene3D(graph), withMode(target, '3d'));
  }
}

export function createEngineRenderBackends(): RenderBackend[] {
  return [
    new Cyre2DRenderBackend(),
    new Cyre25DRenderBackend(),
    new Cyre3DRenderBackend(),
  ];
}

export function backendIdForMode(mode: string): string {
  if (mode === '2d') return 'cyre-2d';
  if (mode === '2.5d') return 'cyre-2.5d';
  return 'cyre-3d';
}
