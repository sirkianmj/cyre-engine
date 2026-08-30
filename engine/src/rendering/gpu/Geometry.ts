/**
 * Geometry
 * ---------
 * CPU mesh generation for the engine GPU renderer.
 *
 * The renderer previously drew hosts as gl.POINTS. Point size is not portable:
 * ANGLE on Windows and several macOS drivers report an aliased point size range
 * of [1,1], so every host collapsed to a single pixel. Real triangle geometry
 * removes that dependency entirely and is what makes 3D actually three
 * dimensional rather than a screen-space sprite.
 *
 * Every builder returns positions, unit normals and triangle indices with
 * counter-clockwise winding, so back-face culling and lighting both work.
 */

export interface TriangleMesh {
  /** xyz triples. */
  positions: number[];
  /** Unit normal per vertex, parallel to positions. */
  normals: number[];
  /** Triangle indices. */
  indices: number[];
}

/** Appends `mesh` into a target batch, offsetting its indices. */
export interface MeshBatch {
  positions: number[];
  normals: number[];
  /** rgba per vertex, parallel to positions. */
  colors: number[];
  indices: number[];
}

export function createBatch(): MeshBatch {
  return { positions: [], normals: [], colors: [], indices: [] };
}

export function appendMesh(
  batch: MeshBatch,
  mesh: TriangleMesh,
  transform: (x: number, y: number, z: number) => [number, number, number],
  normalTransform?: (x: number, y: number, z: number) => [number, number, number],
  color: readonly [number, number, number, number] = [1, 1, 1, 1],
): void {
  const base = batch.positions.length / 3;
  const rotateNormal = normalTransform ?? transform;

  for (let i = 0; i < mesh.positions.length; i += 3) {
    const p = transform(mesh.positions[i], mesh.positions[i + 1], mesh.positions[i + 2]);
    batch.positions.push(p[0], p[1], p[2]);

    const n = rotateNormal(mesh.normals[i], mesh.normals[i + 1], mesh.normals[i + 2]);
    const length = Math.hypot(n[0], n[1], n[2]) || 1;
    batch.normals.push(n[0] / length, n[1] / length, n[2] / length);

    batch.colors.push(color[0], color[1], color[2], color[3]);
  }

  for (const index of mesh.indices) {
    batch.indices.push(base + index);
  }
}

/** A UV sphere of the given radius, centred on the origin. */
export function buildSphere(radius: number, segments = 20, rings = 14): TriangleMesh {
  if (!(radius > 0)) throw new Error('Sphere radius must be positive.');
  if (segments < 3) throw new Error('Sphere needs at least 3 segments.');
  if (rings < 2) throw new Error('Sphere needs at least 2 rings.');

  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  for (let ring = 0; ring <= rings; ring += 1) {
    const phi = (ring / rings) * Math.PI;
    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);

    for (let segment = 0; segment <= segments; segment += 1) {
      const theta = (segment / segments) * Math.PI * 2;
      const x = sinPhi * Math.cos(theta);
      const y = cosPhi;
      const z = sinPhi * Math.sin(theta);

      positions.push(x * radius, y * radius, z * radius);
      normals.push(x, y, z);
    }
  }

  const stride = segments + 1;
  for (let ring = 0; ring < rings; ring += 1) {
    for (let segment = 0; segment < segments; segment += 1) {
      const a = ring * stride + segment;
      const b = a + stride;

      // Two counter-clockwise triangles per quad.
      indices.push(a, b, a + 1);
      indices.push(a + 1, b, b + 1);
    }
  }

  return { positions, normals, indices };
}

/** An axis-aligned box centred on the origin. */
export function buildBox(size: number): TriangleMesh {
  if (!(size > 0)) throw new Error('Box size must be positive.');
  const h = size / 2;

  // Six faces, each with its own outward normal and CCW winding.
  const faces: Array<{ n: [number, number, number]; v: Array<[number, number, number]> }> = [
    { n: [0, 0, 1], v: [[-h, -h, h], [h, -h, h], [h, h, h], [-h, h, h]] },
    { n: [0, 0, -1], v: [[h, -h, -h], [-h, -h, -h], [-h, h, -h], [h, h, -h]] },
    { n: [1, 0, 0], v: [[h, -h, h], [h, -h, -h], [h, h, -h], [h, h, h]] },
    { n: [-1, 0, 0], v: [[-h, -h, -h], [-h, -h, h], [-h, h, h], [-h, h, -h]] },
    { n: [0, 1, 0], v: [[-h, h, h], [h, h, h], [h, h, -h], [-h, h, -h]] },
    { n: [0, -1, 0], v: [[-h, -h, -h], [h, -h, -h], [h, -h, h], [-h, -h, h]] },
  ];

  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  faces.forEach((face, faceIndex) => {
    const base = faceIndex * 4;
    for (const vertex of face.v) {
      positions.push(vertex[0], vertex[1], vertex[2]);
      normals.push(face.n[0], face.n[1], face.n[2]);
    }
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  });

  return { positions, normals, indices };
}

/** A cylinder along +Y, centred on the origin, with capped ends. */
export function buildCylinder(radius: number, height: number, segments = 18): TriangleMesh {
  if (!(radius > 0)) throw new Error('Cylinder radius must be positive.');
  if (!(height > 0)) throw new Error('Cylinder height must be positive.');
  if (segments < 3) throw new Error('Cylinder needs at least 3 segments.');

  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  const half = height / 2;

  // Side wall.
  for (let segment = 0; segment <= segments; segment += 1) {
    const theta = (segment / segments) * Math.PI * 2;
    const x = Math.cos(theta);
    const z = Math.sin(theta);

    positions.push(x * radius, -half, z * radius);
    normals.push(x, 0, z);
    positions.push(x * radius, half, z * radius);
    normals.push(x, 0, z);
  }

  for (let segment = 0; segment < segments; segment += 1) {
    const a = segment * 2;
    indices.push(a, a + 1, a + 2);
    indices.push(a + 1, a + 3, a + 2);
  }

  // Caps.
  for (const sign of [1, -1] as const) {
    const centerIndex = positions.length / 3;
    positions.push(0, sign * half, 0);
    normals.push(0, sign, 0);

    const ringStart = positions.length / 3;
    for (let segment = 0; segment <= segments; segment += 1) {
      const theta = (segment / segments) * Math.PI * 2;
      positions.push(Math.cos(theta) * radius, sign * half, Math.sin(theta) * radius);
      normals.push(0, sign, 0);
    }

    for (let segment = 0; segment < segments; segment += 1) {
      if (sign === 1) {
        indices.push(centerIndex, ringStart + segment, ringStart + segment + 1);
      } else {
        indices.push(centerIndex, ringStart + segment + 1, ringStart + segment);
      }
    }
  }

  return { positions, normals, indices };
}

/** A flat disc in the XY plane facing +Z, for the 2D and 2.5D projections. */
export function buildDisc(radius: number, segments = 32): TriangleMesh {
  if (!(radius > 0)) throw new Error('Disc radius must be positive.');
  if (segments < 3) throw new Error('Disc needs at least 3 segments.');

  const positions: number[] = [0, 0, 0];
  const normals: number[] = [0, 0, 1];
  const indices: number[] = [];

  for (let segment = 0; segment <= segments; segment += 1) {
    const theta = (segment / segments) * Math.PI * 2;
    positions.push(Math.cos(theta) * radius, Math.sin(theta) * radius, 0);
    normals.push(0, 0, 1);
  }

  for (let segment = 1; segment <= segments; segment += 1) {
    indices.push(0, segment, segment + 1);
  }

  return { positions, normals, indices };
}

/**
 * A flat annulus (ring) in the XY plane.
 *
 * Selection, hover and isolation indicators are drawn as rings rather than
 * line loops: `gl.lineWidth` is clamped to 1px on most drivers, so a ring
 * made of triangles is the only reliable way to get a visible, weighted halo
 * around a host. The ring faces +Z and is oriented by the caller.
 */
export function buildRing(
  innerRadius: number,
  outerRadius: number,
  segments = 48,
): TriangleMesh {
  if (!(innerRadius > 0)) throw new Error('Ring inner radius must be positive.');
  if (!(outerRadius > innerRadius)) {
    throw new Error('Ring outer radius must be greater than the inner radius.');
  }
  if (segments < 3) throw new Error('Ring needs at least 3 segments.');

  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  // Two concentric loops; the strip between them is the visible band.
  for (let segment = 0; segment <= segments; segment += 1) {
    const theta = (segment / segments) * Math.PI * 2;
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);

    positions.push(cos * innerRadius, sin * innerRadius, 0);
    normals.push(0, 0, 1);
    positions.push(cos * outerRadius, sin * outerRadius, 0);
    normals.push(0, 0, 1);
  }

  for (let segment = 0; segment < segments; segment += 1) {
    const inner = segment * 2;
    const outer = inner + 1;
    const nextInner = inner + 2;
    const nextOuter = inner + 3;

    // Walking the band CCW when viewed from +Z: inner → outer → outer+1, then
    // inner → outer+1 → inner+1. Reversing either triangle makes the halo face
    // away from the viewer, which matters because the ring is billboarded.
    indices.push(inner, outer, nextOuter);
    indices.push(inner, nextOuter, nextInner);
  }

  return { positions, normals, indices };
}

/**
 * A rectangular quad in the XY plane, used to draw links with a real width.
 * GL line width is capped at 1px by most drivers, so links are quads instead.
 */
export function buildQuad(width: number, height: number): TriangleMesh {
  if (!(width > 0)) throw new Error('Quad width must be positive.');
  if (!(height > 0)) throw new Error('Quad height must be positive.');

  const hw = width / 2;
  const hh = height / 2;

  return {
    positions: [-hw, -hh, 0, hw, -hh, 0, hw, hh, 0, -hw, hh, 0],
    normals: [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1],
    indices: [0, 1, 2, 0, 2, 3],
  };
}

/**
 * A tube between two points, for drawing links as real 3D geometry.
 * The cylinder is built along +Y then rotated onto the a→b axis.
 */
export function buildTube(
  from: readonly [number, number, number],
  to: readonly [number, number, number],
  radius: number,
  segments = 10,
): TriangleMesh {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const dz = to[2] - from[2];
  const length = Math.hypot(dx, dy, dz);

  if (!(length > 1e-6)) {
    return { positions: [], normals: [], indices: [] };
  }
  if (!(radius > 0)) throw new Error('Tube radius must be positive.');

  const cylinder = buildCylinder(radius, length, segments);

  // Rotation taking +Y onto the normalised a→b direction.
  const axis = normalize3(dx, dy, dz);
  const rotate = rotationFromUp(axis);

  const mid: [number, number, number] = [
    from[0] + dx / 2,
    from[1] + dy / 2,
    from[2] + dz / 2,
  ];

  const batch = createBatch();
  appendMesh(
    batch,
    cylinder,
    (x, y, z) => {
      const r = rotate(x, y, z);
      return [r[0] + mid[0], r[1] + mid[1], r[2] + mid[2]];
    },
  );

  return {
    positions: batch.positions,
    normals: batch.normals,
    indices: batch.indices,
  };
}

export function normalize3(
  x: number,
  y: number,
  z: number,
): [number, number, number] {
  const length = Math.hypot(x, y, z);
  if (length < 1e-9) return [0, 1, 0];
  return [x / length, y / length, z / length];
}

export function cross3(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
): [number, number, number] {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

/**
 * Returns a function rotating +Y onto `axis`, as a Rodrigues rotation.
 * Handles the parallel and anti-parallel cases explicitly, where the cross
 * product degenerates.
 */
export function rotationFromUp(
  axis: readonly [number, number, number],
): (x: number, y: number, z: number) => [number, number, number] {
  const up: [number, number, number] = [0, 1, 0];
  const dot = up[1] * axis[1];

  if (dot > 0.999999) {
    return (x, y, z) => [x, y, z];
  }
  if (dot < -0.999999) {
    // 180 degrees: flip Y and Z.
    return (x, y, z) => [x, -y, -z];
  }

  const rotationAxis = normalize3(...cross3(up, axis));
  const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const t = 1 - c;
  const [rx, ry, rz] = rotationAxis;

  // Standard Rodrigues rotation matrix, row-major application.
  const m00 = t * rx * rx + c;
  const m01 = t * rx * ry - s * rz;
  const m02 = t * rx * rz + s * ry;
  const m10 = t * rx * ry + s * rz;
  const m11 = t * ry * ry + c;
  const m12 = t * ry * rz - s * rx;
  const m20 = t * rx * rz - s * ry;
  const m21 = t * ry * rz + s * rx;
  const m22 = t * rz * rz + c;

  return (x, y, z) => [
    m00 * x + m01 * y + m02 * z,
    m10 * x + m11 * y + m12 * z,
    m20 * x + m21 * y + m22 * z,
  ];
}
