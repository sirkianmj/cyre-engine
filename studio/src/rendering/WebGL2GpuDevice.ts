import type {
  GpuBuffer,
  GpuDevice,
  GpuProgram,
  GpuShader,
  GpuUniformLocation,
} from '@cyre/engine';

/**
 * WebGL2GpuDevice
 * ----------------
 * The concrete binding of the engine's `GpuDevice` to a live
 * WebGL2RenderingContext.
 *
 * Every method forwards to a real GL call — there is no command queue and no
 * deferred list. This is what makes the engine renderer perform genuine GPU
 * submission in the Studio rather than producing command objects.
 */
export class WebGL2GpuDevice implements GpuDevice {
  readonly name = 'WebGL2';

  private readonly gl: WebGL2RenderingContext;
  private readonly buffers = new Map<number, WebGLBuffer>();
  private readonly shaders = new Map<number, WebGLShader>();
  private readonly programs = new Map<number, WebGLProgram>();
  private readonly uniforms = new Map<number, WebGLUniformLocation | null>();
  private nextHandle = 1;

  constructor(gl: WebGL2RenderingContext) {
    if (!gl) throw new Error('WebGL2GpuDevice requires a WebGL2RenderingContext.');
    this.gl = gl;
  }

  getContext(): WebGL2RenderingContext {
    return this.gl;
  }

  /** True when the context has been lost and the renderer must be rebuilt. */
  isContextLost(): boolean {
    return this.gl.isContextLost();
  }

  private resolveBuffer(buffer: GpuBuffer | null): WebGLBuffer | null {
    if (!buffer) return null;
    const found = this.buffers.get(buffer.handle);
    if (!found) throw new Error(`Unknown GPU buffer handle ${buffer.handle}.`);
    return found;
  }

  private resolveShader(shader: GpuShader): WebGLShader {
    const found = this.shaders.get(shader.handle);
    if (!found) throw new Error(`Unknown GPU shader handle ${shader.handle}.`);
    return found;
  }

  private resolveProgram(program: GpuProgram): WebGLProgram {
    const found = this.programs.get(program.handle);
    if (!found) throw new Error(`Unknown GPU program handle ${program.handle}.`);
    return found;
  }

  private resolveUniform(location: GpuUniformLocation): WebGLUniformLocation | null {
    if (!this.uniforms.has(location.handle)) {
      throw new Error(`Unknown GPU uniform handle ${location.handle}.`);
    }
    return this.uniforms.get(location.handle) ?? null;
  }

  /* ---------------------------------------------------------- buffers */

  createBuffer(): GpuBuffer {
    const buffer = this.gl.createBuffer();
    if (!buffer) throw new Error('WebGL failed to create a buffer.');

    const handle = this.nextHandle++;
    this.buffers.set(handle, buffer);
    return { handle };
  }

  bindBuffer(target: number, buffer: GpuBuffer | null): void {
    this.gl.bindBuffer(target, this.resolveBuffer(buffer));
  }

  bufferData(
    target: number,
    data: Float32Array | Uint16Array | Uint32Array,
    usage: number,
  ): void {
    this.gl.bufferData(target, data, usage);
  }

  deleteBuffer(buffer: GpuBuffer): void {
    const found = this.buffers.get(buffer.handle);
    if (found) {
      this.gl.deleteBuffer(found);
      this.buffers.delete(buffer.handle);
    }
  }

  /* --------------------------------------------------------- programs */

  createShader(type: number): GpuShader {
    const shader = this.gl.createShader(type);
    if (!shader) throw new Error(`WebGL failed to create a shader of type ${type}.`);

    const handle = this.nextHandle++;
    this.shaders.set(handle, shader);
    return { handle };
  }

  shaderSource(shader: GpuShader, source: string): void {
    this.gl.shaderSource(this.resolveShader(shader), source);
  }

  compileShader(shader: GpuShader): void {
    this.gl.compileShader(this.resolveShader(shader));
  }

  getShaderCompileStatus(shader: GpuShader): boolean {
    return Boolean(
      this.gl.getShaderParameter(this.resolveShader(shader), this.gl.COMPILE_STATUS),
    );
  }

  getShaderInfoLog(shader: GpuShader): string {
    return this.gl.getShaderInfoLog(this.resolveShader(shader)) ?? '';
  }

  deleteShader(shader: GpuShader): void {
    const found = this.shaders.get(shader.handle);
    if (found) {
      this.gl.deleteShader(found);
      this.shaders.delete(shader.handle);
    }
  }

  createProgram(): GpuProgram {
    const program = this.gl.createProgram();
    if (!program) throw new Error('WebGL failed to create a program.');

    const handle = this.nextHandle++;
    this.programs.set(handle, program);
    return { handle };
  }

  attachShader(program: GpuProgram, shader: GpuShader): void {
    this.gl.attachShader(this.resolveProgram(program), this.resolveShader(shader));
  }

  linkProgram(program: GpuProgram): void {
    this.gl.linkProgram(this.resolveProgram(program));
  }

  getProgramLinkStatus(program: GpuProgram): boolean {
    return Boolean(
      this.gl.getProgramParameter(this.resolveProgram(program), this.gl.LINK_STATUS),
    );
  }

  getProgramInfoLog(program: GpuProgram): string {
    return this.gl.getProgramInfoLog(this.resolveProgram(program)) ?? '';
  }

  useProgram(program: GpuProgram | null): void {
    this.gl.useProgram(program ? this.resolveProgram(program) : null);
  }

  deleteProgram(program: GpuProgram): void {
    const found = this.programs.get(program.handle);
    if (found) {
      this.gl.deleteProgram(found);
      this.programs.delete(program.handle);
    }
  }

  getAttribLocation(program: GpuProgram, name: string): number {
    return this.gl.getAttribLocation(this.resolveProgram(program), name);
  }

  getUniformLocation(program: GpuProgram, name: string): GpuUniformLocation | null {
    const location = this.gl.getUniformLocation(this.resolveProgram(program), name);
    const handle = this.nextHandle++;
    this.uniforms.set(handle, location);
    return { handle };
  }

  /* ------------------------------------------------------ vertex setup */

  enableVertexAttribArray(index: number): void {
    if (index < 0) return;
    this.gl.enableVertexAttribArray(index);
  }

  disableVertexAttribArray(index: number): void {
    if (index < 0) return;
    this.gl.disableVertexAttribArray(index);
  }

  vertexAttribPointer(
    index: number,
    size: number,
    type: number,
    normalized: boolean,
    stride: number,
    offset: number,
  ): void {
    if (index < 0) return;
    this.gl.vertexAttribPointer(index, size, type, normalized, stride, offset);
  }

  /* --------------------------------------------------------- uniforms */

  uniformMatrix4fv(location: GpuUniformLocation, transpose: boolean, value: Float32Array): void {
    const resolved = this.resolveUniform(location);
    if (resolved) this.gl.uniformMatrix4fv(resolved, transpose, value);
  }

  uniformMatrix3fv(location: GpuUniformLocation, transpose: boolean, value: Float32Array): void {
    const resolved = this.resolveUniform(location);
    if (resolved) this.gl.uniformMatrix3fv(resolved, transpose, value);
  }

  uniform3f(location: GpuUniformLocation, x: number, y: number, z: number): void {
    const resolved = this.resolveUniform(location);
    if (resolved) this.gl.uniform3f(resolved, x, y, z);
  }

  uniform4fv(location: GpuUniformLocation, value: Float32Array): void {
    const resolved = this.resolveUniform(location);
    if (resolved) this.gl.uniform4fv(resolved, value);
  }

  uniform1f(location: GpuUniformLocation, value: number): void {
    const resolved = this.resolveUniform(location);
    if (resolved) this.gl.uniform1f(resolved, value);
  }

  uniform1i(location: GpuUniformLocation, value: number): void {
    const resolved = this.resolveUniform(location);
    if (resolved) this.gl.uniform1i(resolved, value);
  }

  /* ------------------------------------------------------ frame state */

  viewport(x: number, y: number, width: number, height: number): void {
    this.gl.viewport(x, y, width, height);
  }

  clearColor(r: number, g: number, b: number, a: number): void {
    this.gl.clearColor(r, g, b, a);
  }

  clear(mask: number): void {
    this.gl.clear(mask);
  }

  enable(capability: number): void {
    this.gl.enable(capability);
  }

  disable(capability: number): void {
    this.gl.disable(capability);
  }

  depthFunc(func: number): void {
    this.gl.depthFunc(func);
  }

  blendFunc(src: number, dst: number): void {
    this.gl.blendFunc(src, dst);
  }

  lineWidth(width: number): void {
    this.gl.lineWidth(width);
  }

  /* ----------------------------------------------------------- drawing */

  drawArrays(mode: number, first: number, count: number): void {
    this.gl.drawArrays(mode, first, count);
  }

  drawElements(mode: number, count: number, type: number, offset: number): void {
    this.gl.drawElements(mode, count, type, offset);
  }

  frontFace(mode: number): void {
    this.gl.frontFace(mode);
  }

  cullFace(mode: number): void {
    this.gl.cullFace(mode);
  }

  reset(): void {
    for (const buffer of this.buffers.values()) this.gl.deleteBuffer(buffer);
    for (const shader of this.shaders.values()) this.gl.deleteShader(shader);
    for (const program of this.programs.values()) this.gl.deleteProgram(program);

    this.buffers.clear();
    this.shaders.clear();
    this.programs.clear();
    this.uniforms.clear();
  }
}

/**
 * Acquires a WebGL2 context for a canvas, or null when the platform has no
 * GPU support. Callers must fall back rather than presenting a blank surface.
 */
export function acquireWebGL2Context(canvas: HTMLCanvasElement): WebGL2RenderingContext | null {
  try {
    return canvas.getContext('webgl2', {
      antialias: true,
      alpha: false,
      premultipliedAlpha: false,
      powerPreference: 'high-performance',
    });
  } catch {
    return null;
  }
}
