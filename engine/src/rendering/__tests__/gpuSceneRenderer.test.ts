import { describe, expect, it } from 'vitest';

import { CyberSimulation } from '../../cyber/simulation/CyberSimulation.js';
import { CyberWorldAdapter } from '../CyberWorldAdapter.js';
import { GpuConstant } from '../gpu/GpuDevice.js';
import {
  CYBER_STATE_COLORS,
  DEFAULT_GPU_RENDER_OPTIONS,
  GpuSceneRenderer,
  buildGridMesh,
  layoutHostPosition,
  styleForHostMetadata,
} from '../gpu/GpuSceneRenderer.js';
import { RecordingGpuDevice } from '../gpu/RecordingGpuDevice.js';

import type { GpuSceneCamera, GpuRenderOptions } from '../gpu/GpuSceneRenderer.js';

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

function options(overrides: Partial<GpuRenderOptions> = {}): GpuRenderOptions {
  return { ...DEFAULT_GPU_RENDER_OPTIONS, ...overrides };
}

/** A live incident: compromise, privilege escalation, detection, containment. */
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

describe('GpuSceneRenderer compiles a real program', () => {
  it('compiles and links a shader program on first use', () => {
    const device = new RecordingGpuDevice();
    new GpuSceneRenderer(device).render(incidentScene(), camera(), '3d');

    expect(device.countCalls('createShader')).toBe(2);
    expect(device.countCalls('compileShader')).toBe(2);
    expect(device.countCalls('linkProgram')).toBe(1);

    const types = device.getCalls('createShader').map((call) => call.args[0]);
    expect(types).toContain(GpuConstant.VERTEX_SHADER);
    expect(types).toContain(GpuConstant.FRAGMENT_SHADER);
  });

  it('compiles once and reuses the program across frames', () => {
    const device = new RecordingGpuDevice();
    const renderer = new GpuSceneRenderer(device);
    const scene = incidentScene();

    renderer.render(scene, camera(), '3d');
    renderer.render(scene, camera(), '3d');
    renderer.render(scene, camera(), '3d');

    expect(device.countCalls('linkProgram')).toBe(1);
    expect(renderer.getFrameCount()).toBe(3);
  });

  it('surfaces the GL info log when shader compilation fails', () => {
    const device = new RecordingGpuDevice();
    device.failCompilation('ERROR: 0:12: syntax error');

    expect(() => new GpuSceneRenderer(device).render(incidentScene(), camera(), '3d')).toThrow(
      /Vertex shader compilation failed: ERROR: 0:12: syntax error/,
    );
  });

  it('surfaces the GL info log when program linking fails', () => {
    const device = new RecordingGpuDevice();
    device.failLinking('varying mismatch');

    expect(() => new GpuSceneRenderer(device).render(incidentScene(), camera(), '3d')).toThrow(
      /Program link failed: varying mismatch/,
    );
  });

  it('rejects construction without a device', () => {
    expect(() => new GpuSceneRenderer(null as never)).toThrow(/requires a GpuDevice/);
  });
});

describe('GpuSceneRenderer submits real triangle geometry', () => {
  it('draws indexed triangles rather than points', () => {
    const device = new RecordingGpuDevice();
    const stats = new GpuSceneRenderer(device).render(incidentScene(), camera(), '3d');

    const draws = device.getCalls('drawElements');
    expect(draws).toHaveLength(1);
    expect(draws[0].args[0]).toBe(GpuConstant.TRIANGLES);

    // Points are exactly what broke the renderer: driver point-size clamping
    // made every host a single pixel. There must be no point drawing at all.
    expect(device.countCalls('drawArrays')).toBe(0);
    expect(device.countCalls('drawElements')).toBeGreaterThan(0);

    expect(stats.triangleCount).toBeGreaterThan(0);
    expect(stats.vertexCount).toBeGreaterThan(0);
  });

  it('produces a whole number of triangles with a consistent index buffer', () => {
    const device = new RecordingGpuDevice();
    const stats = new GpuSceneRenderer(device).render(incidentScene(), camera(), '3d');

    // A fractional triangle count means a corrupt index buffer.
    expect(Number.isInteger(stats.triangleCount)).toBe(true);

    const indexCount = device.getCalls('drawElements')[0].args[1] as number;
    expect(indexCount % 3).toBe(0);
    expect(indexCount / 3).toBe(stats.triangleCount);
  });

  it('uploads an index buffer alongside the interleaved vertex buffer', () => {
    const device = new RecordingGpuDevice();
    const stats = new GpuSceneRenderer(device).render(incidentScene(), camera(), '3d');

    const uploads = device.getCalls('bufferData');
    expect(uploads).toHaveLength(2);

    const targets = uploads.map((call) => call.args[0]);
    expect(targets).toContain(GpuConstant.ARRAY_BUFFER);
    expect(targets).toContain(GpuConstant.ELEMENT_ARRAY_BUFFER);

    const vertexUpload = uploads.find((call) => call.args[0] === GpuConstant.ARRAY_BUFFER);
    // 10 floats per vertex: vec3 position, vec3 normal, vec4 colour.
    expect(vertexUpload?.args[1]).toBe(stats.vertexCount * 10);
  });

  it('binds position, normal and colour with a correct interleaved layout', () => {
    const device = new RecordingGpuDevice();
    new GpuSceneRenderer(device).render(incidentScene(), camera(), '3d');

    const pointers = device.getCalls('vertexAttribPointer').map((call) => call.args);
    const stride = 10 * 4;

    // vec3 position at byte 0.
    expect(pointers).toContainEqual([0, 3, GpuConstant.FLOAT, false, stride, 0]);
    // vec3 normal at byte 12 — without this, lighting cannot work.
    expect(pointers).toContainEqual([1, 3, GpuConstant.FLOAT, false, stride, 12]);
    // vec4 colour at byte 24.
    expect(pointers).toContainEqual([2, 4, GpuConstant.FLOAT, false, stride, 24]);

    // No attribute may be left unbound at -1.
    expect(pointers.every((args) => (args[0] as number) >= 0)).toBe(true);
  });

  it('enables depth testing so 3D has real occlusion', () => {
    const device = new RecordingGpuDevice();
    new GpuSceneRenderer(device).render(incidentScene(), camera(), '3d');

    expect(device.getCalls('enable').map((call) => call.args[0])).toContain(
      GpuConstant.DEPTH_TEST,
    );
    expect(device.countCalls('depthFunc')).toBe(1);
  });

  it('sets a counter-clockwise front face to match the generated winding', () => {
    const device = new RecordingGpuDevice();
    new GpuSceneRenderer(device).render(incidentScene(), camera(), '3d');

    expect(device.getCalls('frontFace').map((call) => call.args[0])).toContain(GpuConstant.CCW);
  });

  it('clears the frame before issuing any draw call', () => {
    const device = new RecordingGpuDevice();
    new GpuSceneRenderer(device).render(incidentScene(), camera(), '3d');

    const names = device.getCallNames();
    const clearIndex = names.indexOf('clear');
    const drawIndex = names.indexOf('drawElements');

    expect(clearIndex).toBeGreaterThanOrEqual(0);
    expect(drawIndex).toBeGreaterThan(clearIndex);
  });

  it('supplies real lighting uniforms', () => {
    const device = new RecordingGpuDevice();
    new GpuSceneRenderer(device).render(incidentScene(), camera(), '3d');

    // Lighting is what was missing: the old shader output vColor untouched.
    expect(device.countCalls('uniform3f')).toBeGreaterThanOrEqual(2);

    const vec3Values = device.getCalls('uniform3f').map((call) => call.args.slice(1));
    // A key light direction and a non-zero ambient term.
    expect(vec3Values.some((v) => Math.hypot(v[0] as number, v[1] as number, v[2] as number) > 0.5)).toBe(true);
    expect(vec3Values.some((v) => (v[0] as number) > 0 && (v[1] as number) > 0)).toBe(true);
  });

  it('uploads the normal matrix as a mat3, never a mat4', () => {
    const device = new RecordingGpuDevice();
    new GpuSceneRenderer(device).render(incidentScene(), camera(), '3d');

    // uNormalMatrix is declared mat3 in the shader. A mat4 upload on a mat3
    // location is an INVALID_OPERATION in WebGL, which leaves the uniform at
    // zero and NaNs every transformed normal — so lighting goes black.
    const mat3 = device.getCalls('uniformMatrix3fv');
    expect(mat3).toHaveLength(1);
    expect((mat3[0].args[2] as number[])).toHaveLength(9);
    expect(mat3[0].args[2]).toEqual([1, 0, 0, 0, 1, 0, 0, 0, 1]);

    // No mat4 upload may target the normal matrix.
    const mat4Count = device.countCalls('uniformMatrix4fv');
    expect(mat4Count).toBe(3); // projection, view, model
  });

  it('uses flat shading for 2D and real shading for 3D', () => {
    const flat = new RecordingGpuDevice();
    new GpuSceneRenderer(flat).render(incidentScene(), camera(), '2d');

    const lit = new RecordingGpuDevice();
    new GpuSceneRenderer(lit).render(incidentScene(), camera(), '3d');

    const flatValues = flat.getCalls('uniform1f').map((call) => call.args[1]);
    const litValues = lit.getCalls('uniform1f').map((call) => call.args[1]);

    expect(flatValues).toContain(1);
    expect(litValues).toContain(0);
  });

  it('unbinds buffers and program at the end of the frame', () => {
    const device = new RecordingGpuDevice();
    new GpuSceneRenderer(device).render(incidentScene(), camera(), '3d');

    const binds = device.getCalls('bindBuffer');
    expect(binds.at(-1)?.args[1]).toBeNull();

    const programs = device.getCalls('useProgram');
    expect(programs.at(-1)?.args[0]).toBeNull();
  });

  it('releases GPU resources on dispose', () => {
    const device = new RecordingGpuDevice();
    const renderer = new GpuSceneRenderer(device);

    renderer.render(incidentScene(), camera(), '3d');
    expect(device.getLiveBufferCount()).toBeGreaterThan(0);
    expect(device.getLiveProgramCount()).toBe(1);

    renderer.dispose();

    expect(device.getLiveBufferCount()).toBe(0);
    expect(device.getLiveProgramCount()).toBe(0);
    expect(device.countCalls('reset')).toBe(1);
  });

  it('validates the scene before issuing any draw call', () => {
    const device = new RecordingGpuDevice();
    const renderer = new GpuSceneRenderer(device);

    const scene = incidentScene();
    (scene as unknown as { connections: Array<{ source: string }> }).connections.push({
      source: 'ghost',
    });

    expect(() => renderer.render(scene, camera(), '3d')).toThrow(/missing node/);
    expect(device.countCalls('drawElements')).toBe(0);
  });
});

describe('geometry scales with the scene', () => {
  it('emits more triangles for a larger network', () => {
    const smallScene = incidentScene();
    const small = new RecordingGpuDevice();
    const smallStats = new GpuSceneRenderer(small).render(smallScene, camera(), '3d');

    // A second scene with more hosts must produce more geometry.
    const sim = new CyberSimulation(42);
    sim.initialize();
    sim.runRecon();
    sim.discoverServices();
    sim.exploitWebServer();
    sim.escalatePrivileges();
    sim.moveToDatabase();
    sim.detectThreats();
    sim.isolateHost('admin-workstation');
    const state = sim.getState();

    // The extra hosts clone the incident's own hosts rather than being all
    // `admin_workstation`. Host shape is chosen by type — databases are
    // cylinders, workstations are boxes, everything else is a sphere — so a
    // network padded with nothing but cheap boxes could legitimately emit
    // *fewer* triangles than a smaller network of spheres. Cloning keeps the
    // mix of shapes and cyber states identical, so the only variable left is
    // the number of hosts and the assertion measures scale, not shape choice.
    const source = Object.values(state.hosts);
    for (let i = 0; i < 12; i += 1) {
      const template = source[i % source.length];
      state.hosts[`extra-${i}`] = { ...template, id: `extra-${i}`, name: `Extra ${i}` };
    }
    const bigScene = CyberWorldAdapter.toSceneGraph(state);

    const big = new RecordingGpuDevice();
    const bigStats = new GpuSceneRenderer(big).render(bigScene, camera(), '3d');

    expect(bigStats.nodeCount).toBeGreaterThan(smallStats.nodeCount);
    expect(bigStats.triangleCount).toBeGreaterThan(smallStats.triangleCount);
  });

  it('produces real 3D meshes, not flat sprites, in 3D mode', () => {
    const flat = new RecordingGpuDevice();
    const flatStats = new GpuSceneRenderer(flat).render(incidentScene(), camera(), '2d');

    const solid = new RecordingGpuDevice();
    const solidStats = new GpuSceneRenderer(solid).render(incidentScene(), camera(), '3d');

    // 3D uses spheres, boxes and cylinders; 2D uses single discs. A real 3D
    // scene therefore submits far more geometry for the same node count.
    expect(solidStats.nodeCount).toBe(flatStats.nodeCount);
    expect(solidStats.triangleCount).toBeGreaterThan(flatStats.triangleCount * 3);
  });

  it('submits geometry in every projection mode', () => {
    for (const mode of ['2d', '2.5d', '3d'] as const) {
      const device = new RecordingGpuDevice();
      const stats = new GpuSceneRenderer(device).render(incidentScene(), camera(), mode);

      expect(stats.projection).toBe(mode);
      expect(stats.triangleCount).toBeGreaterThan(0);
      expect(Number.isInteger(stats.triangleCount)).toBe(true);
      expect(device.countCalls('drawElements')).toBe(1);
    }
  });

  it('draws only the grid for an empty scene, and nothing when the grid is off', () => {
    const empty = CyberWorldAdapter.toSceneGraph({ hosts: {} });

    const device = new RecordingGpuDevice();
    const stats = new GpuSceneRenderer(device).render(empty, camera(), '2d');
    expect(stats.nodeCount).toBe(0);
    expect(stats.gridDrawn).toBe(true);
    expect(stats.triangleCount).toBeGreaterThan(0);

    const noGrid = new RecordingGpuDevice();
    const offStats = new GpuSceneRenderer(noGrid).render(empty, camera(), '2d', options({ showGrid: false }));
    expect(offStats.triangleCount).toBe(0);
    expect(noGrid.countCalls('drawElements')).toBe(0);
  });

  it('adds grid geometry when the grid overlay is on', () => {
    const scene = incidentScene();

    const withGrid = new RecordingGpuDevice();
    const onStats = new GpuSceneRenderer(withGrid).render(scene, camera(), '3d');

    const withoutGrid = new RecordingGpuDevice();
    const offStats = new GpuSceneRenderer(withoutGrid).render(scene, camera(), '3d', options({ showGrid: false }));

    expect(onStats.gridDrawn).toBe(true);
    expect(offStats.gridDrawn).toBe(false);
    expect(onStats.triangleCount).toBeGreaterThan(offStats.triangleCount);
  });

  it('does not change topology when colour-only overlays are toggled', () => {
    const scene = incidentScene();

    const on = new RecordingGpuDevice();
    const onStats = new GpuSceneRenderer(on).render(scene, camera(), '3d');

    const off = new RecordingGpuDevice();
    const offStats = new GpuSceneRenderer(off).render(
      scene,
      camera(),
      '3d',
      options({ showCompromised: false, showAlerts: false, showWireframe: true }),
    );

    // Compromise, alert and wireframe are colour-only: they recolour the same
    // submitted geometry instead of adding or removing any of it. (The
    // isolation overlay is deliberately excluded — it draws a ring, which is
    // geometry, and is asserted separately below.)
    expect(offStats.nodeCount).toBe(onStats.nodeCount);
    expect(offStats.edgeCount).toBe(onStats.edgeCount);
    expect(offStats.triangleCount).toBe(onStats.triangleCount);
  });

  it('draws a ring around every isolated host when the isolation overlay is on', () => {
    const scene = incidentScene();
    const isolatedCount = scene
      .getNodes()
      .filter(
        (node) =>
          ((node.metadata ?? {}) as Record<string, unknown>).isolated === true,
      ).length;
    expect(isolatedCount).toBeGreaterThan(0);

    const on = new RecordingGpuDevice();
    const onStats = new GpuSceneRenderer(on).render(scene, camera(), '3d');

    const off = new RecordingGpuDevice();
    const offStats = new GpuSceneRenderer(off).render(
      scene,
      camera(),
      '3d',
      options({ showIsolated: false }),
    );

    // The isolation marker is real geometry rather than a recolour: the ring is
    // 56 segments x 2 triangles, so switching the overlay off removes exactly
    // one ring per isolated host and nothing else.
    expect(onStats.triangleCount - offStats.triangleCount).toBe(isolatedCount * 112);
  });

  it('does not blank the scene when brightness is non-positive', () => {
    const device = new RecordingGpuDevice();
    const stats = new GpuSceneRenderer(device).render(
      incidentScene(),
      camera(),
      '3d',
      options({ brightness: 0 }),
    );

    expect(stats.nodeCount).toBeGreaterThan(0);
    expect(stats.triangleCount).toBeGreaterThan(0);
  });
});

describe('camera and projection', () => {
  it('uses a perspective matrix in 3D and orthographic in 2D', () => {
    const persp = new RecordingGpuDevice();
    new GpuSceneRenderer(persp).render(incidentScene(), camera(), '3d');

    const ortho = new RecordingGpuDevice();
    new GpuSceneRenderer(ortho).render(incidentScene(), camera(), '2d');

    const firstMatrix = (device: RecordingGpuDevice): number[] =>
      device.getCalls('uniformMatrix4fv')[0].args[2] as number[];

    // Perspective has -1 in the w row; orthographic has 0 and w = 1.
    expect(firstMatrix(persp)[11]).toBe(-1);
    expect(firstMatrix(ortho)[11]).toBe(0);
    expect(firstMatrix(ortho)[15]).toBe(1);
  });

  it('uses a tilted camera for 2.5D, distinct from both flat 2D and 3D', () => {
    const viewOf = (mode: '2d' | '2.5d' | '3d'): number[] => {
      const device = new RecordingGpuDevice();
      new GpuSceneRenderer(device).render(incidentScene(), camera(), mode);
      return device.getCalls('uniformMatrix4fv')[1].args[2] as number[];
    };

    const flat = viewOf('2d');
    const tilted = viewOf('2.5d');
    const perspective = viewOf('3d');

    // 2.5D must differ from flat 2D, otherwise it is not 2.5D.
    expect(tilted).not.toEqual(flat);
    expect(tilted).not.toEqual(perspective);
  });

  it('applies pan and zoom to the 2D view matrix', () => {
    const viewOf = (cam: GpuSceneCamera): number[] => {
      const device = new RecordingGpuDevice();
      new GpuSceneRenderer(device).render(incidentScene(), cam, '2d');
      return device.getCalls('uniformMatrix4fv')[1].args[2] as number[];
    };

    expect(viewOf(camera({ panX: 40, zoom: 2 }))).not.toEqual(viewOf(camera()));
  });

  it('applies orbit yaw and pitch to the 3D view matrix', () => {
    const viewOf = (cam: GpuSceneCamera): number[] => {
      const device = new RecordingGpuDevice();
      new GpuSceneRenderer(device).render(incidentScene(), cam, '3d');
      return device.getCalls('uniformMatrix4fv')[1].args[2] as number[];
    };

    expect(viewOf(camera({ yaw: 1.2 }))).not.toEqual(viewOf(camera({ yaw: 0.2 })));
    expect(viewOf(camera({ pitch: 1.1 }))).not.toEqual(viewOf(camera({ pitch: 0.1 })));
  });
});

describe('host styling reflects cyber state', () => {
  const all = { showCompromised: true, showIsolated: true, showAlerts: true };

  it('prioritises the attacker position above every other state', () => {
    const attacker = styleForHostMetadata(
      { isAttackerPosition: true, compromised: true, isolated: true, alerted: true },
      all,
    );

    expect(attacker.color).toEqual(CYBER_STATE_COLORS.attacker);
    // The attacker marker is the most prominent host on screen.
    expect(attacker.radius).toBeGreaterThan(styleForHostMetadata({ compromised: true }, all).radius);
  });

  it('renders isolated hosts as hollow rings', () => {
    expect(styleForHostMetadata({ isolated: true }, all).hollow).toBe(true);
    expect(styleForHostMetadata({}, all).hollow).toBe(false);
  });

  it('distinguishes compromised, alerted, objective and clean hosts', () => {
    const compromised = styleForHostMetadata({ compromised: true }, all);
    const alerted = styleForHostMetadata({ alerted: true }, all);
    const objective = styleForHostMetadata({ isObjectiveTarget: true }, all);
    const clean = styleForHostMetadata({}, all);

    const colors = [compromised.color, alerted.color, objective.color, clean.color];
    expect(new Set(colors.map((c) => c.join(','))).size).toBe(4);
  });

  it('falls through to clean when the compromised overlay is off', () => {
    const off = styleForHostMetadata({ compromised: true }, { ...all, showCompromised: false });

    expect(off.color).toEqual(CYBER_STATE_COLORS.clean);
    expect(off.radius).toBe(styleForHostMetadata({}, all).radius);
  });

  it('suppresses isolated and alerted styling when those overlays are off', () => {
    expect(
      styleForHostMetadata({ isolated: true }, { ...all, showIsolated: false }).color,
    ).toEqual(CYBER_STATE_COLORS.clean);
    expect(
      styleForHostMetadata({ alerted: true }, { ...all, showAlerts: false }).color,
    ).toEqual(CYBER_STATE_COLORS.clean);
  });

  it('keeps the attacker marker even when every overlay is off', () => {
    const none = { showCompromised: false, showIsolated: false, showAlerts: false };
    const attacker = styleForHostMetadata(
      { isAttackerPosition: true, compromised: true, isolated: true },
      none,
    );

    // Hiding where the attacker is would misrepresent the simulation.
    expect(attacker.color).toEqual(CYBER_STATE_COLORS.attacker);
    expect(attacker.hollow).toBe(false);
  });
});

describe('layout is deterministic and shared', () => {
  it('gives every host a distinct position in every mode', () => {
    for (const mode of ['2d', '2.5d', '3d'] as const) {
      const positions = Array.from({ length: 9 }, (_, i) =>
        layoutHostPosition(i, 9, mode).join(','),
      );
      expect(new Set(positions).size).toBe(9);
    }
  });

  it('is stable across calls', () => {
    expect(layoutHostPosition(3, 9, '3d')).toEqual(layoutHostPosition(3, 9, '3d'));
  });

  it('places 3D hosts with real depth variation', () => {
    const zs = new Set(
      Array.from({ length: 9 }, (_, i) => layoutHostPosition(i, 9, '3d')[2].toFixed(3)),
    );
    expect(zs.size).toBeGreaterThan(1);
  });

  it('gives 2.5D hosts depth that flat 2D does not have', () => {
    const flatZ = new Set(
      Array.from({ length: 9 }, (_, i) => layoutHostPosition(i, 9, '2d')[2]),
    );
    const tiltedZ = new Set(
      Array.from({ length: 9 }, (_, i) => layoutHostPosition(i, 9, '2.5d')[2].toFixed(3)),
    );

    expect(flatZ.size).toBe(1);
    expect(tiltedZ.size).toBeGreaterThan(1);
  });
});

describe('grid geometry', () => {
  it('builds real quad geometry rather than driver-width lines', () => {
    const grid = buildGridMesh('2d');

    expect(grid.indices.length % 3).toBe(0);
    expect(grid.indices.length / 3).toBeGreaterThan(0);
    expect(grid.positions.length / 3).toBe(grid.normals.length / 3);
    expect(grid.colors.length / 4).toBe(grid.positions.length / 3);
  });

  it('lies in the XY plane for flat projections', () => {
    const grid = buildGridMesh('2d');

    for (let i = 2; i < grid.positions.length; i += 3) {
      expect(grid.positions[i]).toBe(0);
    }
  });

  it('lies on a constant floor plane for 3D', () => {
    const grid = buildGridMesh('3d');
    const ys = new Set<number>();

    for (let i = 1; i < grid.positions.length; i += 3) {
      ys.add(grid.positions[i]);
    }

    expect(ys.size).toBe(1);
  });

  it('caches the grid mesh across frames for the same mode', () => {
    const device = new RecordingGpuDevice();
    const renderer = new GpuSceneRenderer(device);
    const scene = incidentScene();

    renderer.render(scene, camera(), '3d');
    const uploadsAfterFirst = device.getCalls('bufferData').length;

    renderer.render(scene, camera(), '3d');
    // Second frame re-uploads only the dynamic buffers, not a rebuilt grid.
    expect(device.getCalls('bufferData').length - uploadsAfterFirst).toBe(2);
  });
});
