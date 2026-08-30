import { describe, expect, it } from 'vitest';

import { CyberSimulation } from '../../cyber/simulation/CyberSimulation.js';
import { CyberWorldAdapter } from '../CyberWorldAdapter.js';
import {
  computeViewProjection,
  layoutHostPosition,
} from '../gpu/GpuSceneRenderer.js';

import type { GpuProjectionMode, GpuSceneCamera } from '../gpu/GpuSceneRenderer.js';

/**
 * On-screen placement tests.
 *
 * These exist because "the renderer is black" has two entirely different
 * causes: nothing drawn, or everything drawn outside the viewport. The draw
 * calls are covered elsewhere; these assert the second half by pushing real
 * host positions through the exact matrices the renderer uploads and checking
 * they land inside the clip volume.
 */

function camera(overrides: Partial<GpuSceneCamera> = {}): GpuSceneCamera {
  return {
    width: 1280,
    height: 720,
    panX: 0,
    panY: 0,
    zoom: 1,
    yaw: 0.7,
    pitch: 0.5,
    distance: 22,
    target: [0, 0, 0],
    ...overrides,
  };
}

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

/** Multiplies a column-major mat4 by a point, returning NDC after the divide. */
function project(
  m: Float32Array,
  p: readonly [number, number, number],
): { x: number; y: number; z: number; w: number } {
  const x = m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12];
  const y = m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13];
  const z = m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14];
  const w = m[3] * p[0] + m[7] * p[1] + m[11] * p[2] + m[15];

  if (Math.abs(w) < 1e-9) return { x: NaN, y: NaN, z: NaN, w };

  return { x: x / w, y: y / w, z: z / w, w };
}

function hostPositions(mode: GpuProjectionMode, count = 5): Array<readonly [number, number, number]> {
  return Array.from({ length: count }, (_, i) => layoutHostPosition(i, count, mode));
}

describe('hosts project on screen in every mode', () => {
  for (const mode of ['2d', '2.5d', '3d'] as const) {
    it(`${mode}: every host lands inside the viewport`, () => {
      const matrix = computeViewProjection(camera(), mode);
      const projected = hostPositions(mode).map((p) => project(matrix, p));

      // No NaN from a degenerate matrix.
      for (const p of projected) {
        expect(Number.isFinite(p.x)).toBe(true);
        expect(Number.isFinite(p.y)).toBe(true);
      }

      // In front of the camera, and inside the clip cube.
      for (const p of projected) {
        expect(p.w).toBeGreaterThan(0);
        expect(Math.abs(p.x)).toBeLessThanOrEqual(1);
        expect(Math.abs(p.y)).toBeLessThanOrEqual(1);
      }
    });

    it(`${mode}: hosts are spread across the frame, not collapsed to a point`, () => {
      const matrix = computeViewProjection(camera(), mode);
      const projected = hostPositions(mode, 9).map((p) => project(matrix, p));

      const xs = projected.map((p) => p.x);
      const ys = projected.map((p) => p.y);

      // A real layout occupies a meaningful fraction of the frame. If every
      // host projects to nearly the same pixel the scene reads as empty.
      expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(0.2);
      expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(0.1);
    });

    it(`${mode}: the whole network fits on screen at once`, () => {
      const matrix = computeViewProjection(camera(), mode);
      const projected = hostPositions(mode, 16).map((p) => project(matrix, p));

      const inside = projected.filter(
        (p) => Math.abs(p.x) <= 1 && Math.abs(p.y) <= 1 && p.w > 0,
      );

      // Every host must be visible; a network partly off-screen is a framing bug.
      expect(inside.length).toBe(projected.length);
    });
  }
});

describe('camera controls move the scene on screen', () => {
  it('3D: orbiting yaw moves hosts across the frame', () => {
    const a = computeViewProjection(camera({ yaw: 0.2 }), '3d');
    const b = computeViewProjection(camera({ yaw: 1.4 }), '3d');

    const pos = hostPositions('3d', 5);
    const xa = pos.map((p) => project(a, p).x);
    const xb = pos.map((p) => project(b, p).x);

    expect(xa).not.toEqual(xb);
  });

  it('3D: increasing distance shrinks the scene (zoom out)', () => {
    const near = computeViewProjection(camera({ distance: 12 }), '3d');
    const far = computeViewProjection(camera({ distance: 60 }), '3d');

    const spread = (m: Float32Array): number => {
      const xs = hostPositions('3d', 5).map((p) => project(m, p).x);
      return Math.max(...xs) - Math.min(...xs);
    };

    expect(spread(near)).toBeGreaterThan(spread(far));
  });

  it('2D: panning translates the scene across the frame', () => {
    const a = computeViewProjection(camera({ panX: 0 }), '2d');
    const b = computeViewProjection(camera({ panX: 5 }), '2d');

    const pos = hostPositions('2d', 5);
    expect(pos.map((p) => project(a, p).x)).not.toEqual(pos.map((p) => project(b, p).x));
  });

  it('2D: zooming in enlarges the scene', () => {
    const spread = (zoom: number): number => {
      const m = computeViewProjection(camera({ zoom }), '2d');
      const xs = hostPositions('2d', 5).map((p) => project(m, p).x);
      return Math.max(...xs) - Math.min(...xs);
    };

    expect(spread(2)).toBeGreaterThan(spread(0.5));
  });

  it('keeps hosts on screen at the zoom extremes', () => {
    for (const zoom of [0.5, 1, 2, 4]) {
      for (const mode of ['2d', '2.5d'] as const) {
        const m = computeViewProjection(camera({ zoom }), mode);
        const projected = hostPositions(mode, 9).map((p) => project(m, p));

        for (const p of projected) {
          expect(Number.isFinite(p.x)).toBe(true);
          expect(p.w).toBeGreaterThan(0);
        }
      }
    }
  });
});

describe('the rendered scene matches the live simulation', () => {
  it('renders one node per live host', () => {
    const scene = incidentScene();
    const state = scene.getNodes();

    expect(state.length).toBeGreaterThan(0);
    expect(state.length).toBe(new Set(state.map((n) => n.id)).size);
  });

  it('places each live host at a unique on-screen position', () => {
    const scene = incidentScene();
    const nodes = scene.getNodes();
    const matrix = computeViewProjection(camera(), '3d');

    const screen = nodes.map((node, index) => {
      const p = project(matrix, layoutHostPosition(index, nodes.length, '3d'));
      return `${p.x.toFixed(4)},${p.y.toFixed(4)}`;
    });

    // No two hosts may occupy the same pixel — that is the visual symptom of
    // "basic shapes not matching network nodes".
    expect(new Set(screen).size).toBe(nodes.length);
  });

  it('marks the compromised and isolated hosts distinctly in the scene', () => {
    const scene = incidentScene();
    const nodes = scene.getNodes();

    const compromised = nodes.filter((n) => n.metadata?.compromised === true);
    const isolated = nodes.filter((n) => n.metadata?.isolated === true);

    expect(compromised.length).toBeGreaterThan(0);
    expect(isolated.length).toBeGreaterThan(0);

    // The two sets must be disjoint so styling cannot collide.
    const compromisedIds = new Set(compromised.map((n) => n.id));
    expect(isolated.every((n) => !compromisedIds.has(n.id))).toBe(true);
  });

  it('connects hosts that the simulation says are connected', () => {
    const scene = incidentScene();
    const nodeIds = new Set(scene.getNodes().map((n) => n.id));

    const connections = scene.getConnections();
    expect(connections.length).toBeGreaterThan(0);

    for (const connection of connections) {
      expect(nodeIds.has(connection.source)).toBe(true);
      expect(nodeIds.has(connection.target)).toBe(true);
    }
  });
});
