import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import * as THREE from 'three';

import { CyberWorldAdapter, SceneGraph, resolveHostPositions } from '@cyre/engine';

import type {
  CyberSimulationState,
  GpuEmphasis,
  GpuProjectionMode,
  GpuRenderOptions,
  GpuSceneCamera,
} from '@cyre/engine';

import {
  DEFAULT_GPU_RENDER_OPTIONS,
  computeCameraMatrices,
  computeLayoutExtent,
} from '@cyre/engine';

import { drawLabels } from '../rendering/labelLayer';
import { describeThreeScene } from '../rendering/threeScene';
import { THREE_EMPHASIS_COLORS } from '../rendering/threeScene';
import {
  computeDragBasis,
  dragWorldDelta,
  hitTestHost,
  isDragGesture,
  offsetHosts,
  projectHosts,
  resolveSelection,
} from '../rendering/viewportInteraction';

import type { DragBasis } from '../rendering/viewportInteraction';

import type { ThreeHostDescriptor } from '../rendering/threeScene';

export interface ThreeViewportProps {
  state: CyberSimulationState | null;
  mode: GpuProjectionMode;
  selection?: readonly string[];
  positionOverrides?: ReadonlyMap<string, readonly [number, number, number]> | null;
  options?: GpuRenderOptions;
  onSelectionChange?: (hostIds: string[]) => void;
  onMoveHosts?: (
    hostIds: readonly string[],
    positions: Map<string, readonly [number, number, number]>,
  ) => void;
  onHostContextMenu?: (event: { x: number; y: number; hostId: string | null }) => void;
  onHoverChange?: (hostId: string | null) => void;
  /** Reports per-frame statistics, mirroring the engine renderer's HUD hook. */
  onFrameStats?: (stats: { nodeCount: number; edgeCount: number; drawCalls: number }) => void;
  onRendererChange?: (renderer: 'gpu' | 'canvas2d' | 'none') => void;
  className?: string;
}

type GestureKind = 'none' | 'camera' | 'hosts';

interface Gesture {
  kind: GestureKind;
  x: number;
  y: number;
  button: number;
  hostIds: readonly string[];
  basis: DragBasis | null;
  startOverrides: Map<string, readonly [number, number, number]>;
}

const NO_GESTURE: Gesture = {
  kind: 'none',
  x: 0,
  y: 0,
  button: 0,
  hostIds: [],
  basis: null,
  startOverrides: new Map(),
};

/**
 * ThreeViewport
 * --------------
 * The alternative WebGL renderer, built on Three.js.
 *
 * It is not a second simulation and not a second layout: it consumes the same
 * `SceneGraph` the engine renderer consumes, places hosts with the engine's own
 * `resolveHostPositions`, colours them with `styleForHostMetadata`, and shares
 * the label layer and the interaction primitives. Switching renderers changes
 * which library turns the scene into pixels and nothing else.
 *
 * When the platform has no WebGL context it says so on screen rather than
 * presenting a blank surface.
 */
export function ThreeViewport({
  state,
  mode,
  selection,
  positionOverrides = null,
  options = DEFAULT_GPU_RENDER_OPTIONS,
  onSelectionChange,
  onMoveHosts,
  onHostContextMenu,
  onHoverChange,
  onFrameStats,
  onRendererChange,
  className,
}: ThreeViewportProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const labelRef = useRef<HTMLCanvasElement | null>(null);

  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);

  const orbitRef = useRef({ yaw: 0.7, pitch: 0.55, distance: 20 });
  const panRef = useRef({ x: 0, y: 0, zoom: 1 });
  const gestureRef = useRef<Gesture>(NO_GESTURE);
  const sessionStartRef = useRef(0);

  const [webglAvailable, setWebglAvailable] = useState(true);
  const [size, setSize] = useState({ width: 1, height: 1 });
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const graph = useMemo(() => (state ? CyberWorldAdapter.toSceneGraph(state) : null), [state]);

  const graphRef = useRef<SceneGraph | null>(graph);
  graphRef.current = graph;

  const optionsRef = useRef<GpuRenderOptions>(options);
  optionsRef.current = options;

  const overridesRef = useRef<ReadonlyMap<string, readonly [number, number, number]> | null>(
    positionOverrides,
  );
  overridesRef.current = positionOverrides;

  const effectiveSelection: readonly string[] = selection ?? [];
  const selectionRef = useRef<readonly string[]>(effectiveSelection);
  selectionRef.current = effectiveSelection;

  const hoveredRef = useRef<string | null>(hoveredId);
  hoveredRef.current = hoveredId;

  const cameraFor = useCallback(
    (width: number, height: number): GpuSceneCamera => ({
      width,
      height,
      panX: panRef.current.x,
      panY: panRef.current.y,
      zoom: panRef.current.zoom,
      yaw: orbitRef.current.yaw,
      pitch: orbitRef.current.pitch,
      distance: orbitRef.current.distance,
      target: [0, 0, 0],
    }),
    [],
  );

  /* ------------------------------------------------------------- setup */

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    } catch {
      setWebglAvailable(false);
      onRendererChange?.('none');
      return;
    }

    renderer.setClearColor(0x0e1116, 1);
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.inset = '0';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    renderer.domElement.setAttribute('data-testid', 'three-viewport-gl');
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 500);

    scene.add(new THREE.AmbientLight(0x9fb4d8, 0.85));
    const key = new THREE.DirectionalLight(0xffffff, 1.5);
    key.position.set(6, 12, 8);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x6f92c8, 0.45);
    fill.position.set(-8, -4, -6);
    scene.add(fill);

    const group = new THREE.Group();
    scene.add(group);

    rendererRef.current = renderer;
    sceneRef.current = scene;
    cameraRef.current = camera;
    groupRef.current = group;

    setWebglAvailable(true);
    onRendererChange?.('gpu');

    const canvas = renderer.domElement;
    const onLost = (event: Event): void => {
      event.preventDefault();
      setWebglAvailable(false);
      onRendererChange?.('none');
    };
    canvas.addEventListener('webglcontextlost', onLost, false);

    return () => {
      canvas.removeEventListener('webglcontextlost', onLost);
      disposeGroup(group);
      renderer.dispose();
      if (canvas.parentNode === container) container.removeChild(canvas);
      rendererRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
      groupRef.current = null;
    };
  }, [onRendererChange]);

  /* ------------------------------------------------------------ sizing */

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resize = (): void => {
      const rect = container.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));

      setSize({ width, height });

      rendererRef.current?.setPixelRatio(window.devicePixelRatio || 1);
      rendererRef.current?.setSize(width, height, false);

      if (cameraRef.current) {
        cameraRef.current.aspect = width / height;
        cameraRef.current.updateProjectionMatrix();
      }

      if (labelRef.current) {
        const ratio = window.devicePixelRatio || 1;
        labelRef.current.width = Math.floor(width * ratio);
        labelRef.current.height = Math.floor(height * ratio);
      }
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  /* -------------------------------------------------------- render loop */

  useEffect(() => {
    let frame = 0;

    const draw = (): void => {
      const renderer = rendererRef.current;
      const threeScene = sceneRef.current;
      const camera = cameraRef.current;
      const group = groupRef.current;

      if (renderer && threeScene && camera && group && webglAvailable) {
        const activeGraph = graphRef.current;
        const now = performance.now() / 1000;
        if (sessionStartRef.current === 0) sessionStartRef.current = now;

        const emphasis: GpuEmphasis = {
          selectedIds: selectionRef.current,
          hoveredId: hoveredRef.current,
          time: now - sessionStartRef.current,
        };

        const descriptor = describeThreeScene(
          activeGraph?.getNodes() ?? [],
          activeGraph?.getConnections() ?? [],
          mode,
          emphasis,
          overridesRef.current,
          optionsRef.current,
        );

        rebuildGroup(group, descriptor, mode);
        positionCamera(camera, cameraFor(size.width, size.height), mode, descriptor.hosts.length);

        renderer.render(threeScene, camera);

        onFrameStats?.({
          nodeCount: descriptor.hosts.length,
          edgeCount: descriptor.links.length,
          drawCalls: renderer.info.render.calls,
        });
      }

      drawLabels(
        labelRef.current,
        graphRef.current,
        cameraFor(size.width, size.height),
        mode,
        optionsRef.current,
        {
          selectedIds: selectionRef.current,
          hoveredId: hoveredRef.current,
          time: 0,
        },
        overridesRef.current,
      );

      frame = requestAnimationFrame(draw);
    };

    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [cameraFor, mode, onFrameStats, size.height, size.width, webglAvailable]);

  /* ------------------------------------------------------- interaction */

  const localPoint = useCallback((event: { clientX: number; clientY: number }) => {
    const container = containerRef.current;
    if (!container) return { x: 0, y: 0, width: 1, height: 1 };

    const rect = container.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      width: rect.width,
      height: rect.height,
    };
  }, []);

  const pickHost = useCallback(
    (x: number, y: number, viewport: { width: number; height: number }, tolerance = 0) => {
      const activeGraph = graphRef.current;
      if (!activeGraph) return null;

      const projections = projectHosts(
        activeGraph.getNodes(),
        cameraFor(viewport.width, viewport.height),
        mode,
        { width: viewport.width, height: viewport.height },
        overridesRef.current,
      );

      return hitTestHost({ x, y }, projections, tolerance);
    },
    [cameraFor, mode],
  );

  const publishSelection = useCallback(
    (next: readonly string[]): void => {
      onSelectionChange?.([...next]);
    },
    [onSelectionChange],
  );

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>): void => {
      const point = localPoint(event);
      event.currentTarget.setPointerCapture(event.pointerId);

      if (event.button === 2) {
        gestureRef.current = NO_GESTURE;
        return;
      }

      const picked = pickHost(point.x, point.y, point);

      if (event.button === 0 && picked) {
        const next = resolveSelection(selectionRef.current, picked, { shift: event.shiftKey });
        publishSelection(next);

        const dragged =
          selectionRef.current.includes(picked) && !event.shiftKey ? next : [picked];

        const world = resolveHostPositions(
          graphRef.current?.getNodes() ?? [],
          mode,
          overridesRef.current,
        );

        gestureRef.current = {
          kind: 'hosts',
          x: point.x,
          y: point.y,
          button: event.button,
          hostIds: dragged,
          basis: computeDragBasis(
            cameraFor(point.width, point.height),
            mode,
            graphRef.current?.getNodes().length ?? 0,
            { width: point.width, height: point.height },
            (world.get(picked) ?? [0, 0, 0]) as readonly [number, number, number],
          ),
          startOverrides: new Map(overridesRef.current ?? []),
        };
        return;
      }

      gestureRef.current = {
        ...NO_GESTURE,
        kind: 'camera',
        x: point.x,
        y: point.y,
        button: event.button,
      };
    },
    [cameraFor, localPoint, mode, pickHost, publishSelection],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>): void => {
      const point = localPoint(event);
      const gesture = gestureRef.current;

      if (gesture.kind === 'none') {
        const hovered = pickHost(point.x, point.y, point, 4);
        if (hovered !== hoveredRef.current) {
          hoveredRef.current = hovered;
          setHoveredId(hovered);
          onHoverChange?.(hovered);
        }
        return;
      }

      if (gesture.kind === 'hosts') {
        if (!isDragGesture({ x: gesture.x, y: gesture.y }, { x: point.x, y: point.y })) return;
        if (!gesture.basis) return;

        onMoveHosts?.(
          gesture.hostIds,
          offsetHosts(
            gesture.startOverrides,
            resolveHostPositions(graphRef.current?.getNodes() ?? [], mode, null),
            gesture.hostIds,
            dragWorldDelta(gesture.basis, point.x - gesture.x, point.y - gesture.y),
          ),
        );
        return;
      }

      const dx = point.x - gesture.x;
      const dy = point.y - gesture.y;
      gestureRef.current = { ...gesture, x: point.x, y: point.y };

      if (mode === '3d') {
        if (gesture.button === 0) {
          orbitRef.current = {
            ...orbitRef.current,
            yaw: orbitRef.current.yaw + dx * 0.008,
            pitch: Math.max(-1.4, Math.min(1.4, orbitRef.current.pitch + dy * 0.008)),
          };
        } else {
          orbitRef.current = {
            ...orbitRef.current,
            distance: Math.max(6, orbitRef.current.distance + dy * orbitRef.current.distance * 0.0016),
          };
        }
        return;
      }

      const zoom = panRef.current.zoom;
      panRef.current = {
        ...panRef.current,
        x: panRef.current.x + dx / zoom,
        y: panRef.current.y + dy / zoom,
      };
    },
    [localPoint, mode, onHoverChange, onMoveHosts, pickHost],
  );

  const onPointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>): void => {
      const gesture = gestureRef.current;
      const point = localPoint(event);
      gestureRef.current = NO_GESTURE;

      if (gesture.kind !== 'camera') return;
      if (isDragGesture({ x: gesture.x, y: gesture.y }, { x: point.x, y: point.y })) return;

      publishSelection(resolveSelection(selectionRef.current, null, { shift: event.shiftKey }));
    },
    [localPoint, publishSelection],
  );

  const onWheel = useCallback(
    (event: React.WheelEvent<HTMLDivElement>): void => {
      const factor = event.deltaY > 0 ? 0.9 : 1.1;

      if (mode === '3d') {
        orbitRef.current = {
          ...orbitRef.current,
          distance: Math.max(6, Math.min(80, orbitRef.current.distance / factor)),
        };
        return;
      }

      panRef.current = {
        ...panRef.current,
        zoom: Math.max(0.3, Math.min(4, panRef.current.zoom * factor)),
      };
    },
    [mode],
  );

  const draggingHosts = gestureRef.current.kind === 'hosts';

  return (
    <div
      ref={containerRef}
      className={className}
      data-testid="three-viewport"
      data-renderer={webglAvailable ? 'three-webgl' : 'none'}
      data-mode={mode}
      data-hovered-host={hoveredId ?? ''}
      data-selected-count={effectiveSelection.length}
      data-selected-hosts={effectiveSelection.join(' ')}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={() => {
        gestureRef.current = NO_GESTURE;
        if (hoveredRef.current !== null) {
          hoveredRef.current = null;
          setHoveredId(null);
          onHoverChange?.(null);
        }
      }}
      onPointerCancel={() => {
        gestureRef.current = NO_GESTURE;
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        const point = localPoint(event);
        onHostContextMenu?.({ x: point.x, y: point.y, hostId: pickHost(point.x, point.y, point) });
      }}
      onWheel={onWheel}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        cursor: draggingHosts ? 'grabbing' : hoveredId ? 'pointer' : 'default',
        touchAction: 'none',
      }}
    >
      <canvas
        ref={labelRef}
        data-testid="three-viewport-labels"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          display: options.showLabels ? 'block' : 'none',
        }}
      />

      {!webglAvailable ? (
        <div
          data-testid="three-viewport-fallback-notice"
          style={{
            position: 'absolute',
            left: 12,
            bottom: 12,
            padding: '5px 9px',
            borderRadius: 6,
            background: 'rgba(15,18,23,0.85)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: '#d9a441',
            fontSize: 11,
            pointerEvents: 'none',
          }}
        >
          WebGL unavailable — the Three.js renderer cannot start on this platform.
        </div>
      ) : null}
    </div>
  );
}

/* --------------------------------------------------------------- helpers */

function disposeGroup(group: THREE.Group): void {
  for (const child of [...group.children]) {
    group.remove(child);
    disposeObject(child);
  }
}

function disposeObject(object: THREE.Object3D): void {
  if (object instanceof THREE.Mesh) {
    object.geometry.dispose();
    const material = object.material;
    if (Array.isArray(material)) material.forEach((entry) => entry.dispose());
    else material.dispose();
  }
  object.children.forEach(disposeObject);
}

/**
 * Rebuilds the host group from the descriptor.
 *
 * Three.js scene graphs are cheap to rebuild at this scale and doing so keeps
 * this renderer honest: it cannot hold on to a host the simulation has removed
 * or miss one it has added. Geometry and materials are disposed each frame to
 * avoid leaking GPU resources.
 */
function rebuildGroup(
  group: THREE.Group,
  descriptor: ReturnType<typeof describeThreeScene>,
  mode: GpuProjectionMode,
): void {
  disposeGroup(group);

  const flat = mode !== '3d';

  for (const link of descriptor.links) {
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(link.from[0], link.from[1], link.from[2]),
      new THREE.Vector3(link.to[0], link.to[1], link.to[2]),
    ]);
    const material = new THREE.LineBasicMaterial({
      color: new THREE.Color(link.color[0], link.color[1], link.color[2]),
      transparent: true,
      opacity: link.blocked ? 0.95 : 0.5,
    });
    group.add(new THREE.Line(geometry, material));
  }

  for (const host of descriptor.hosts) {
    const mesh = buildHostMesh(host, flat);
    mesh.position.set(host.position[0], host.position[1], host.position[2]);
    mesh.name = host.id;
    group.add(mesh);

    if (host.selected || host.hovered) {
      group.add(buildHalo(host, flat));
    }
    if (host.isolated && !host.selected && !host.hovered) {
      group.add(buildHalo({ ...host, selected: false, hovered: false }, flat, true));
    }
  }

  if (descriptor.grid) {
    group.add(buildGrid(mode));
  }
}

function buildHostMesh(host: ThreeHostDescriptor, flat: boolean): THREE.Mesh {
  const geometry = flat
    ? new THREE.CircleGeometry(1, 40)
    : host.geometry === 'box'
      ? new THREE.BoxGeometry(1.5, 1.5, 1.5)
      : host.geometry === 'cylinder'
        ? new THREE.CylinderGeometry(0.85, 0.85, 1.7, 20)
        : new THREE.SphereGeometry(1, 24, 18);

  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(host.color[0], host.color[1], host.color[2]),
    roughness: 0.45,
    metalness: 0.2,
    transparent: host.opacity < 1,
    opacity: host.opacity,
    // The state pulse drives emissive so a compromised host reads as active
    // even when the base colour is already saturated.
    emissive: new THREE.Color(host.color[0], host.color[1], host.color[2]),
    emissiveIntensity: host.emissive,
    side: flat ? THREE.DoubleSide : THREE.FrontSide,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.scale.setScalar(host.scale);
  return mesh;
}

function buildHalo(host: ThreeHostDescriptor, flat: boolean, isolated = false): THREE.Mesh {
  const tone = isolated
    ? THREE_EMPHASIS_COLORS.isolated
    : host.selected
      ? THREE_EMPHASIS_COLORS.selected
      : THREE_EMPHASIS_COLORS.hover;

  const geometry = new THREE.RingGeometry(1, 1.16, 56);
  const material = new THREE.MeshBasicMaterial({
    color: new THREE.Color(tone[0], tone[1], tone[2]),
    transparent: true,
    opacity: isolated ? 0.55 : host.selected ? 0.85 : 0.6,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const halo = new THREE.Mesh(geometry, material);
  const inner = host.scale * (host.selected ? 1.55 : 1.4);
  halo.scale.setScalar(inner);
  halo.position.set(host.position[0], host.position[1], host.position[2]);

  // A flat ring on the world XZ plane disappears when the camera looks along it,
  // so in 3D the halo is tilted to face a typical orbiting viewer.
  if (!flat && !isolated) halo.rotation.x = -Math.PI / 2.35;
  else if (!flat) halo.rotation.x = -Math.PI / 2;

  return halo;
}

function buildGrid(mode: GpuProjectionMode): THREE.GridHelper {
  const grid = new THREE.GridHelper(30, 30, 0x2a3547, 0x1d2532);
  grid.position.y = mode === '3d' ? -2.5 : -0.01;
  const material = grid.material;
  if (Array.isArray(material)) material.forEach((entry) => (entry.transparent = true));
  else material.transparent = true;
  return grid;
}

/**
 * Places the camera using the engine's own camera matrices.
 *
 * The engine renderer computes its view matrix from `computeCameraMatrices`;
 * decomposing that same matrix here is what stops the two renderers from
 * framing the network differently for the same camera settings.
 */
function positionCamera(
  camera: THREE.PerspectiveCamera,
  engineCamera: GpuSceneCamera,
  mode: GpuProjectionMode,
  nodeCount: number,
): void {
  const extent = computeLayoutExtent(nodeCount, mode);
  const { view, projection } = computeCameraMatrices(engineCamera, mode, extent);

  // Upload the engine's projection verbatim rather than building a Three.js
  // camera from the same numbers, so the two renderers cannot drift apart.
  camera.projectionMatrix.fromArray(projection as unknown as number[]);
  camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();

  // The engine's view matrix maps world→camera; a camera's world matrix is the
  // inverse of that. Taking the transform from the engine's own matrix is what
  // keeps framing identical across renderers for the same camera settings.
  const viewMatrix = new THREE.Matrix4().fromArray(view as unknown as number[]);

  camera.matrixAutoUpdate = false;
  camera.matrix.copy(viewMatrix).invert();
  camera.matrixWorld.copy(camera.matrix);
  camera.matrixWorldInverse.copy(viewMatrix);
}
