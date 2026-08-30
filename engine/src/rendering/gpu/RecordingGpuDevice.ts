import { GpuConstant } from './GpuDevice.js';
import type {
  GpuBuffer,
  GpuDevice,
  GpuProgram,
  GpuShader,
  GpuUniformLocation,
} from './GpuDevice.js';

/** One recorded GPU call, in submission order. */
export interface RecordedGpuCall {
  call: string;
  args: unknown[];
}

/**
 * RecordingGpuDevice
 * -------------------
 * A GpuDevice that captures the exact GPU call sequence instead of talking to
 * a GPU. This is a test instrument, not a renderer: it exists so the engine's
 * real submission path can be asserted deterministically under Node, where no
 * WebGL context exists. The Studio binds the same interface to a live
 * WebGL2RenderingContext.
 *
 * Shader compilation and program linking are reported as successful unless the
 * test opts into failure, which is how compile/link error handling is covered.
 */
export class RecordingGpuDevice implements GpuDevice {
  readonly name = 'recording';

  readonly calls: RecordedGpuCall[] = [];

  /**
   * The most recent float payload uploaded to ARRAY_BUFFER.
   *
   * Recording only the element count is enough to verify how many triangles
   * were submitted but not *what* was submitted. Emphasis and animation are
   * colour changes inside an unchanged index buffer, so tests that assert they
   * took effect need the actual interleaved vertex stream.
   */
  lastVertexData: Float32Array | null = null;

  private nextHandle = 1;
  private compileSucceeds = true;
  private linkSucceeds = true;
  private infoLog = '';
  private readonly shaderSources = new Map<number, string>();
  private liveBuffers = new Set<number>();
  private livePrograms = new Set<number>();

  /** Makes subsequent shader compilations fail with the given log. */
  failCompilation(infoLog = 'compilation error'): void {
    this.compileSucceeds = false;
    this.infoLog = infoLog;
  }

  /** Makes subsequent program links fail with the given log. */
  failLinking(infoLog = 'link error'): void {
    this.linkSucceeds = false;
    this.infoLog = infoLog;
  }

  /** Restores successful compilation and linking. */
  succeed(): void {
    this.compileSucceeds = true;
    this.linkSucceeds = true;
    this.infoLog = '';
  }

  getSource(shader: GpuShader): string | undefined {
    return this.shaderSources.get(shader.handle);
  }

  getLiveBufferCount(): number {
    return this.liveBuffers.size;
  }

  getLiveProgramCount(): number {
    return this.livePrograms.size;
  }

  /** Every recorded call name, in order. */
  getCallNames(): string[] {
    return this.calls.map((entry) => entry.call);
  }

  /** Recorded calls matching a name. */
  getCalls(call: string): RecordedGpuCall[] {
    return this.calls.filter((entry) => entry.call === call);
  }

  countCalls(call: string): number {
    return this.getCalls(call).length;
  }

  clearCalls(): void {
    this.calls.length = 0;
  }

  private record(call: string, args: unknown[]): void {
    this.calls.push({ call, args });
  }

  /* ---------------------------------------------------------- buffers */

  createBuffer(): GpuBuffer {
    const handle = this.nextHandle++;
    this.liveBuffers.add(handle);
    this.record('createBuffer', [handle]);
    return { handle };
  }

  bindBuffer(target: number, buffer: GpuBuffer | null): void {
    this.record('bindBuffer', [target, buffer?.handle ?? null]);
  }

  bufferData(
    target: number,
    data: Float32Array | Uint16Array | Uint32Array,
    usage: number,
  ): void {
    if (target === GpuConstant.ARRAY_BUFFER && data instanceof Float32Array) {
      this.lastVertexData = data;
    }
    this.record('bufferData', [target, data.length, usage]);
  }

  deleteBuffer(buffer: GpuBuffer): void {
    this.liveBuffers.delete(buffer.handle);
    this.record('deleteBuffer', [buffer.handle]);
  }

  /* --------------------------------------------------------- programs */

  createShader(type: number): GpuShader {
    const handle = this.nextHandle++;
    this.record('createShader', [type, handle]);
    return { handle };
  }

  shaderSource(shader: GpuShader, source: string): void {
    this.shaderSources.set(shader.handle, source);
    this.record('shaderSource', [shader.handle, source.length]);
  }

  compileShader(shader: GpuShader): void {
    this.record('compileShader', [shader.handle]);
  }

  getShaderCompileStatus(): boolean {
    return this.compileSucceeds;
  }

  getShaderInfoLog(): string {
    return this.infoLog;
  }

  deleteShader(shader: GpuShader): void {
    this.shaderSources.delete(shader.handle);
    this.record('deleteShader', [shader.handle]);
  }

  createProgram(): GpuProgram {
    const handle = this.nextHandle++;
    this.livePrograms.add(handle);
    this.record('createProgram', [handle]);
    return { handle };
  }

  attachShader(program: GpuProgram, shader: GpuShader): void {
    this.record('attachShader', [program.handle, shader.handle]);
  }

  linkProgram(program: GpuProgram): void {
    this.record('linkProgram', [program.handle]);
  }

  getProgramLinkStatus(): boolean {
    return this.linkSucceeds;
  }

  getProgramInfoLog(): string {
    return this.infoLog;
  }

  useProgram(program: GpuProgram | null): void {
    this.record('useProgram', [program?.handle ?? null]);
  }

  deleteProgram(program: GpuProgram): void {
    this.livePrograms.delete(program.handle);
    this.record('deleteProgram', [program.handle]);
  }

  getAttribLocation(program: GpuProgram, name: string): number {
    this.record('getAttribLocation', [program.handle, name]);
    // Stable, distinct locations per attribute name.
    if (name === 'aPosition') return 0;
    if (name === 'aNormal') return 1;
    if (name === 'aColor') return 2;
    return -1;
  }

  getUniformLocation(program: GpuProgram, name: string): GpuUniformLocation | null {
    this.record('getUniformLocation', [program.handle, name]);
    return { handle: this.nextHandle++ };
  }

  /* ------------------------------------------------------ vertex setup */

  enableVertexAttribArray(index: number): void {
    this.record('enableVertexAttribArray', [index]);
  }

  disableVertexAttribArray(index: number): void {
    this.record('disableVertexAttribArray', [index]);
  }

  vertexAttribPointer(
    index: number,
    size: number,
    type: number,
    normalized: boolean,
    stride: number,
    offset: number,
  ): void {
    this.record('vertexAttribPointer', [index, size, type, normalized, stride, offset]);
  }

  /* --------------------------------------------------------- uniforms */

  uniformMatrix4fv(location: GpuUniformLocation, transpose: boolean, value: Float32Array): void {
    this.record('uniformMatrix4fv', [location.handle, transpose, Array.from(value)]);
  }

  uniformMatrix3fv(location: GpuUniformLocation, transpose: boolean, value: Float32Array): void {
    this.record('uniformMatrix3fv', [location.handle, transpose, Array.from(value)]);
  }

  uniform3f(location: GpuUniformLocation, x: number, y: number, z: number): void {
    this.record('uniform3f', [location.handle, x, y, z]);
  }

  uniform4fv(location: GpuUniformLocation, value: Float32Array): void {
    this.record('uniform4fv', [location.handle, Array.from(value)]);
  }

  uniform1f(location: GpuUniformLocation, value: number): void {
    this.record('uniform1f', [location.handle, value]);
  }

  uniform1i(location: GpuUniformLocation, value: number): void {
    this.record('uniform1i', [location.handle, value]);
  }

  /* ------------------------------------------------------ frame state */

  viewport(x: number, y: number, width: number, height: number): void {
    this.record('viewport', [x, y, width, height]);
  }

  clearColor(r: number, g: number, b: number, a: number): void {
    this.record('clearColor', [r, g, b, a]);
  }

  clear(mask: number): void {
    this.record('clear', [mask]);
  }

  enable(capability: number): void {
    this.record('enable', [capability]);
  }

  disable(capability: number): void {
    this.record('disable', [capability]);
  }

  depthFunc(func: number): void {
    this.record('depthFunc', [func]);
  }

  blendFunc(src: number, dst: number): void {
    this.record('blendFunc', [src, dst]);
  }

  lineWidth(width: number): void {
    this.record('lineWidth', [width]);
  }

  /* ----------------------------------------------------------- drawing */

  drawArrays(mode: number, first: number, count: number): void {
    this.record('drawArrays', [mode, first, count]);
  }

  drawElements(mode: number, count: number, type: number, offset: number): void {
    this.record('drawElements', [mode, count, type, offset]);
  }

  frontFace(mode: number): void {
    this.record('frontFace', [mode]);
  }

  cullFace(mode: number): void {
    this.record('cullFace', [mode]);
  }

  reset(): void {
    this.record('reset', []);
    this.liveBuffers.clear();
    this.livePrograms.clear();
  }
}
