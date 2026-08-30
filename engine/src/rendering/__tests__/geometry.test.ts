import { describe, expect, it } from 'vitest';

import {
  appendMesh,
  buildBox,
  buildCylinder,
  buildDisc,
  buildQuad,
  buildSphere,
  buildTube,
  createBatch,
  cross3,
  normalize3,
  rotationFromUp,
} from '../gpu/Geometry.js';

function vertexCount(mesh: { positions: number[] }): number {
  return mesh.positions.length / 3;
}

function isIndexValid(mesh: { positions: number[]; indices: number[] }): boolean {
  const count = mesh.positions.length / 3;
  return mesh.indices.every((index) => index >= 0 && index < count);
}

function hasUnitNormals(mesh: { normals: number[] }): boolean {
  for (let i = 0; i < mesh.normals.length; i += 3) {
    const length = Math.hypot(mesh.normals[i], mesh.normals[i + 1], mesh.normals[i + 2]);
    if (Math.abs(length - 1) > 1e-5) return false;
  }
  return true;
}

/** Signed area of a projected triangle; positive means counter-clockwise. */
function windingSign(
  positions: number[],
  indices: number[],
  triangle: number,
): number {
  const a = indices[triangle * 3] * 3;
  const b = indices[triangle * 3 + 1] * 3;
  const c = indices[triangle * 3 + 2] * 3;

  return (
    (positions[b] - positions[a]) * (positions[c + 1] - positions[a + 1]) -
    (positions[c] - positions[a]) * (positions[b + 1] - positions[a + 1])
  );
}

describe('mesh generators', () => {
  it('builds a sphere with valid indices and unit normals', () => {
    const sphere = buildSphere(1.5, 20, 14);

    expect(vertexCount(sphere)).toBeGreaterThan(100);
    expect(sphere.indices.length % 3).toBe(0);
    expect(isIndexValid(sphere)).toBe(true);
    expect(hasUnitNormals(sphere)).toBe(true);
  });

  it('places sphere vertices on the requested radius', () => {
    const radius = 2.5;
    const sphere = buildSphere(radius, 16, 12);

    for (let i = 0; i < sphere.positions.length; i += 3) {
      const distance = Math.hypot(
        sphere.positions[i],
        sphere.positions[i + 1],
        sphere.positions[i + 2],
      );
      expect(distance).toBeCloseTo(radius, 5);
    }
  });

  it('builds a box with 24 vertices and 12 triangles', () => {
    const box = buildBox(2);

    expect(vertexCount(box)).toBe(24);
    expect(box.indices.length).toBe(36);
    expect(isIndexValid(box)).toBe(true);
    expect(hasUnitNormals(box)).toBe(true);
  });

  it('builds a capped cylinder', () => {
    const cylinder = buildCylinder(1, 3, 18);

    expect(vertexCount(cylinder)).toBeGreaterThan(36);
    expect(isIndexValid(cylinder)).toBe(true);
    expect(hasUnitNormals(cylinder)).toBe(true);

    // Height spans -1.5 to +1.5.
    const ys = cylinder.positions.filter((_, i) => i % 3 === 1);
    expect(Math.min(...ys)).toBeCloseTo(-1.5, 5);
    expect(Math.max(...ys)).toBeCloseTo(1.5, 5);
  });

  it('builds a disc facing +Z in the XY plane', () => {
    const disc = buildDisc(1, 32);

    expect(isIndexValid(disc)).toBe(true);
    // Every vertex lies at z = 0.
    for (let i = 2; i < disc.positions.length; i += 3) {
      expect(disc.positions[i]).toBe(0);
    }
    // Front-facing when viewed from +Z.
    expect(windingSign(disc.positions, disc.indices, 0)).toBeGreaterThan(0);
  });

  it('builds a quad of the requested size', () => {
    const quad = buildQuad(4, 2);

    expect(vertexCount(quad)).toBe(4);
    expect(quad.indices.length).toBe(6);
    expect(Math.max(...quad.positions.filter((_, i) => i % 3 === 0))).toBe(2);
    expect(Math.max(...quad.positions.filter((_, i) => i % 3 === 1))).toBe(1);
  });

  it('winds box faces outward', () => {
    const box = buildBox(2);

    // Each face's normal must point away from the origin.
    for (let i = 0; i < box.normals.length; i += 3) {
      const px = box.positions[i];
      const py = box.positions[i + 1];
      const pz = box.positions[i + 2];
      const nx = box.normals[i];
      const ny = box.normals[i + 1];
      const nz = box.normals[i + 2];

      expect(px * nx + py * ny + pz * nz).toBeGreaterThan(0);
    }
  });

  it('rejects degenerate parameters', () => {
    expect(() => buildSphere(0)).toThrow(/radius must be positive/);
    expect(() => buildSphere(1, 2)).toThrow(/at least 3 segments/);
    expect(() => buildBox(-1)).toThrow(/size must be positive/);
    expect(() => buildCylinder(1, 0)).toThrow(/height must be positive/);
    expect(() => buildDisc(1, 2)).toThrow(/at least 3 segments/);
    expect(() => buildQuad(0, 1)).toThrow(/width must be positive/);
  });
});

describe('vector helpers', () => {
  it('normalizes vectors and handles the zero vector', () => {
    expect(normalize3(3, 0, 0)).toEqual([1, 0, 0]);
    expect(normalize3(0, 0, 0)).toEqual([0, 1, 0]);
  });

  it('computes a right-handed cross product', () => {
    expect(cross3([1, 0, 0], [0, 1, 0])).toEqual([0, 0, 1]);
  });

  it('rotationFromUp is identity when already aligned', () => {
    const rotate = rotationFromUp([0, 1, 0]);
    const result = rotate(1, 2, 3);

    expect(result[0]).toBeCloseTo(1, 6);
    expect(result[1]).toBeCloseTo(2, 6);
    expect(result[2]).toBeCloseTo(3, 6);
  });

  it('rotationFromUp maps +Y onto the target axis', () => {
    const targets: Array<[number, number, number]> = [
      [1, 0, 0],
      [0, 0, 1],
      [0, -1, 0],
      normalize3(1, 1, 1),
      normalize3(-0.3, 0.9, 0.2),
    ];

    for (const target of targets) {
      const rotate = rotationFromUp(target);
      const mapped = rotate(0, 1, 0);

      expect(mapped[0]).toBeCloseTo(target[0], 5);
      expect(mapped[1]).toBeCloseTo(target[1], 5);
      expect(mapped[2]).toBeCloseTo(target[2], 5);
    }
  });

  it('rotationFromUp preserves length', () => {
    const rotate = rotationFromUp(normalize3(1, 2, -3));
    const result = rotate(0.7, -0.4, 0.9);

    expect(Math.hypot(...result)).toBeCloseTo(Math.hypot(0.7, -0.4, 0.9), 5);
  });
});

describe('buildTube', () => {
  it('spans exactly between its endpoints', () => {
    const from: [number, number, number] = [0, 0, 0];
    const to: [number, number, number] = [4, 6, 2];
    const tube = buildTube(from, to, 0.2, 10);

    expect(isIndexValid(tube)).toBe(true);
    expect(hasUnitNormals(tube)).toBe(true);

    const xs = tube.positions.filter((_, i) => i % 3 === 0);
    const ys = tube.positions.filter((_, i) => i % 3 === 1);

    // Extents cover the endpoints, within the tube radius.
    expect(Math.min(...xs)).toBeLessThanOrEqual(0.2);
    expect(Math.max(...xs)).toBeGreaterThanOrEqual(3.8);
    expect(Math.max(...ys)).toBeGreaterThanOrEqual(5.8);
  });

  it('produces no geometry for coincident endpoints', () => {
    const tube = buildTube([1, 1, 1], [1, 1, 1], 0.2);

    expect(tube.positions).toHaveLength(0);
    expect(tube.indices).toHaveLength(0);
  });

  it('handles an axis-aligned vertical tube', () => {
    const tube = buildTube([0, 0, 0], [0, 5, 0], 0.3, 8);

    expect(isIndexValid(tube)).toBe(true);
    expect(tube.positions.length).toBeGreaterThan(0);
  });

  it('handles a downward tube (anti-parallel case)', () => {
    const tube = buildTube([0, 5, 0], [0, 0, 0], 0.3, 8);

    expect(isIndexValid(tube)).toBe(true);
    expect(hasUnitNormals(tube)).toBe(true);
  });
});

describe('appendMesh batching', () => {
  it('offsets indices so batches stay valid', () => {
    const batch = createBatch();
    const box = buildBox(1);

    appendMesh(batch, box, (x, y, z) => [x, y, z]);
    const firstCount = batch.positions.length / 3;

    appendMesh(batch, box, (x, y, z) => [x + 10, y, z]);

    expect(batch.positions.length / 3).toBe(firstCount * 2);
    expect(batch.indices.every((index) => index < batch.positions.length / 3)).toBe(true);
    // Second mesh's indices all reference the second half.
    expect(Math.max(...batch.indices.slice(box.indices.length))).toBeGreaterThanOrEqual(firstCount);
  });

  it('translates vertices through the transform', () => {
    const batch = createBatch();
    appendMesh(batch, buildBox(2), (x, y, z) => [x + 5, y + 7, z + 9]);

    const xs = batch.positions.filter((_, i) => i % 3 === 0);
    expect(Math.min(...xs)).toBeCloseTo(4, 5);
    expect(Math.max(...xs)).toBeCloseTo(6, 5);
  });

  it('re-normalizes normals after a non-uniform transform', () => {
    const batch = createBatch();
    appendMesh(batch, buildBox(2), (x, y, z) => [x, y, z], (x, y, z) => [x * 3, y, z]);

    for (let i = 0; i < batch.normals.length; i += 3) {
      const length = Math.hypot(batch.normals[i], batch.normals[i + 1], batch.normals[i + 2]);
      expect(length).toBeCloseTo(1, 5);
    }
  });
});
