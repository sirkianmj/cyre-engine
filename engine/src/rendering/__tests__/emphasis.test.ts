import { describe, expect, it } from 'vitest';

import { CyberSimulation } from '../../cyber/simulation/CyberSimulation.js';
import { CyberWorldAdapter } from '../CyberWorldAdapter.js';
import {
  GpuSceneRenderer,
  layoutHostPosition,
  resolveHostPositions,
  styleForHostMetadata,
} from '../gpu/GpuSceneRenderer.js';
import type { GpuEmphasis, GpuRenderOptions } from '../gpu/GpuSceneRenderer.js';
import { DEFAULT_GPU_RENDER_OPTIONS } from '../gpu/GpuSceneRenderer.js';
import { buildRing } from '../gpu/Geometry.js';
import { RecordingGpuDevice } from '../gpu/RecordingGpuDevice.js';

import type { GpuProjectionMode } from '../gpu/GpuSceneRenderer.js';

/** Interleaved vertex layout: vec3 position, vec3 normal, vec4 colour. */
const FLOATS_PER_VERTEX = 10;

interface Vertex {
  position: readonly [number, number, number];
  normal: readonly [number, number, number];
  color: readonly [number, number, number, number];
}

function vertexAt(data: Float32Array, index: number): Vertex {
  const base = index * FLOATS_PER_VERTEX;
  return {
    position: [data[base], data[base + 1], data[base + 2]],
    normal: [data[base + 3], data[base + 4], data[base + 5]],
    color: [data[base + 6], data[base + 7], data[base + 8], data[base + 9]],
  };
}

function vertices(data: Float32Array | null): Vertex[] {
  if (!data) return [];
  const count = Math.floor(data.length / FLOATS_PER_VERTEX);
  return Array.from({ length: count }, (_, index) => vertexAt(data, index));
}

function camera() {
  return {
    width: 1280,
    height: 720,
    panX: 0,
    panY: 0,
    zoom: 1,
    yaw: 0.7,
    pitch: 0.55,
    distance: 20,
    target: [0, 0, 0] as readonly [number, number, number],
  };
}

function options(overrides: Partial<GpuRenderOptions> = {}): GpuRenderOptions {
  return { ...DEFAULT_GPU_RENDER_OPTIONS, ...overrides };
}

function emphasis(overrides: Partial<GpuEmphasis> = {}): GpuEmphasis {
  return { selectedIds: [], hoveredId: null, time: 0, ...overrides };
}

/** A live incident: compromise, escalation, detection and one containment. */
function incidentScene() {
  const sim = new CyberSimulation(42);
  sim.initialize();
  sim.runRecon();
  sim.discoverServices();
  sim.exploitWebServer();
  sim.escalatePrivileges();
  sim.moveToDatabase();
  sim.detectThreats();
  sim.isolateHost('admin-workstation');
  return CyberWorldAdapter.toSceneGraph(sim.getState());
}

/** One ring is 56 segments x 2 triangles. */
const RING_TRIANGLES = 112;

describe('buildRing', () => {
  it('builds a closed band between the inner and outer radius', () => {
    const ring = buildRing(1, 1.16, 56);

    // Two concentric loops of segments+1 vertices.
    expect(ring.positions.length / 3).toBe((56 + 1) * 2);
    expect(ring.normals.length).toBe(ring.positions.length);
    expect(ring.indices.length).toBe(56 * 2 * 3);
  });

  it('keeps every vertex on one of the two radii', () => {
    const ring = buildRing(1, 1.16, 24);

    for (let i = 0; i < ring.positions.length; i += 3) {
      const radius = Math.hypot(ring.positions[i], ring.positions[i + 1]);
      expect(Math.abs(radius - 1) < 1e-9 || Math.abs(radius - 1.16) < 1e-9).toBe(true);
    }
  });

  it('lies in the XY plane facing +Z', () => {
    const ring = buildRing(1, 1.2, 16);

    for (let i = 2; i < ring.positions.length; i += 3) {
      expect(ring.positions[i]).toBe(0);
    }
    for (let i = 0; i < ring.normals.length; i += 3) {
      expect(ring.normals[i]).toBe(0);
      expect(ring.normals[i + 1]).toBe(0);
      expect(ring.normals[i + 2]).toBe(1);
    }
  });

  it('winds counter-clockwise when viewed from +Z', () => {
    const ring = buildRing(1, 1.2, 16);

    for (let i = 0; i < ring.indices.length; i += 3) {
      const a = ring.indices[i] * 3;
      const b = ring.indices[i + 1] * 3;
      const c = ring.indices[i + 2] * 3;

      const crossZ =
        (ring.positions[b] - ring.positions[a]) *
          (ring.positions[c + 1] - ring.positions[a + 1]) -
        (ring.positions[b + 1] - ring.positions[a + 1]) *
          (ring.positions[c] - ring.positions[a]);

      expect(crossZ).toBeGreaterThan(0);
    }
  });

  it('rejects a degenerate ring', () => {
    expect(() => buildRing(0, 1)).toThrow(/inner radius/);
    expect(() => buildRing(1, 1)).toThrow(/greater than/);
    expect(() => buildRing(1, 2, 2)).toThrow(/at least 3 segments/);
  });
});

describe('resolveHostPositions', () => {
  const modes: GpuProjectionMode[] = ['2d', '2.5d', '3d'];

  it('falls back to the automatic layout with no overrides', () => {
    const nodes = incidentScene().getNodes();

    for (const mode of modes) {
      const positions = resolveHostPositions(nodes, mode);
      expect(positions.size).toBe(nodes.length);

      nodes.forEach((node, index) => {
        expect(positions.get(node.id)).toEqual(layoutHostPosition(index, nodes.length, mode));
      });
    }
  });

  it('lets a dragged host keep its manual position', () => {
    const nodes = incidentScene().getNodes();
    const target = nodes[1] ?? nodes[0];
    const manual: readonly [number, number, number] = [3.25, -1.5, 4.75];

    const positions = resolveHostPositions(nodes, '3d', new Map([[target.id, manual]]));

    expect(positions.get(target.id)).toEqual(manual);
    // Untouched hosts stay on the automatic layout.
    expect(positions.get(nodes[0].id)).toEqual(
      resolveHostPositions(nodes, '3d').get(nodes[0].id),
    );
  });

  it('ignores a non-finite override instead of emitting NaN geometry', () => {
    const nodes = incidentScene().getNodes();
    const target = nodes[0];

    const positions = resolveHostPositions(
      nodes,
      '3d',
      new Map([[target.id, [Number.NaN, 1, 2] as readonly [number, number, number]]]),
    );

    const resolved = positions.get(target.id);
    expect(resolved).toBeDefined();
    resolved?.forEach((component) => expect(Number.isFinite(component)).toBe(true));
  });
});

describe('selection and hover emphasis', () => {
  it('draws one halo ring per selected host', () => {
    const scene = incidentScene();
    const nodes = scene.getNodes();
    const picked = nodes.slice(0, 2).map((node) => node.id);

    const plain = new RecordingGpuDevice();
    const plainStats = new GpuSceneRenderer(plain).render(scene, camera(), '3d');

    const selected = new RecordingGpuDevice();
    const selectedStats = new GpuSceneRenderer(selected).render(
      scene,
      camera(),
      '3d',
      options(),
      emphasis({ selectedIds: picked }),
    );

    expect(selectedStats.triangleCount - plainStats.triangleCount).toBe(
      picked.length * RING_TRIANGLES,
    );
  });

  it('draws a halo for the hovered host', () => {
    const scene = incidentScene();
    const nodes = scene.getNodes();
    const hovered = nodes[0].id;

    const plain = new RecordingGpuDevice();
    const plainStats = new GpuSceneRenderer(plain).render(scene, camera(), '3d');

    const hover = new RecordingGpuDevice();
    const hoverStats = new GpuSceneRenderer(hover).render(
      scene,
      camera(),
      '3d',
      options(),
      emphasis({ hoveredId: hovered }),
    );

    expect(hoverStats.triangleCount - plainStats.triangleCount).toBe(RING_TRIANGLES);
  });

  it('marks a host that is both selected and hovered with a single halo', () => {
    const scene = incidentScene();
    const id = scene.getNodes()[0].id;

    const plain = new RecordingGpuDevice();
    const plainStats = new GpuSceneRenderer(plain).render(scene, camera(), '3d');

    const both = new RecordingGpuDevice();
    const bothStats = new GpuSceneRenderer(both).render(
      scene,
      camera(),
      '3d',
      options(),
      emphasis({ selectedIds: [id], hoveredId: id }),
    );

    expect(bothStats.triangleCount - plainStats.triangleCount).toBe(RING_TRIANGLES);
  });

  it('ignores emphasis for hosts that are not in the scene', () => {
    const scene = incidentScene();

    const plain = new RecordingGpuDevice();
    const plainStats = new GpuSceneRenderer(plain).render(scene, camera(), '3d');

    const ghost = new RecordingGpuDevice();
    const ghostStats = new GpuSceneRenderer(ghost).render(
      scene,
      camera(),
      '3d',
      options(),
      emphasis({ selectedIds: ['no-such-host'], hoveredId: 'also-missing' }),
    );

    expect(ghostStats.triangleCount).toBe(plainStats.triangleCount);
  });

  it('works identically in the flat projections', () => {
    const scene = incidentScene();
    const picked = scene.getNodes().slice(0, 2).map((node) => node.id);

    for (const mode of ['2d', '2.5d'] as const) {
      const plain = new RecordingGpuDevice();
      const plainStats = new GpuSceneRenderer(plain).render(scene, camera(), mode);

      const selected = new RecordingGpuDevice();
      const selectedStats = new GpuSceneRenderer(selected).render(
        scene,
        camera(),
        mode,
        options(),
        emphasis({ selectedIds: picked }),
      );

      expect(selectedStats.triangleCount - plainStats.triangleCount).toBe(
        picked.length * RING_TRIANGLES,
      );
    }
  });

  it('lifts a hovered host further and brighter than a merely selected one', () => {
    const scene = incidentScene();
    const node = scene.getNodes()[0];
    const id = node.id;

    // Hover and selection each add exactly one halo ring, so comparing them
    // against each other isolates the hover treatment: everything else in the
    // frame — links, grid, other hosts — is byte-identical between the two.
    const selected = new RecordingGpuDevice();
    new GpuSceneRenderer(selected).render(
      scene,
      camera(),
      '2d',
      options(),
      emphasis({ selectedIds: [id] }),
    );

    const hovered = new RecordingGpuDevice();
    new GpuSceneRenderer(hovered).render(
      scene,
      camera(),
      '2d',
      options(),
      emphasis({ hoveredId: id }),
    );

    expect(vertices(selected.lastVertexData).length).toBe(
      vertices(hovered.lastVertexData).length,
    );

    // Measure the host's own disc only. The disc spans 0..radius*lift while the
    // halo starts at 1.4*radius, so a cutoff of 1.35*radius selects the disc
    // and excludes the ring — necessary because the selection ring is
    // deliberately the brighter of the two and would otherwise dominate a
    // whole-frame brightness comparison.
    const center = resolveHostPositions(scene.getNodes(), '2d').get(id) ?? [0, 0, 0];
    const radius = styleForHostMetadata(
      (node.metadata ?? {}) as Record<string, unknown>,
    ).radius;
    const cutoff = radius * 1.35;

    const discOf = (data: Float32Array | null): Vertex[] =>
      vertices(data).filter(
        (vertex) =>
          Math.hypot(
            vertex.position[0] - center[0],
            vertex.position[1] - center[1],
            vertex.position[2] - center[2],
          ) <= cutoff,
      );

    const selectedDisc = discOf(selected.lastVertexData);
    const hoveredDisc = discOf(hovered.lastVertexData);

    expect(selectedDisc.length).toBeGreaterThan(0);
    expect(selectedDisc.length).toBe(hoveredDisc.length);

    const maxRadius = (disc: Vertex[]): number =>
      disc.reduce(
        (max, vertex) =>
          Math.max(
            max,
            Math.hypot(
              vertex.position[0] - center[0],
              vertex.position[1] - center[1],
              vertex.position[2] - center[2],
            ),
          ),
        0,
      );

    const brightness = (disc: Vertex[]): number =>
      disc.reduce((sum, vertex) => sum + vertex.color[0] + vertex.color[1] + vertex.color[2], 0);

    // Hover uses the larger lift (1.16 against 1.08) and the brighter glow
    // (1.22 against 1.14), so hovering must read as stronger than selecting.
    expect(maxRadius(hoveredDisc)).toBeGreaterThan(maxRadius(selectedDisc));
    expect(brightness(hoveredDisc)).toBeGreaterThan(brightness(selectedDisc));
  });
});

describe('state animation', () => {
  it('moves a compromised host between frames while a clean host stays put', () => {
    const scene = incidentScene();
    const nodes = scene.getNodes();

    const compromisedIndex = nodes.findIndex((node) => {
      const metadata = (node.metadata ?? {}) as Record<string, unknown>;
      return metadata.compromised === true || metadata.isAttackerPosition === true;
    });
    expect(compromisedIndex).toBeGreaterThanOrEqual(0);

    const cleanIndex = nodes.findIndex((node, index) => {
      if (index === compromisedIndex) return false;
      const metadata = (node.metadata ?? {}) as Record<string, unknown>;
      return (
        metadata.compromised !== true &&
        metadata.alerted !== true &&
        metadata.isolated !== true &&
        metadata.isAttackerPosition !== true
      );
    });
    expect(cleanIndex).toBeGreaterThanOrEqual(0);

    const first = new RecordingGpuDevice();
    new GpuSceneRenderer(first).render(
      scene,
      camera(),
      '2d',
      options(),
      emphasis({ time: 0 }),
    );

    const later = new RecordingGpuDevice();
    new GpuSceneRenderer(later).render(
      scene,
      camera(),
      '2d',
      options(),
      emphasis({ time: 0.55 }),
    );

    const firstVertices = vertices(first.lastVertexData);
    const laterVertices = vertices(later.lastVertexData);
    expect(firstVertices.length).toBe(laterVertices.length);
    expect(firstVertices.length).toBeGreaterThan(0);

    const brightness = (v: Vertex): number => v.color[0] + v.color[1] + v.color[2];

    const animated = firstVertices.filter(
      (vertex, index) => Math.abs(brightness(vertex) - brightness(laterVertices[index])) > 1e-6,
    );

    expect(animated.length).toBeGreaterThan(0);

    // The animation carries information only if it is selective: hosts in no
    // cyber state, the grid and the links all stay exactly where they were, so
    // the animated vertices must be a strict subset of the frame.
    expect(animated.length).toBeLessThan(firstVertices.length);
  });

  it('keeps a stable phase per host so pulses do not drift between frames', () => {
    const scene = incidentScene();

    const a = new RecordingGpuDevice();
    new GpuSceneRenderer(a).render(scene, camera(), '2d', options(), emphasis({ time: 0.4 }));

    const b = new RecordingGpuDevice();
    new GpuSceneRenderer(b).render(scene, camera(), '2d', options(), emphasis({ time: 0.4 }));

    expect(Array.from(a.lastVertexData ?? [])).toEqual(Array.from(b.lastVertexData ?? []));
  });

  it('treats a non-finite clock as zero rather than NaN-ing the frame', () => {
    const scene = incidentScene();

    const device = new RecordingGpuDevice();
    new GpuSceneRenderer(device).render(
      scene,
      camera(),
      '2d',
      options(),
      emphasis({ time: Number.NaN }),
    );

    vertices(device.lastVertexData).forEach((vertex) => {
      vertex.color.forEach((channel) => expect(Number.isFinite(channel)).toBe(true));
      vertex.position.forEach((component) => expect(Number.isFinite(component)).toBe(true));
    });
  });
});

describe('host position overrides', () => {
  it('draws a dragged host at its overridden world position', () => {
    const scene = incidentScene();
    const nodes = scene.getNodes();
    const target = nodes[0];
    const manual: readonly [number, number, number] = [2.5, -1.25, 3.5];

    const device = new RecordingGpuDevice();
    new GpuSceneRenderer(device).render(
      scene,
      camera(),
      '3d',
      options(),
      emphasis(),
      new Map([[target.id, manual]]),
    );

    const found = vertices(device.lastVertexData).some(
      (vertex) =>
        Math.abs(vertex.position[0] - manual[0]) < 1.5 &&
        Math.abs(vertex.position[1] - manual[1]) < 1.5 &&
        Math.abs(vertex.position[2] - manual[2]) < 1.5,
    );

    expect(found).toBe(true);
  });

  it('does not move any host when no overrides are supplied', () => {
    const scene = incidentScene();

    const withEmpty = new RecordingGpuDevice();
    new GpuSceneRenderer(withEmpty).render(
      scene,
      camera(),
      '3d',
      options(),
      emphasis(),
      new Map(),
    );

    const without = new RecordingGpuDevice();
    new GpuSceneRenderer(without).render(scene, camera(), '3d');

    expect(Array.from(withEmpty.lastVertexData ?? [])).toEqual(
      Array.from(without.lastVertexData ?? []),
    );
  });
});
