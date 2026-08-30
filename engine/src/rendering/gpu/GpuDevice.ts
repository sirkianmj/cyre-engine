/**
 * GpuDevice
 * ----------
 * The minimal GPU surface the CYRE engine renderer drives.
 *
 * The engine is platform independent and runs under Node for tests, so it
 * cannot import WebGL directly. Instead the renderer issues real GPU calls
 * through this interface, and each host supplies a concrete binding — the
 * Studio binds it to a live WebGL2RenderingContext, tests bind it to a
 * recording device that captures the exact call sequence.
 *
 * This is what makes engine rendering real GPU submission rather than a list
 * of command objects: every method here corresponds to an actual GL call.
 */

/** Opaque handle to a GPU buffer. */
export interface GpuBuffer {
  readonly handle: number;
}

/** Opaque handle to a compiled shader. */
export interface GpuShader {
  readonly handle: number;
}

/** Opaque handle to a linked program. */
export interface GpuProgram {
  readonly handle: number;
}

/** Opaque handle to a uniform location. */
export interface GpuUniformLocation {
  readonly handle: number;
}

/** GL constants used by the renderer, mirrored from the WebGL spec. */
export const GpuConstant = {
  ARRAY_BUFFER: 0x8892,
  ELEMENT_ARRAY_BUFFER: 0x8893,
  STATIC_DRAW: 0x88e4,
  DYNAMIC_DRAW: 0x88e8,
  VERTEX_SHADER: 0x8b31,
  FRAGMENT_SHADER: 0x8b30,
  COMPILE_STATUS: 0x8b81,
  LINK_STATUS: 0x8b82,
  FLOAT: 0x1406,
  UNSIGNED_SHORT: 0x1403,
  UNSIGNED_INT: 0x1405,
  TRIANGLES: 0x0004,
  LINES: 0x0001,
  POINTS: 0x0000,
  DEPTH_TEST: 0x0b71,
  BLEND: 0x0be2,
  CULL_FACE: 0x0b44,
  LESS: 0x0201,
  LEQUAL: 0x0203,
  SRC_ALPHA: 0x0302,
  ONE_MINUS_SRC_ALPHA: 0x0303,
  COLOR_BUFFER_BIT: 0x4000,
  DEPTH_BUFFER_BIT: 0x0100,
  BACK: 0x0405,
  FRONT: 0x0404,
  CCW: 0x0901,
  CW: 0x0900,
} as const;

export interface GpuDevice {
  /** Human-readable name, e.g. "WebGL2". */
  readonly name: string;

  /* ---------------------------------------------------------- buffers */
  createBuffer(): GpuBuffer;
  bindBuffer(target: number, buffer: GpuBuffer | null): void;
  bufferData(
    target: number,
    data: Float32Array | Uint16Array | Uint32Array,
    usage: number,
  ): void;
  deleteBuffer(buffer: GpuBuffer): void;

  /* --------------------------------------------------------- programs */
  createShader(type: number): GpuShader;
  shaderSource(shader: GpuShader, source: string): void;
  compileShader(shader: GpuShader): void;
  getShaderCompileStatus(shader: GpuShader): boolean;
  getShaderInfoLog(shader: GpuShader): string;
  deleteShader(shader: GpuShader): void;

  createProgram(): GpuProgram;
  attachShader(program: GpuProgram, shader: GpuShader): void;
  linkProgram(program: GpuProgram): void;
  getProgramLinkStatus(program: GpuProgram): boolean;
  getProgramInfoLog(program: GpuProgram): string;
  useProgram(program: GpuProgram | null): void;
  deleteProgram(program: GpuProgram): void;

  getAttribLocation(program: GpuProgram, name: string): number;
  getUniformLocation(program: GpuProgram, name: string): GpuUniformLocation | null;

  /* ------------------------------------------------------ vertex setup */
  enableVertexAttribArray(index: number): void;
  disableVertexAttribArray(index: number): void;
  vertexAttribPointer(
    index: number,
    size: number,
    type: number,
    normalized: boolean,
    stride: number,
    offset: number,
  ): void;

  /* --------------------------------------------------------- uniforms */
  uniformMatrix4fv(location: GpuUniformLocation, transpose: boolean, value: Float32Array): void;
  /**
   * Sets a mat3 uniform. Using uniformMatrix4fv on a mat3 location is an
   * INVALID_OPERATION in WebGL, which would leave the uniform at zero.
   */
  uniformMatrix3fv(location: GpuUniformLocation, transpose: boolean, value: Float32Array): void;
  uniform3f(location: GpuUniformLocation, x: number, y: number, z: number): void;
  uniform4fv(location: GpuUniformLocation, value: Float32Array): void;
  uniform1f(location: GpuUniformLocation, value: number): void;
  uniform1i(location: GpuUniformLocation, value: number): void;

  /* ------------------------------------------------------ frame state */
  viewport(x: number, y: number, width: number, height: number): void;
  clearColor(r: number, g: number, b: number, a: number): void;
  clear(mask: number): void;
  enable(capability: number): void;
  disable(capability: number): void;
  depthFunc(func: number): void;
  blendFunc(src: number, dst: number): void;
  lineWidth(width: number): void;

  /* ----------------------------------------------------------- drawing */
  drawArrays(mode: number, first: number, count: number): void;
  drawElements(mode: number, count: number, type: number, offset: number): void;

  /** Sets the front-face winding; the renderer emits counter-clockwise. */
  frontFace(mode: number): void;
  cullFace(mode: number): void;

  /** Releases all GPU resources held by the host binding. */
  reset(): void;
}
