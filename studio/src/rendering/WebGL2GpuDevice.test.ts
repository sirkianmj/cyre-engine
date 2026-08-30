/**
 * @vitest-environment jsdom
 */

import { describe, expect, it, vi } from 'vitest';

import { WebGL2GpuDevice, acquireWebGL2Context } from './WebGL2GpuDevice';

/**
 * A minimal stand-in for WebGL2RenderingContext that records which GL entry
 * points were called. It is a test instrument for the binding layer only; the
 * real context is supplied by the browser.
 */
function createMockGl() {
  const calls: Array<{ name: string; args: unknown[] }> = [];

  const record = (name: string) => (...args: unknown[]) => {
    calls.push({ name, args });
  };

  let handle = 0;
  const make = (kind: string) => {
    handle += 1;
    return { __kind: kind, __handle: handle };
  };

  const gl = {
    COMPILE_STATUS: 0x8b81,
    LINK_STATUS: 0x8b82,
    isContextLost: vi.fn(() => false),
    createBuffer: vi.fn(() => make('buffer')),
    bindBuffer: vi.fn(record('bindBuffer')),
    bufferData: vi.fn(record('bufferData')),
    deleteBuffer: vi.fn(record('deleteBuffer')),
    createShader: vi.fn(() => make('shader')),
    shaderSource: vi.fn(record('shaderSource')),
    compileShader: vi.fn(record('compileShader')),
    getShaderParameter: vi.fn(() => true),
    getShaderInfoLog: vi.fn(() => 'shader log'),
    deleteShader: vi.fn(record('deleteShader')),
    createProgram: vi.fn(() => make('program')),
    attachShader: vi.fn(record('attachShader')),
    linkProgram: vi.fn(record('linkProgram')),
    getProgramParameter: vi.fn(() => true),
    getProgramInfoLog: vi.fn(() => 'program log'),
    useProgram: vi.fn(record('useProgram')),
    deleteProgram: vi.fn(record('deleteProgram')),
    getAttribLocation: vi.fn((_: unknown, name: string) => (name === 'aPosition' ? 0 : 1)),
    getUniformLocation: vi.fn(() => make('uniform')),
    enableVertexAttribArray: vi.fn(record('enableVertexAttribArray')),
    disableVertexAttribArray: vi.fn(record('disableVertexAttribArray')),
    vertexAttribPointer: vi.fn(record('vertexAttribPointer')),
    uniformMatrix4fv: vi.fn(record('uniformMatrix4fv')),
    uniform4fv: vi.fn(record('uniform4fv')),
    uniform1f: vi.fn(record('uniform1f')),
    uniform1i: vi.fn(record('uniform1i')),
    viewport: vi.fn(record('viewport')),
    clearColor: vi.fn(record('clearColor')),
    clear: vi.fn(record('clear')),
    enable: vi.fn(record('enable')),
    disable: vi.fn(record('disable')),
    depthFunc: vi.fn(record('depthFunc')),
    blendFunc: vi.fn(record('blendFunc')),
    lineWidth: vi.fn(record('lineWidth')),
    drawArrays: vi.fn(record('drawArrays')),
    drawElements: vi.fn(record('drawElements')),
  };

  return { gl: gl as unknown as WebGL2RenderingContext, calls, raw: gl };
}

describe('WebGL2GpuDevice', () => {
  it('requires a context', () => {
    expect(() => new WebGL2GpuDevice(null as never)).toThrow(
      /requires a WebGL2RenderingContext/,
    );
  });

  it('creates real GL buffers and tracks their handles', () => {
    const { gl, raw } = createMockGl();
    const device = new WebGL2GpuDevice(gl);

    const buffer = device.createBuffer();
    expect(buffer.handle).toBeGreaterThan(0);
    expect(raw.createBuffer).toHaveBeenCalledOnce();

    device.bindBuffer(0x8892, buffer);
    expect(raw.bindBuffer).toHaveBeenCalledWith(0x8892, expect.objectContaining({ __kind: 'buffer' }));
  });

  it('forwards buffer uploads to gl.bufferData', () => {
    const { gl, raw } = createMockGl();
    const device = new WebGL2GpuDevice(gl);

    const data = new Float32Array([1, 2, 3, 4]);
    device.bufferData(0x8892, data, 0x88e8);

    expect(raw.bufferData).toHaveBeenCalledWith(0x8892, data, 0x88e8);
  });

  it('compiles shaders and reports the real compile status', () => {
    const { gl, raw } = createMockGl();
    const device = new WebGL2GpuDevice(gl);

    const shader = device.createShader(0x8b31);
    device.shaderSource(shader, 'void main() {}');
    device.compileShader(shader);

    expect(raw.shaderSource).toHaveBeenCalled();
    expect(raw.compileShader).toHaveBeenCalled();
    expect(device.getShaderCompileStatus(shader)).toBe(true);
    expect(device.getShaderInfoLog(shader)).toBe('shader log');
  });

  it('reports a failed compile status from the driver', () => {
    const { gl, raw } = createMockGl();
    raw.getShaderParameter.mockReturnValue(false);
    const device = new WebGL2GpuDevice(gl);

    const shader = device.createShader(0x8b31);
    expect(device.getShaderCompileStatus(shader)).toBe(false);
  });

  it('links programs and reports the real link status', () => {
    const { gl, raw } = createMockGl();
    const device = new WebGL2GpuDevice(gl);

    const program = device.createProgram();
    device.linkProgram(program);

    expect(raw.linkProgram).toHaveBeenCalled();
    expect(device.getProgramLinkStatus(program)).toBe(true);
    expect(device.getProgramInfoLog(program)).toBe('program log');
  });

  it('resolves attribute and uniform locations through GL', () => {
    const { gl, raw } = createMockGl();
    const device = new WebGL2GpuDevice(gl);

    const program = device.createProgram();
    expect(device.getAttribLocation(program, 'aPosition')).toBe(0);
    expect(device.getUniformLocation(program, 'uProjection')).not.toBeNull();
    expect(raw.getAttribLocation).toHaveBeenCalled();
    expect(raw.getUniformLocation).toHaveBeenCalled();
  });

  it('forwards vertex attribute setup', () => {
    const { gl, raw } = createMockGl();
    const device = new WebGL2GpuDevice(gl);

    device.enableVertexAttribArray(0);
    device.vertexAttribPointer(0, 2, 0x1406, false, 28, 0);

    expect(raw.enableVertexAttribArray).toHaveBeenCalledWith(0);
    expect(raw.vertexAttribPointer).toHaveBeenCalledWith(0, 2, 0x1406, false, 28, 0);
  });

  it('ignores attribute calls for unbound locations (-1)', () => {
    const { gl, raw } = createMockGl();
    const device = new WebGL2GpuDevice(gl);

    device.enableVertexAttribArray(-1);
    device.vertexAttribPointer(-1, 2, 0x1406, false, 28, 0);

    expect(raw.enableVertexAttribArray).not.toHaveBeenCalled();
    expect(raw.vertexAttribPointer).not.toHaveBeenCalled();
  });

  it('forwards uniforms to the real locations', () => {
    const { gl, raw } = createMockGl();
    const device = new WebGL2GpuDevice(gl);

    const program = device.createProgram();
    const location = device.getUniformLocation(program, 'uProjection');
    const matrix = new Float32Array(16);

    device.uniformMatrix4fv(location!, false, matrix);
    device.uniform1f(location!, 2.5);
    device.uniform1i(location!, 1);
    device.uniform4fv(location!, new Float32Array(4));

    expect(raw.uniformMatrix4fv).toHaveBeenCalled();
    expect(raw.uniform1f).toHaveBeenCalled();
    expect(raw.uniform1i).toHaveBeenCalled();
    expect(raw.uniform4fv).toHaveBeenCalled();
  });

  it('forwards frame state and draw calls', () => {
    const { gl, raw } = createMockGl();
    const device = new WebGL2GpuDevice(gl);

    device.viewport(0, 0, 1280, 720);
    device.clearColor(0.1, 0.2, 0.3, 1);
    device.clear(0x4000);
    device.enable(0x0be2);
    device.blendFunc(0x0302, 0x0303);
    device.depthFunc(0x0201);
    device.lineWidth(1.5);
    device.drawArrays(0x0000, 0, 12);
    device.drawElements(0x0004, 6, 0x1403, 0);

    expect(raw.viewport).toHaveBeenCalledWith(0, 0, 1280, 720);
    expect(raw.clearColor).toHaveBeenCalledWith(0.1, 0.2, 0.3, 1);
    expect(raw.clear).toHaveBeenCalledWith(0x4000);
    expect(raw.drawArrays).toHaveBeenCalledWith(0x0000, 0, 12);
    expect(raw.drawElements).toHaveBeenCalledWith(0x0004, 6, 0x1403, 0);
  });

  it('deletes GL resources and clears its handle tables on reset', () => {
    const { gl, raw } = createMockGl();
    const device = new WebGL2GpuDevice(gl);

    const buffer = device.createBuffer();
    const shader = device.createShader(0x8b31);
    const program = device.createProgram();

    device.deleteBuffer(buffer);
    device.deleteShader(shader);
    device.deleteProgram(program);

    expect(raw.deleteBuffer).toHaveBeenCalled();
    expect(raw.deleteShader).toHaveBeenCalled();
    expect(raw.deleteProgram).toHaveBeenCalled();

    device.createBuffer();
    device.reset();

    expect(raw.deleteBuffer).toHaveBeenCalledTimes(2);

    // Handles issued before reset are no longer resolvable.
    expect(() => device.bindBuffer(0x8892, buffer)).toThrow(/Unknown GPU buffer handle/);
  });

  it('reports unknown handles rather than silently passing null to GL', () => {
    const { gl, raw } = createMockGl();
    const device = new WebGL2GpuDevice(gl);

    expect(() =>
      device.bindBuffer(0x8892, { handle: 999 }),
    ).toThrow(/Unknown GPU buffer handle 999/);
    expect(raw.bindBuffer).not.toHaveBeenCalled();
  });

  it('reports context loss', () => {
    const { gl, raw } = createMockGl();
    raw.isContextLost.mockReturnValue(true);
    const device = new WebGL2GpuDevice(gl);

    expect(device.isContextLost()).toBe(true);
    expect(device.getContext()).toBe(gl);
  });
});

describe('acquireWebGL2Context', () => {
  it('returns null when the platform cannot provide a context', () => {
    const canvas = document.createElement('canvas');
    // jsdom has no WebGL implementation, which is exactly the unsupported case.
    expect(acquireWebGL2Context(canvas)).toBeNull();
  });

  it('returns null instead of throwing when getContext throws', () => {
    const canvas = document.createElement('canvas');
    canvas.getContext = (() => {
      throw new Error('no GPU');
    }) as typeof canvas.getContext;

    expect(acquireWebGL2Context(canvas)).toBeNull();
  });
});
