import { GpuConstant } from './GpuDevice.js';
import type { GpuBuffer, GpuDevice, GpuProgram, GpuUniformLocation } from './GpuDevice.js';
import {
  appendMesh,
  buildBox,
  buildCylinder,
  buildDisc,
  buildRing,
  buildSphere,
  buildTube,
  createBatch,
  cross3,
  normalize3,
  rotationFromUp,
} from './Geometry.js';
import type { MeshBatch } from './Geometry.js';
import { createMat4, lookAt, multiply, orthographic, perspective } from './Mat4.js';
import type { Mat4 } from './Mat4.js';
import type { SceneGraph } from '../SceneGraph.js';

export type GpuProjectionMode = '2d' | '2.5d' | '3d';

/** How a host should be coloured, derived from its cyber state. */
export interface NodeVisualStyle {
  color: readonly [number, number, number];
  radius: number;
  /** Rendered as a ring rather than a filled disc. */
  hollow: boolean;
}

export interface GpuSceneCamera {
  /** Viewport size in CSS pixels. */
  width: number;
  height: number;
  /** 2D/2.5D pan offset in world units. */
  panX: number;
  panY: number;
  zoom: number;
  /** 3D orbit parameters, in radians and world units. */
  yaw: number;
  pitch: number;
  distance: number;
  target: readonly [number, number, number];
}

/**
 * Per-frame presentation options. These control which cyber-state overlays
 * affect the rendered output, so a viewer can isolate one signal at a time.
 */
export interface GpuRenderOptions {
  showGrid: boolean;
  showLabels: boolean;
  /** Renders hosts as wireframe rather than solid. */
  showWireframe: boolean;
  showCompromised: boolean;
  showIsolated: boolean;
  showAlerts: boolean;
  showEvidence: boolean;
  /** Multiplier applied to host colour brightness. */
  brightness: number;
}

export const DEFAULT_GPU_RENDER_OPTIONS: GpuRenderOptions = {
  showGrid: true,
  showLabels: true,
  showWireframe: false,
  showCompromised: true,
  showIsolated: true,
  showAlerts: true,
  showEvidence: true,
  brightness: 1,
};

/**
 * Per-frame interaction state, separate from the presentation toggles because
 * it changes with the pointer rather than with a settings window.
 */
export interface GpuEmphasis {
  /** Hosts drawn with a selection halo, in selection order. */
  selectedIds: readonly string[];
  /** The single host under the pointer, drawn with a hover highlight. */
  hoveredId: string | null;
  /**
   * Seconds since the session started. Drives the pulsing used for
   * selection, compromise and isolation so the viewport reads as live
   * rather than as a static diagram.
   */
  time: number;
}

export const DEFAULT_GPU_EMPHASIS: GpuEmphasis = {
  selectedIds: [],
  hoveredId: null,
  time: 0,
};

/**
 * Resolves the world position of every host for a frame.
 *
 * This is the single place host placement is decided. The renderer draws from
 * it and the Studio projects labels and hit-tests through it, so a host cannot
 * be drawn in one place and labelled or picked in another. `overrides` carries
 * hosts the user has dragged to a manual position; those positions win over the
 * automatic layout so a drag sticks instead of snapping back on the next frame.
 */
export function resolveHostPositions(
  nodes: readonly { id: string }[],
  mode: GpuProjectionMode,
  overrides?: ReadonlyMap<string, readonly [number, number, number]> | null,
): Map<string, readonly [number, number, number]> {
  const positions = new Map<string, readonly [number, number, number]>();

  nodes.forEach((node, index) => {
    const override = overrides?.get(node.id);
    positions.set(
      node.id,
      override && override.every((component) => Number.isFinite(component))
        ? override
        : layoutHostPosition(index, nodes.length, mode),
    );
  });

  return positions;
}

export interface GpuFrameStats {
  nodeCount: number;
  edgeCount: number;
  drawCalls: number;
  /** Triangles submitted this frame. */
  triangleCount: number;
  vertexCount: number;
  projection: GpuProjectionMode;
  /** True when the reference grid was drawn this frame. */
  gridDrawn: boolean;
}

/**
 * The orbit distance that means "no zoom". The Studio's default camera uses
 * this value, so the fitted framing below is exact at default zoom.
 */
export const DEFAULT_ORBIT_DISTANCE = 20;

/** Palette for cyber host state. */
export const CYBER_STATE_COLORS = {
  clean: [0.24, 0.55, 0.95] as const,
  compromised: [0.88, 0.31, 0.35] as const,
  isolated: [0.85, 0.64, 0.25] as const,
  alerted: [1.0, 0.42, 0.48] as const,
  attacker: [1.0, 0.72, 0.22] as const,
  objective: [0.35, 0.78, 0.48] as const,
  edge: [0.36, 0.46, 0.62] as const,
  blocked: [0.82, 0.33, 0.33] as const,
  grid: [0.13, 0.17, 0.24] as const,
} as const;

/** Palette for interaction emphasis, distinct from the cyber-state palette. */
export const EMPHASIS_COLORS = {
  /** Selection: cool white-blue, reads as "mine" without implying a state. */
  selected: [0.62, 0.86, 1.0] as const,
  /** Hover: dimmer than selection so hovering never looks like committing. */
  hover: [0.52, 0.7, 0.92] as const,
  /** Isolation marker. */
  isolated: [0.95, 0.78, 0.32] as const,
} as const;

/** Which state overlays should influence styling for this frame. */
export interface StyleOverlayFlags {
  showCompromised: boolean;
  showIsolated: boolean;
  showAlerts: boolean;
}

const ALL_OVERLAYS: StyleOverlayFlags = {
  showCompromised: true,
  showIsolated: true,
  showAlerts: true,
};

/**
 * Resolves the visual style for a host from its cyber state metadata.
 * Precedence: attacker position, then isolated, then compromised, then
 * alerted, then objective target, then clean.
 *
 * Overlays that are switched off are skipped, so a host falls through to the
 * next applicable signal rather than keeping a colour the viewer disabled.
 */
export function styleForHostMetadata(
  metadata: Record<string, unknown>,
  overlays: StyleOverlayFlags = ALL_OVERLAYS,
): NodeVisualStyle {
  if (metadata.isAttackerPosition === true) {
    return { color: CYBER_STATE_COLORS.attacker, radius: 1.15, hollow: false };
  }
  if (overlays.showIsolated && metadata.isolated === true) {
    return { color: CYBER_STATE_COLORS.isolated, radius: 0.95, hollow: true };
  }
  if (overlays.showCompromised && metadata.compromised === true) {
    return { color: CYBER_STATE_COLORS.compromised, radius: 1.05, hollow: false };
  }
  if (overlays.showAlerts && metadata.alerted === true) {
    return { color: CYBER_STATE_COLORS.alerted, radius: 1.0, hollow: false };
  }
  if (metadata.isObjectiveTarget === true) {
    return { color: CYBER_STATE_COLORS.objective, radius: 1.0, hollow: false };
  }
  return { color: CYBER_STATE_COLORS.clean, radius: 0.9, hollow: false };
}

/**
 * Deterministic layout for hosts, owned by the engine so every renderer
 * backend and every projection mode places a host identically.
 */
export function layoutHostPosition(
  index: number,
  total: number,
  mode: GpuProjectionMode,
): readonly [number, number, number] {
  const columns = Math.max(1, Math.ceil(Math.sqrt(Math.max(1, total))));
  const gridX = index % columns;
  const gridY = Math.floor(index / columns);

  if (mode === '3d') {
    // Ring on the XZ plane with a slight vertical stagger.
    const angle = total <= 1 ? 0 : (index / total) * Math.PI * 2;
    const radius = 7;
    return [
      Math.cos(angle) * radius,
      ((index % 3) - 1) * 0.9,
      Math.sin(angle) * radius,
    ];
  }

  const x = (gridX - (columns - 1) / 2) * 4.2;
  const y = -((gridY - (columns - 1) / 2) * 3.4);

  if (mode === '2.5d') {
    // Pseudo-depth: push rows back so the orthographic camera reads depth.
    return [x * (1 - gridY * 0.08), y * 0.82, -gridY * 2.2];
  }

  return [x, y, 0];
}

/**
 * The world-space half-extents that bound a laid-out network.
 *
 * Both the renderer and the Studio's label/pick projection use this, so the
 * camera always frames the whole network instead of leaving it small in the
 * middle of the viewport.
 */
export function computeLayoutExtent(
  nodeCount: number,
  mode: GpuProjectionMode,
): { halfWidth: number; halfHeight: number } {
  const count = Math.max(1, nodeCount);
  const columns = Math.max(1, Math.ceil(Math.sqrt(count)));
  const rows = Math.max(1, Math.ceil(count / columns));

  if (mode === '3d') {
    // Hosts sit on a ring of radius 7 with a small vertical stagger.
    return { halfWidth: 9.5, halfHeight: 9.5 };
  }

  const spacingX = 4.2;
  const spacingY = mode === '2.5d' ? 3.4 * 0.82 : 3.4;

  // Margin keeps node discs from touching the frame edge.
  const halfWidth = ((columns - 1) / 2) * spacingX + 2.6;
  const halfHeight = ((rows - 1) / 2) * spacingY + 2.6;

  return { halfWidth: Math.max(3, halfWidth), halfHeight: Math.max(3, halfHeight) };
}

/* ------------------------------------------------------------------ shaders */

const VERTEX_SHADER = `#version 300 es
precision highp float;

in vec3 aPosition;
in vec3 aNormal;
in vec4 aColor;

uniform mat4 uProjection;
uniform mat4 uView;
uniform mat4 uModel;
uniform mat3 uNormalMatrix;

out vec3 vNormal;
out vec4 vColor;
out vec3 vViewPos;

void main() {
  vec4 world = uModel * vec4(aPosition, 1.0);
  vec4 viewPos = uView * world;

  vViewPos = viewPos.xyz;
  vNormal = normalize(uNormalMatrix * aNormal);
  vColor = aColor;

  gl_Position = uProjection * viewPos;
}
`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec3 vNormal;
in vec4 vColor;
in vec3 vViewPos;

out vec4 outColor;

uniform vec3 uLightDir;
uniform vec3 uLightColor;
uniform vec3 uAmbient;
uniform float uShininess;
uniform float uWireframe;
uniform float uFlatShading;

void main() {
  vec3 normal = normalize(vNormal);
  vec3 viewDir = normalize(-vViewPos);
  vec3 lightDir = normalize(uLightDir);

  // Blinn-Phong: ambient + diffuse + specular.
  float diffuse = max(dot(normal, lightDir), 0.0);
  vec3 halfVec = normalize(lightDir + viewDir);
  float specular = pow(max(dot(normal, halfVec), 0.0), max(uShininess, 1.0));

  // A soft fill from the opposite side stops unlit faces going fully black.
  float fill = max(dot(normal, -lightDir), 0.0) * 0.22;

  vec3 lit = vColor.rgb * (uAmbient + uLightColor * (diffuse + fill))
           + uLightColor * specular * 0.35;

  // Flat shading (2D) skips lighting so colours read exactly as authored.
  vec3 shaded = mix(lit, vColor.rgb, uFlatShading);

  // Wireframe keeps only a rim: discard the interior of each primitive.
  float alpha = vColor.a;
  if (uWireframe > 0.5) {
    float rim = 1.0 - abs(dot(normal, viewDir));
    if (rim < 0.42) discard;
    alpha = 1.0;
  }

  outColor = vec4(shaded, alpha);
}
`;

/* ------------------------------------------------------------------ grid */

const GRID_EXTENT = 14;
const GRID_STEP = 2;
const GRID_THICKNESS = 0.045;

/**
 * Builds the reference grid as real quad geometry.
 *
 * GL line width is capped at 1px by most drivers, so the grid is made of thin
 * quads. 2D and 2.5D get an XY-plane grid; 3D gets a floor grid on XZ.
 */
export function buildGridMesh(mode: GpuProjectionMode): MeshBatch {
  const batch = createBatch();
  const quad = {
    positions: [-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0],
    normals: [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1],
    indices: [0, 1, 2, 0, 2, 3],
  };

  const span = GRID_EXTENT * 2;

  for (let offset = -GRID_EXTENT; offset <= GRID_EXTENT; offset += GRID_STEP) {
    if (mode === '3d') {
      const floorY = -3.2;
      // Lines parallel to Z.
      appendMesh(
        batch,
        quad,
        (x, y) => [offset + x * GRID_THICKNESS, floorY, y * span],
        () => [0, 1, 0],
      );
      // Lines parallel to X.
      appendMesh(
        batch,
        quad,
        (x, y) => [y * span, floorY, offset + x * GRID_THICKNESS],
        () => [0, 1, 0],
      );
    } else {
      appendMesh(batch, quad, (x, y) => [offset + x * GRID_THICKNESS, y * span, 0]);
      appendMesh(batch, quad, (x, y) => [y * span, offset + x * GRID_THICKNESS, 0]);
    }
  }

  return batch;
}

interface CompiledProgram {
  program: GpuProgram;
  projection: GpuUniformLocation | null;
  view: GpuUniformLocation | null;
  model: GpuUniformLocation | null;
  normalMatrix: GpuUniformLocation | null;
  lightDir: GpuUniformLocation | null;
  lightColor: GpuUniformLocation | null;
  ambient: GpuUniformLocation | null;
  shininess: GpuUniformLocation | null;
  wireframe: GpuUniformLocation | null;
  flatShading: GpuUniformLocation | null;
  position: number;
  normal: number;
  color: number;
}

/** Vertex stride in floats: vec3 position, vec3 normal, vec4 colour. */
const VERTEX_FLOATS = 10;

/**
 * GpuSceneRenderer
 * -----------------
 * Renders an engine SceneGraph by submitting real triangle geometry through a
 * GpuDevice. Hosts are spheres, boxes and cylinders lit with Blinn-Phong;
 * links are tubes (3D) or quads (2D/2.5D); the grid is quad geometry.
 *
 * Hosts are drawn as meshes rather than gl.POINTS because point size is not
 * portable — ANGLE and several macOS drivers clamp it to a single pixel, which
 * made every host invisible. Triangle geometry has no such dependency.
 */
export class GpuSceneRenderer {
  readonly id = 'cyre-gpu-scene-renderer';

  private readonly device: GpuDevice;
  private compiled: CompiledProgram | null = null;

  private vertexBuffer: GpuBuffer | null = null;
  private indexBuffer: GpuBuffer | null = null;
  private indexType: number = GpuConstant.UNSIGNED_SHORT;

  /** Cached static geometry, rebuilt only when the projection mode changes. */
  private gridMesh: MeshBatch | null = null;
  private gridMode: GpuProjectionMode | null = null;

  /**
   * Cached unit geometry.
   *
   * These are built at unit size and scaled per host at append time. Building
   * them at a host's radius instead — as an earlier version did — silently gave
   * every host the first host's size and ignored the hover/selection lift.
   */
  private sphere: ReturnType<typeof buildSphere> | null = null;
  private box: ReturnType<typeof buildBox> | null = null;
  private cylinder: ReturnType<typeof buildCylinder> | null = null;
  private disc: ReturnType<typeof buildDisc> | null = null;
  private ring: ReturnType<typeof buildRing> | null = null;

  private frameCount = 0;

  constructor(device: GpuDevice) {
    if (!device) throw new Error('GpuSceneRenderer requires a GpuDevice.');
    this.device = device;
  }

  getDevice(): GpuDevice {
    return this.device;
  }

  getFrameCount(): number {
    return this.frameCount;
  }

  /** Compiles and links the shader program. Throws with the GL info log. */
  initialize(): void {
    if (this.compiled) return;

    const device = this.device;

    const vertex = device.createShader(GpuConstant.VERTEX_SHADER);
    device.shaderSource(vertex, VERTEX_SHADER);
    device.compileShader(vertex);
    if (!device.getShaderCompileStatus(vertex)) {
      const log = device.getShaderInfoLog(vertex);
      device.deleteShader(vertex);
      throw new Error(`Vertex shader compilation failed: ${log}`);
    }

    const fragment = device.createShader(GpuConstant.FRAGMENT_SHADER);
    device.shaderSource(fragment, FRAGMENT_SHADER);
    device.compileShader(fragment);
    if (!device.getShaderCompileStatus(fragment)) {
      const log = device.getShaderInfoLog(fragment);
      device.deleteShader(vertex);
      device.deleteShader(fragment);
      throw new Error(`Fragment shader compilation failed: ${log}`);
    }

    const program = device.createProgram();
    device.attachShader(program, vertex);
    device.attachShader(program, fragment);
    device.linkProgram(program);

    if (!device.getProgramLinkStatus(program)) {
      const log = device.getProgramInfoLog(program);
      device.deleteProgram(program);
      device.deleteShader(vertex);
      device.deleteShader(fragment);
      throw new Error(`Program link failed: ${log}`);
    }

    device.deleteShader(vertex);
    device.deleteShader(fragment);

    this.compiled = {
      program,
      projection: device.getUniformLocation(program, 'uProjection'),
      view: device.getUniformLocation(program, 'uView'),
      model: device.getUniformLocation(program, 'uModel'),
      normalMatrix: device.getUniformLocation(program, 'uNormalMatrix'),
      lightDir: device.getUniformLocation(program, 'uLightDir'),
      lightColor: device.getUniformLocation(program, 'uLightColor'),
      ambient: device.getUniformLocation(program, 'uAmbient'),
      shininess: device.getUniformLocation(program, 'uShininess'),
      wireframe: device.getUniformLocation(program, 'uWireframe'),
      flatShading: device.getUniformLocation(program, 'uFlatShading'),
      position: device.getAttribLocation(program, 'aPosition'),
      normal: device.getAttribLocation(program, 'aNormal'),
      color: device.getAttribLocation(program, 'aColor'),
    };
  }

  /**
   * Renders one frame. Returns per-frame statistics so callers can verify real
   * geometry was submitted rather than an empty frame.
   */
  render(
    scene: SceneGraph,
    camera: GpuSceneCamera,
    mode: GpuProjectionMode,
    options: GpuRenderOptions = DEFAULT_GPU_RENDER_OPTIONS,
    emphasis: GpuEmphasis = DEFAULT_GPU_EMPHASIS,
    overrides?: ReadonlyMap<string, readonly [number, number, number]> | null,
  ): GpuFrameStats {
    this.initialize();
    const compiled = this.compiled;
    if (!compiled) throw new Error('GpuSceneRenderer failed to initialize.');

    scene.validate();

    const device = this.device;
    const nodes = scene.getNodes();
    const connections = scene.getConnections();

    const overlays: StyleOverlayFlags = {
      showCompromised: options.showCompromised,
      showIsolated: options.showIsolated,
      showAlerts: options.showAlerts,
    };
    const brightness =
      Number.isFinite(options.brightness) && options.brightness > 0 ? options.brightness : 1;

    /* ------------------------------------------------------- projection */

    // View and projection come from the same helper the Studio uses for label
    // placement and hit-testing, so what is drawn and what is labelled cannot
    // drift apart. These are computed before the geometry because the
    // selection halo is billboarded against the camera.
    const extent = computeLayoutExtent(nodes.length, mode);
    const matrices = computeCameraMatrices(camera, mode, extent);

    /* ---------------------------------------------------- build geometry */

    const positions = resolveHostPositions(nodes, mode, overrides);

    const batch = createBatch();

    // Links first so hosts draw over them.
    for (const connection of connections) {
      const from = positions.get(connection.source);
      const to = positions.get(connection.target);
      if (!from || !to) continue;

      const blocked = connection.type === 'blocked';
      const base = blocked ? CYBER_STATE_COLORS.blocked : CYBER_STATE_COLORS.edge;
      const alpha = (blocked ? 0.95 : 0.55) * (options.showAlerts ? 1 : 0.5);
      const color: readonly [number, number, number] = [
        base[0] * brightness,
        base[1] * brightness,
        base[2] * brightness,
      ];

      if (mode === '3d') {
        appendColored(batch, buildTube(from, to, 0.075, 8), color, alpha);
      } else {
        appendLinkQuad(batch, from, to, 0.09, color, alpha);
      }
    }

    const selected = new Set(emphasis.selectedIds);
    const time = Number.isFinite(emphasis.time) ? Math.max(0, emphasis.time) : 0;

    // Hosts.
    for (const node of nodes) {
      const position = positions.get(node.id) ?? [0, 0, 0];
      const metadata = (node.metadata ?? {}) as Record<string, unknown>;
      const style = styleForHostMetadata(metadata, overlays);

      // A live viewport should read as live: hosts in an active cyber state
      // breathe instead of sitting at a fixed brightness, and the phase is
      // offset per host so a whole network does not blink in lockstep.
      const pulse = statePulse(metadata, time, node.id);
      const isSelected = selected.has(node.id);
      const isHovered = emphasis.hoveredId === node.id;
      const lift = isSelected ? 1.08 : isHovered ? 1.16 : 1;

      const glow = pulse * (isHovered ? 1.22 : isSelected ? 1.14 : 1);
      const color: readonly [number, number, number] = [
        Math.min(1, style.color[0] * brightness * glow),
        Math.min(1, style.color[1] * brightness * glow),
        Math.min(1, style.color[2] * brightness * glow),
      ];

      const radius = style.radius * lift;
      if (mode === '3d') {
        const hostType = String(node.type ?? '');
        const alpha = style.hollow ? 0.9 : 1;

        if (hostType === 'database_server') {
          // Unit cylinder (radius 1, height 2) scaled so the height stays 2x
          // the radius, which keeps a database a distinct silhouette.
          const mesh = (this.cylinder ??= buildCylinder(1, 2, 20));
          appendColored(batch, mesh, color, alpha, position, radius * 0.85);
        } else if (hostType === 'admin_workstation' || hostType === 'internal_network') {
          const mesh = (this.box ??= buildBox(1));
          appendColored(batch, mesh, color, alpha, position, radius * 1.5);
        } else {
          const mesh = (this.sphere ??= buildSphere(1, 22, 16));
          appendColored(batch, mesh, color, alpha, position, radius);
        }
      } else {
        const disc = (this.disc ??= buildDisc(1, 40));
        appendColored(batch, disc, color, style.hollow ? 0.9 : 1, position, radius);
      }
    }

    /* ------------------------------------------------- selection halos */

    // Drawn after the hosts so a halo is never buried inside the mesh it
    // marks. Rings are billboarded onto the camera plane in 3D and lie in the
    // XY plane for the flat projections.
    const haloBasis = mode === '3d' ? cameraBasis(matrices.view) : null;

    for (const node of nodes) {
      const position = positions.get(node.id) ?? [0, 0, 0];
      const metadata = (node.metadata ?? {}) as Record<string, unknown>;
      const style = styleForHostMetadata(metadata, overlays);
      const isSelected = selected.has(node.id);
      const isHovered = emphasis.hoveredId === node.id;

      // Isolation gets a standing marker so an isolated host stays readable
      // even when the pointer is elsewhere and nothing is selected.
      const showIsolationRing = options.showIsolated && metadata.isolated === true;
      if (!isSelected && !isHovered && !showIsolationRing) continue;

      const inner = style.radius * (isSelected ? 1.55 : 1.4);
      // Unit ring: inner radius 1, outer 1.16, so scaling by `inner` gives a
      // band whose thickness stays proportional to the host it marks.
      const ring = (this.ring ??= buildRing(1, 1.16, 56));

      const halo: readonly [number, number, number] = isSelected
        ? EMPHASIS_COLORS.selected
        : isHovered
          ? EMPHASIS_COLORS.hover
          : EMPHASIS_COLORS.isolated;
      // Isolation pulses on a slow cycle; selection and hover are steady so
      // they do not fight the state pulse for attention.
      const alpha = showIsolationRing && !isSelected && !isHovered
        ? 0.4 + 0.3 * (0.5 + 0.5 * Math.sin(time * 2.4))
        : isSelected
          ? 0.85
          : 0.6;

      appendHalo(batch, ring, position, inner, halo, alpha, haloBasis);
    }

    // Grid.
    let gridDrawn = false;
    if (options.showGrid) {
      if (!this.gridMesh || this.gridMode !== mode) {
        this.gridMesh = buildGridMesh(mode);
        this.gridMode = mode;
      }
      appendColored(
        batch,
        this.gridMesh,
        CYBER_STATE_COLORS.grid,
        0.55,
      );
      gridDrawn = true;
    }

    const triangleCount = batch.indices.length / 3;

    /* ------------------------------------------------------- frame state */

    device.viewport(0, 0, Math.max(1, camera.width), Math.max(1, camera.height));
    device.clearColor(0.055, 0.063, 0.078, 1);
    device.clear(GpuConstant.COLOR_BUFFER_BIT | GpuConstant.DEPTH_BUFFER_BIT);

    device.enable(GpuConstant.DEPTH_TEST);
    device.depthFunc(GpuConstant.LEQUAL);
    device.enable(GpuConstant.BLEND);
    device.blendFunc(GpuConstant.SRC_ALPHA, GpuConstant.ONE_MINUS_SRC_ALPHA);
    device.frontFace(GpuConstant.CCW);
    // Culling is left off so flat 2D quads and open tubes stay visible from
    // either side; correctness of winding is still asserted by the geometry tests.
    device.disable(GpuConstant.CULL_FACE);

    device.useProgram(compiled.program);

    /* ---------------------------------------------------------- uniforms */

    const model = createMat4();
    if (compiled.projection) device.uniformMatrix4fv(compiled.projection, false, matrices.projection);
    if (compiled.view) device.uniformMatrix4fv(compiled.view, false, matrices.view);
    if (compiled.model) device.uniformMatrix4fv(compiled.model, false, model);
    // Geometry is authored in world space with an identity model matrix, so the
    // normal matrix is the 3x3 identity. This must be a mat3 upload: the shader
    // declares uNormalMatrix as mat3, and a mat4 upload on a mat3 location is
    // an INVALID_OPERATION that would leave it at zero and NaN every normal.
    if (compiled.normalMatrix) {
      const normalMatrix = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);
      device.uniformMatrix3fv(compiled.normalMatrix, false, normalMatrix);
    }

    // A key light from above-front; flat projections use flat shading instead.
    const lightDir = normalize3(0.45, 0.78, 0.55);
    if (compiled.lightDir) {
      device.uniform3f(compiled.lightDir, lightDir[0], lightDir[1], lightDir[2]);
    }
    if (compiled.lightColor) device.uniform3f(compiled.lightColor, 1.0, 0.98, 0.94);
    if (compiled.ambient) device.uniform3f(compiled.ambient, 0.3, 0.32, 0.38);
    if (compiled.shininess) device.uniform1f(compiled.shininess, 38);
    if (compiled.wireframe) device.uniform1f(compiled.wireframe, options.showWireframe ? 1 : 0);
    if (compiled.flatShading) device.uniform1f(compiled.flatShading, mode === '3d' ? 0 : 1);

    /* -------------------------------------------------------------- draw */

    let drawCalls = 0;

    if (batch.indices.length > 0) {
      const vertexData = interleave(batch);

      this.vertexBuffer ??= device.createBuffer();
      device.bindBuffer(GpuConstant.ARRAY_BUFFER, this.vertexBuffer);
      device.bufferData(GpuConstant.ARRAY_BUFFER, vertexData, GpuConstant.DYNAMIC_DRAW);

      const use32 = batch.positions.length / 3 > 65535;
      this.indexType = use32 ? GpuConstant.UNSIGNED_INT : GpuConstant.UNSIGNED_SHORT;
      const indexData = use32
        ? new Uint32Array(batch.indices)
        : new Uint16Array(batch.indices);

      this.indexBuffer ??= device.createBuffer();
      device.bindBuffer(GpuConstant.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
      device.bufferData(GpuConstant.ELEMENT_ARRAY_BUFFER, indexData, GpuConstant.DYNAMIC_DRAW);

      this.bindAttributes(compiled);
      device.drawElements(GpuConstant.TRIANGLES, batch.indices.length, this.indexType, 0);
      drawCalls += 1;
    }

    device.bindBuffer(GpuConstant.ARRAY_BUFFER, null);
    device.bindBuffer(GpuConstant.ELEMENT_ARRAY_BUFFER, null);
    device.useProgram(null);

    this.frameCount += 1;

    return {
      nodeCount: nodes.length,
      edgeCount: connections.length,
      drawCalls,
      triangleCount,
      vertexCount: batch.positions.length / 3,
      projection: mode,
      gridDrawn,
    };
  }

  private bindAttributes(compiled: CompiledProgram): void {
    const device = this.device;
    const stride = VERTEX_FLOATS * 4;

    if (compiled.position >= 0) {
      device.enableVertexAttribArray(compiled.position);
      device.vertexAttribPointer(compiled.position, 3, GpuConstant.FLOAT, false, stride, 0);
    }

    if (compiled.normal >= 0) {
      device.enableVertexAttribArray(compiled.normal);
      device.vertexAttribPointer(compiled.normal, 3, GpuConstant.FLOAT, false, stride, 12);
    }

    if (compiled.color >= 0) {
      device.enableVertexAttribArray(compiled.color);
      device.vertexAttribPointer(compiled.color, 4, GpuConstant.FLOAT, false, stride, 24);
    }
  }

  /** Releases GPU resources. Safe to call more than once. */
  dispose(): void {
    if (this.vertexBuffer) {
      this.device.deleteBuffer(this.vertexBuffer);
      this.vertexBuffer = null;
    }
    if (this.indexBuffer) {
      this.device.deleteBuffer(this.indexBuffer);
      this.indexBuffer = null;
    }
    if (this.compiled) {
      this.device.deleteProgram(this.compiled.program);
      this.compiled = null;
    }
    this.gridMesh = null;
    this.gridMode = null;
    this.device.reset();
  }
}

/* ------------------------------------------------------------------ helpers */

/** Appends a mesh with a constant colour into a batch. */
/**
 * Appends a mesh into the batch with a constant colour, applying an offset and
 * uniform scale. Positions, normals and colours stay parallel, and indices are
 * rebased so the batch remains a single valid index buffer.
 */
function appendColored(
  batch: MeshBatch,
  mesh: { positions: number[]; normals: number[]; indices: number[] },
  color: readonly [number, number, number],
  alpha: number,
  offset: readonly [number, number, number] = [0, 0, 0],
  scale = 1,
): void {
  if (mesh.positions.length === 0) return;

  const base = batch.positions.length / 3;

  for (let i = 0; i < mesh.positions.length; i += 3) {
    batch.positions.push(
      offset[0] + mesh.positions[i] * scale,
      offset[1] + mesh.positions[i + 1] * scale,
      offset[2] + mesh.positions[i + 2] * scale,
    );
    batch.normals.push(mesh.normals[i], mesh.normals[i + 1], mesh.normals[i + 2]);
    batch.colors.push(color[0], color[1], color[2], alpha);
  }

  for (const index of mesh.indices) {
    batch.indices.push(base + index);
  }
}

/**
 * Brightness multiplier for a host's cyber state.
 *
 * Hosts in an active state breathe on a slow sine so the viewport reads as
 * live rather than as a static diagram. The phase is derived from the host id,
 * so a network does not pulse in lockstep and each host keeps the same phase
 * between frames. Clean hosts stay steady — animating everything would make
 * the animation carry no information.
 */
function statePulse(metadata: Record<string, unknown>, time: number, hostId: string): number {
  const phase = hashPhase(hostId);

  if (metadata.isAttackerPosition === true) {
    return 1 + 0.16 * Math.sin(time * 2.6 + phase);
  }
  if (metadata.compromised === true || metadata.alerted === true) {
    return 1 + 0.14 * Math.sin(time * 2.1 + phase);
  }
  if (metadata.isolated === true) {
    return 1 + 0.07 * Math.sin(time * 1.4 + phase);
  }
  return 1;
}

/** A stable 0..2π phase per host id, so a host's pulse is frame-to-frame stable. */
function hashPhase(hostId: string): number {
  let hash = 0;
  for (let index = 0; index < hostId.length; index += 1) {
    hash = (hash * 31 + hostId.charCodeAt(index)) % 100003;
  }
  return (hash / 100003) * Math.PI * 2;
}

interface CameraBasis {
  right: readonly [number, number, number];
  up: readonly [number, number, number];
}

/**
 * The camera's right and up axes, read from a column-major view matrix.
 *
 * For V = R * T the rotation part holds the camera axes in its rows, which in
 * column-major storage are elements 0/4/8 (right) and 1/5/9 (up). Used to
 * billboard the selection halo so it faces the viewer instead of lying flat on
 * the world XZ plane, where an orbiting camera would see it edge-on and it
 * would vanish.
 */
function cameraBasis(view: Mat4): CameraBasis {
  return {
    right: normalize3(view[0], view[4], view[8]),
    up: normalize3(view[1], view[5], view[9]),
  };
}

/**
 * Appends a halo ring around a host.
 *
 * In 3D the ring is spanned by the camera axes so it always faces the viewer;
 * in the flat projections it stays in the XY plane, which is already the screen
 * plane. Rings are used rather than line loops because `gl.lineWidth` is
 * clamped to 1px by most drivers.
 */
function appendHalo(
  batch: MeshBatch,
  ring: { positions: number[]; normals: number[]; indices: number[] },
  position: readonly [number, number, number],
  scale: number,
  color: readonly [number, number, number],
  alpha: number,
  basis: CameraBasis | null,
): void {
  if (ring.positions.length === 0) return;

  const right: readonly [number, number, number] = basis ? basis.right : [1, 0, 0];
  const up: readonly [number, number, number] = basis ? basis.up : [0, 1, 0];
  const normal: readonly [number, number, number] = basis ? cross3(right, up) : [0, 0, 1];

  const base = batch.positions.length / 3;

  for (let i = 0; i < ring.positions.length; i += 3) {
    const along = ring.positions[i] * scale;
    const across = ring.positions[i + 1] * scale;

    batch.positions.push(
      position[0] + right[0] * along + up[0] * across,
      position[1] + right[1] * along + up[1] * across,
      position[2] + right[2] * along + up[2] * across,
    );
    batch.normals.push(normal[0], normal[1], normal[2]);
    batch.colors.push(color[0], color[1], color[2], alpha);
  }

  for (const index of ring.indices) {
    batch.indices.push(base + index);
  }
}

/** A flat quad joining two points, for links in the 2D projections. */
function appendLinkQuad(
  batch: MeshBatch,
  from: readonly [number, number, number],
  to: readonly [number, number, number],
  thickness: number,
  color: readonly [number, number, number],
  alpha: number,
): void {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const length = Math.hypot(dx, dy);
  if (length < 1e-6) return;

  // Perpendicular in the XY plane, half-thickness each side.
  const px = (-dy / length) * (thickness / 2);
  const py = (dx / length) * (thickness / 2);

  const quad = {
    positions: [
      from[0] + px, from[1] + py, 0,
      to[0] + px, to[1] + py, 0,
      to[0] - px, to[1] - py, 0,
      from[0] - px, from[1] - py, 0,
    ],
    normals: [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1],
    indices: [0, 1, 2, 0, 2, 3],
  };

  appendColored(batch, quad, color, alpha);
}

/** Packs positions, normals and colours into one interleaved vertex buffer. */
function interleave(batch: MeshBatch): Float32Array {
  const colors = batch.colors;
  const vertexCount = batch.positions.length / 3;
  const out = new Float32Array(vertexCount * VERTEX_FLOATS);

  for (let i = 0; i < vertexCount; i += 1) {
    const p = i * 3;
    const c = i * 4;
    const o = i * VERTEX_FLOATS;

    out[o] = batch.positions[p];
    out[o + 1] = batch.positions[p + 1];
    out[o + 2] = batch.positions[p + 2];
    out[o + 3] = batch.normals[p];
    out[o + 4] = batch.normals[p + 1];
    out[o + 5] = batch.normals[p + 2];
    out[o + 6] = colors[c] ?? 1;
    out[o + 7] = colors[c + 1] ?? 1;
    out[o + 8] = colors[c + 2] ?? 1;
    out[o + 9] = colors[c + 3] ?? 1;
  }

  return out;
}

/** Convenience: builds the combined projection*view matrix for a camera. */
export interface CameraMatrices {
  view: Mat4;
  projection: Mat4;
}

/**
 * Builds the view and projection matrices for a camera.
 *
 * `extent` is the world half-extent the view should frame. Passing it makes the
 * network fill the viewport; omitting it falls back to a default extent. This
 * is the single source of truth for the camera: the renderer uploads these
 * matrices and the Studio projects labels and pointer hits through
 * `computeViewProjection`, which multiplies them, so the two cannot disagree.
 */
export function computeCameraMatrices(
  camera: GpuSceneCamera,
  mode: GpuProjectionMode,
  extent?: { halfWidth: number; halfHeight: number },
): CameraMatrices {
  const projection = createMat4();
  const view = createMat4();
  const aspect = camera.height > 0 ? camera.width / camera.height : 1;
  const zoom = Math.max(0.05, camera.zoom);

  if (mode === '3d') {
    // Fit the orbit distance to the layout so the ring fills the frame.
    const fit = (extent ?? computeLayoutExtent(9, mode)).halfHeight;
    // To frame a half-extent h at distance d with vertical half-FOV t, the
    // visible half-height at the target plane is d * tan(t). Solving for d
    // gives d = h / tan(t) = h * fovScale. The 1.15 leaves breathing room.
    const fovScale = 1 / Math.tan(((50 * Math.PI) / 180) / 2);
    const fitted = fit * 1.15 * fovScale;
    // camera.distance is a zoom multiplier relative to the fitted framing, so
    // the network fills the frame at the default and scales predictably.
    const distance = Math.max(4, fitted * (camera.distance / DEFAULT_ORBIT_DISTANCE));

    perspective(projection, (50 * Math.PI) / 180, aspect, 0.1, 400);
    lookAt(
      view,
      [
        camera.target[0] + distance * Math.cos(camera.pitch) * Math.sin(camera.yaw),
        camera.target[1] + distance * Math.sin(camera.pitch),
        camera.target[2] + distance * Math.cos(camera.pitch) * Math.cos(camera.yaw),
      ],
      camera.target,
      [0, 1, 0],
    );
  } else if (mode === '2.5d') {
    const fit = extent ?? computeLayoutExtent(9, mode);
    // Honour the wider of the two axes so nothing is cropped, and leave room
    // for the tilt.
    const halfHeight = Math.max(fit.halfHeight, fit.halfWidth / aspect) * 1.25 / zoom;

    orthographic(projection, -halfHeight * aspect, halfHeight * aspect, -halfHeight, halfHeight, -200, 200);

    const pitch = 0.62;
    const yaw = 0.5;
    const distance = 40;
    lookAt(
      view,
      [
        camera.panX + distance * Math.cos(pitch) * Math.sin(yaw),
        camera.panY + distance * Math.sin(pitch),
        distance * Math.cos(pitch) * Math.cos(yaw),
      ],
      [camera.panX, camera.panY, 0],
      [0, 1, 0],
    );
  } else {
    const fit = extent ?? computeLayoutExtent(9, mode);
    const halfHeight = Math.max(fit.halfHeight, fit.halfWidth / aspect) / zoom;

    orthographic(projection, -halfHeight * aspect, halfHeight * aspect, -halfHeight, halfHeight, -200, 200);

    const panScale = 1 / zoom;
    view.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -camera.panX * panScale, -camera.panY * panScale, 0, 1]);
  }

  return { view, projection };
}

/** The combined view*projection matrix, derived from computeCameraMatrices. */
export function computeViewProjection(
  camera: GpuSceneCamera,
  mode: GpuProjectionMode,
  extent?: { halfWidth: number; halfHeight: number },
): Mat4 {
  const { view, projection } = computeCameraMatrices(camera, mode, extent);
  return multiply(createMat4(), projection, view);
}

/** Exposed for tests and for the Studio's hit-testing projection. */
export { rotationFromUp };
