/**
 * Mat4
 * -----
 * Minimal column-major 4x4 matrix math for the engine GPU renderer.
 * Column-major matches WebGL's `uniformMatrix4fv` layout, so matrices are
 * uploaded without transposition.
 */

export type Mat4 = Float32Array;

export function createMat4(): Mat4 {
  const out = new Float32Array(16);
  out[0] = 1;
  out[5] = 1;
  out[10] = 1;
  out[15] = 1;
  return out;
}

export function identity(out: Mat4): Mat4 {
  out.fill(0);
  out[0] = 1;
  out[5] = 1;
  out[10] = 1;
  out[15] = 1;
  return out;
}

export function perspective(
  out: Mat4,
  fovYRadians: number,
  aspect: number,
  near: number,
  far: number,
): Mat4 {
  if (!(aspect > 0)) throw new Error('perspective aspect must be positive.');
  if (!(far > near)) throw new Error('perspective far must exceed near.');
  if (!(near > 0)) throw new Error('perspective near must be positive.');

  const f = 1 / Math.tan(fovYRadians / 2);
  out.fill(0);
  out[0] = f / aspect;
  out[5] = f;
  out[10] = (far + near) / (near - far);
  out[11] = -1;
  out[14] = (2 * far * near) / (near - far);
  return out;
}

export function orthographic(
  out: Mat4,
  left: number,
  right: number,
  bottom: number,
  top: number,
  near: number,
  far: number,
): Mat4 {
  if (!(right > left)) throw new Error('orthographic right must exceed left.');
  if (!(top > bottom)) throw new Error('orthographic top must exceed bottom.');
  if (!(far > near)) throw new Error('orthographic far must exceed near.');

  const lr = 1 / (left - right);
  const bt = 1 / (bottom - top);
  const nf = 1 / (near - far);

  out.fill(0);
  out[0] = -2 * lr;
  out[5] = -2 * bt;
  out[10] = 2 * nf;
  out[12] = (left + right) * lr;
  out[13] = (top + bottom) * bt;
  out[14] = (far + near) * nf;
  out[15] = 1;
  return out;
}

/** Builds a right-handed view matrix looking from `eye` toward `center`. */
export function lookAt(
  out: Mat4,
  eye: readonly [number, number, number],
  center: readonly [number, number, number],
  up: readonly [number, number, number],
): Mat4 {
  let zx = eye[0] - center[0];
  let zy = eye[1] - center[1];
  let zz = eye[2] - center[2];

  let length = Math.hypot(zx, zy, zz);
  if (length === 0) {
    zx = 0;
    zy = 0;
    zz = 1;
    length = 1;
  }
  zx /= length;
  zy /= length;
  zz /= length;

  let xx = up[1] * zz - up[2] * zy;
  let xy = up[2] * zx - up[0] * zz;
  let xz = up[0] * zy - up[1] * zx;

  length = Math.hypot(xx, xy, xz);
  if (length === 0) {
    xx = 1;
    xy = 0;
    xz = 0;
  } else {
    xx /= length;
    xy /= length;
    xz /= length;
  }

  const yx = zy * xz - zz * xy;
  const yy = zz * xx - zx * xz;
  const yz = zx * xy - zy * xx;

  out[0] = xx;
  out[1] = yx;
  out[2] = zx;
  out[3] = 0;
  out[4] = xy;
  out[5] = yy;
  out[6] = zy;
  out[7] = 0;
  out[8] = xz;
  out[9] = yz;
  out[10] = zz;
  out[11] = 0;
  out[12] = -(xx * eye[0] + xy * eye[1] + xz * eye[2]);
  out[13] = -(yx * eye[0] + yy * eye[1] + yz * eye[2]);
  out[14] = -(zx * eye[0] + zy * eye[1] + zz * eye[2]);
  out[15] = 1;
  return out;
}

/** out = a * b, column-major. */
export function multiply(out: Mat4, a: Mat4, b: Mat4): Mat4 {
  const result = new Float32Array(16);

  for (let column = 0; column < 4; column += 1) {
    for (let row = 0; row < 4; row += 1) {
      let sum = 0;
      for (let k = 0; k < 4; k += 1) {
        sum += a[k * 4 + row] * b[column * 4 + k];
      }
      result[column * 4 + row] = sum;
    }
  }

  out.set(result);
  return out;
}

export function translation(
  out: Mat4,
  x: number,
  y: number,
  z: number,
): Mat4 {
  identity(out);
  out[12] = x;
  out[13] = y;
  out[14] = z;
  return out;
}
