import { describe, it, expect } from 'vitest';
import { RenderTarget } from '../RenderTarget.js';
import { RenderRequest } from '../RenderRequest.js';
import { RenderingCapabilities } from '../RenderingCapabilities.js';
import { RenderResult } from '../RenderResult.js';
import { SceneGraph } from '../SceneGraph.js';
import { RenderBackendRegistry } from '../RenderBackendRegistry.js';
import { SimpleSceneGraphBackend } from '../SimpleSceneGraphBackend.js';

describe('RenderTarget', () => {
  it('creates a valid target', () => {
    const target = new RenderTarget({ id: 't1', width: 800, height: 600 });
    expect(target.mode).toBe('2d');
    expect(target.pixelRatio).toBe(1);
  });

  it('rejects invalid width and height', () => {
    expect(() => new RenderTarget({ id: 't', width: 0, height: 10 })).toThrow(/width/);
    expect(() => new RenderTarget({ id: 't', width: 10, height: -1 })).toThrow(/height/);
  });

  it('rejects invalid mode', () => {
    expect(
      () => new RenderTarget({ id: 't', width: 10, height: 10, mode: '4d' as any }),
    ).toThrow(/mode/);
  });

  it('clones with deep-copied metadata', () => {
    const target = new RenderTarget({
      id: 't',
      width: 10,
      height: 10,
      metadata: { nested: { value: 1 } },
    });
    const clone = target.clone();
    clone.metadata!.nested!.value = 2;
    expect(target.metadata!.nested!.value).toBe(1);
  });

  it('round-trips through JSON', () => {
    const original = new RenderTarget({
      id: 't-json',
      width: 1920,
      height: 1080,
      mode: '2.5d',
      metadata: { label: 'test' },
    });
    const restored = RenderTarget.fromJSON(original.toJSON());
    expect(restored.id).toBe('t-json');
    expect(restored.mode).toBe('2.5d');
    expect(restored.metadata).toEqual({ label: 'test' });
  });
});

describe('RenderRequest', () => {
  it('creates valid request', () => {
    const request = new RenderRequest({ id: 'r1', targetId: 't1' });
    expect(request.targetId).toBe('t1');
  });

  it('rejects missing ids', () => {
    expect(() => new RenderRequest({ id: '', targetId: 't' })).toThrow(/id/);
    expect(() => new RenderRequest({ id: 'r', targetId: '' })).toThrow(/targetId/);
  });

  it('clones with deep-copied options', () => {
    const request = new RenderRequest({
      id: 'r',
      targetId: 't',
      options: { nested: { value: 1 } },
    });
    const clone = request.clone();
    clone.options!.nested!.value = 2;
    expect(request.options!.nested!.value).toBe(1);
  });
});

describe('RenderingCapabilities', () => {
  it('creates capabilities', () => {
    const capabilities = new RenderingCapabilities({
      modes: ['2d', '3d'],
      features: ['scene-graph'],
    });
    expect(capabilities.hasMode('2d')).toBe(true);
    expect(capabilities.hasFeature('scene-graph')).toBe(true);
  });

  it('rejects empty modes and duplicates', () => {
    expect(() => new RenderingCapabilities({ modes: [] })).toThrow(/mode/);
    expect(() => new RenderingCapabilities({ modes: ['2d', '2d'] })).toThrow(/Duplicate/);
  });

  it('rejects invalid maxResolution', () => {
    expect(
      () => new RenderingCapabilities({
        modes: ['2d'],
        maxResolution: { width: 0, height: 10 },
      }),
    ).toThrow(/width/);
  });
});

describe('RenderResult', () => {
  it('creates valid result', () => {
    const result = new RenderResult({
      frameNumber: 1,
      backendId: 'b',
      targetId: 't',
      stats: { nodes: 2 },
    });
    expect(result.frameNumber).toBe(1);
    expect(result.stats).toEqual({ nodes: 2 });
  });

  it('rejects invalid frame number', () => {
    expect(
      () => new RenderResult({ frameNumber: -1, backendId: 'b', targetId: 't' }),
    ).toThrow(/frameNumber/);
  });
});

describe('SceneGraph', () => {
  it('adds nodes and finds roots', () => {
    const graph = new SceneGraph();
    graph.addNode({ id: 'root', name: 'Root' });
    graph.addNode({ id: 'child', name: 'Child' });
    graph.setParent('child', 'root');
    expect(graph.getRoots()).toHaveLength(1);
    expect(graph.getChildren('root')).toHaveLength(1);
  });

  it('detects cycles', () => {
    const graph = new SceneGraph();
    graph.addNode({ id: 'a', name: 'A' });
    graph.addNode({ id: 'b', name: 'B' });
    graph.addNode({ id: 'c', name: 'C' });
    graph.setParent('b', 'a');
    graph.setParent('c', 'b');
    expect(() => graph.setParent('a', 'c')).toThrow(/cycle/);
  });

  it('rejects duplicate node ids', () => {
    const graph = new SceneGraph();
    graph.addNode({ id: 'a', name: 'A' });
    expect(() => graph.addNode({ id: 'a', name: 'Duplicate' })).toThrow(/already exists/);
  });

  it('clones with deep-copied node data', () => {
    const graph = new SceneGraph();
    graph.addNode({ id: 'root', name: 'Root', metadata: { nested: { value: 1 } } });
    const clone = graph.clone();
    clone.getNode('root')!.metadata!.nested!.value = 2;
    expect(graph.getNode('root')!.metadata!.nested!.value).toBe(1);
  });

  it('round-trips through JSON', () => {
    const graph = new SceneGraph();
    graph.addNode({ id: 'a', name: 'A' });
    graph.addNode({ id: 'b', name: 'B' });
    graph.setParent('b', 'a');
    const restored = SceneGraph.fromJSON(graph.toJSON());
    expect(restored.getChildren('a')).toHaveLength(1);
  });
});

describe('RenderBackendRegistry', () => {
  it('registers and retrieves backend', () => {
    const registry = new RenderBackendRegistry();
    const backend = new SimpleSceneGraphBackend();
    registry.register(backend);
    expect(registry.has(backend.id)).toBe(true);
    expect(registry.get(backend.id)).toBe(backend);
  });

  it('rejects duplicate backend id', () => {
    const registry = new RenderBackendRegistry();
    const backend = new SimpleSceneGraphBackend();
    registry.register(backend);
    expect(() => registry.register(backend)).toThrow(/already registered/);
  });

  it('sets and gets default backend', () => {
    const registry = new RenderBackendRegistry();
    const backend = new SimpleSceneGraphBackend();
    registry.register(backend);
    registry.setDefault(backend.id);
    expect(registry.getDefault()).toBe(backend);
  });
});

describe('SimpleSceneGraphBackend', () => {
  it('has 2d capability', () => {
    const backend = new SimpleSceneGraphBackend();
    expect(backend.capabilities.hasMode('2d')).toBe(true);
  });

  it('renders a scene graph and returns stats', () => {
    const backend = new SimpleSceneGraphBackend();
    const target = new RenderTarget({ id: 't', width: 100, height: 100 });
    const request = new RenderRequest({ id: 'r', targetId: 't' });
    const scene = new SceneGraph();
    scene.addNode({ id: 'a', name: 'A' });
    scene.addNode({ id: 'b', name: 'B' });
    scene.setParent('b', 'a');

    const result = backend.render(target, request, scene);
    expect(result.backendId).toBe(backend.id);
    expect(result.stats!.nodeCount).toBe(2);
    expect(result.stats!.edgeCount).toBe(1);
  });

  it('throws if scene is missing', () => {
    const backend = new SimpleSceneGraphBackend();
    const target = new RenderTarget({ id: 't', width: 10, height: 10 });
    const request = new RenderRequest({ id: 'r', targetId: 't' });
    expect(() => backend.render(target, request)).toThrow(/SceneGraph/);
  });
});
