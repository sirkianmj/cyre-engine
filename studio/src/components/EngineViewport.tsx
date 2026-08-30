import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { CyberWorldAdapter, DEFAULT_GPU_EMPHASIS, GpuSceneRenderer, SceneGraph } from '@cyre/engine';

import type {
  CyberSimulationState,
  GpuEmphasis,
  GpuFrameStats,
  GpuProjectionMode,
  GpuRenderOptions,
  GpuSceneCamera,
} from '@cyre/engine';

import { DEFAULT_GPU_RENDER_OPTIONS, resolveHostPositions } from '@cyre/engine';

import { WebGL2GpuDevice, acquireWebGL2Context } from '../rendering/WebGL2GpuDevice';
import { drawLabels } from '../rendering/labelLayer';
import {
  computeDragBasis,
  dragWorldDelta,
  hitTestHost,
  isDragGesture,
  offsetHosts,
  projectHosts,
  resolveSelection,
} from '../rendering/viewportInteraction';

import type { DragBasis, HostProjection } from '../rendering/viewportInteraction';

export interface EngineViewportProps {
  /** Live cyber state; null renders an empty scene. */
  state: CyberSimulationState | null;
  mode: GpuProjectionMode;
  /** Hosts currently selected, in selection order. */
  selection?: readonly string[];
  /**
   * Manual host positions produced by dragging. They are handed straight to the
   * engine so a dragged host stays where the user put it.
   */
  positionOverrides?: ReadonlyMap<string, readonly [number, number, number]> | null;
  /** Which cyber-state overlays affect the rendered output. */
  options?: GpuRenderOptions;
  /** Called whenever the selection changes, for any reason. */
  onSelectionChange?: (hostIds: string[]) => void;
  /** Called with the new override map as the user drags hosts. */
  onMoveHosts?: (
    hostIds: readonly string[],
    positions: Map<string, readonly [number, number, number]>,
  ) => void;
  /** Right-click; the host under the pointer is null when empty space was hit. */
  onHostContextMenu?: (event: { x: number; y: number; hostId: string | null }) => void;
  /** The host under the pointer, or null. */
  onHoverChange?: (hostId: string | null) => void;

  /** @deprecated Single-selection convenience; `selection` supersedes it. */
  selectedNodeId?: string | null;
  /** @deprecated Kept alongside `onSelectionChange`. */
  onSelectNode?: (nodeId: string | null) => void;

  /** Reports per-frame statistics so the HUD can show real draw counts. */
  onFrameStats?: (stats: GpuFrameStats) => void;
  /** Reports whether the GPU path is active or the canvas fallback is in use. */
  onRendererChange?: (renderer: 'gpu' | 'canvas2d' | 'none') => void;
  className?: string;
}

interface OrbitState {
  yaw: number;
  pitch: number;
  distance: number;
}

interface PanState {
  x: number;
  y: number;
  zoom: number;
}

/** What the pointer is currently doing. */
type GestureKind = 'none' | 'camera' | 'hosts';

interface Gesture {
  kind: GestureKind;
  /** Pointer position in CSS pixels relative to the viewport. */
  x: number;
  y: number;
  button: number;
  /** Hosts being dragged, captured at pointer-down. */
  hostIds: readonly string[];
  /** Drag basis captured at pointer-down, anchored on the grabbed host. */
  basis: DragBasis | null;
  /** Override map as it stood when the drag began. */
  startOverrides: Map<string, readonly [number, number, number]>;
}

const DEFAULT_ORBIT: OrbitState = { yaw: 0.7, pitch: 0.55, distance: 20 };
const DEFAULT_PAN: PanState = { x: 0, y: 0, zoom: 1 };

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
 * EngineViewport
 * ---------------
 * The Studio's rendering surface. It draws through the engine's
 * `GpuSceneRenderer`, which submits real GPU work via `WebGL2GpuDevice`, so
 * 2D, 2.5D and 3D all render from one engine-produced scene description
 * rather than three separate viewport implementations.
 *
 * Interaction is the same in all three modes because it goes through the same
 * projection the renderer uses: a pointer is hit-tested against projected
 * hosts, and a drag is converted to world movement on the camera-facing plane.
 * Nothing here re-derives the projection, so picking, labels and geometry
 * cannot disagree.
 *
 * When the platform provides no WebGL2 context the component falls back to a
 * Canvas2D renderer and says so on screen — it never presents a blank surface
 * as though it were rendering.
 */
export function EngineViewport({
  state,
  mode,
  selection,
  positionOverrides = null,
  options = DEFAULT_GPU_RENDER_OPTIONS,
  onSelectionChange,
  onMoveHosts,
  onHostContextMenu,
  onHoverChange,
  selectedNodeId = null,
  onSelectNode,
  onFrameStats,
  onRendererChange,
  className,
}: EngineViewportProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fallbackRef = useRef<HTMLCanvasElement | null>(null);
  const labelRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const rendererRef = useRef<GpuSceneRenderer | null>(null);
  const fallbackRendererRef = useRef<FallbackRenderer | null>(null);

  const orbitRef = useRef<OrbitState>({ ...DEFAULT_ORBIT });
  const panRef = useRef<PanState>({ ...DEFAULT_PAN });
  const gestureRef = useRef<Gesture>(NO_GESTURE);
  const sessionStartRef = useRef<number>(0);

  const [gpuAvailable, setGpuAvailable] = useState(true);
  const [contextLost, setContextLost] = useState(false);
  const [size, setSize] = useState({ width: 1, height: 1 });
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  /** The engine scene description for the current state. */
  const scene: SceneGraph | null = useMemo(
    () => (state ? CyberWorldAdapter.toSceneGraph(state) : null),
    [state],
  );

  const sceneRef = useRef<SceneGraph | null>(scene);
  sceneRef.current = scene;

  const optionsRef = useRef<GpuRenderOptions>(options);
  optionsRef.current = options;

  const overridesRef = useRef<ReadonlyMap<string, readonly [number, number, number]> | null>(
    positionOverrides,
  );
  overridesRef.current = positionOverrides;

  /**
   * The selection as the render loop sees it. `selection` is authoritative when
   * the parent supplies it; otherwise the single-selection prop is used, so
   * existing callers keep working.
   */
  const effectiveSelection: readonly string[] = selection ?? (selectedNodeId ? [selectedNodeId] : []);
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

  /* ------------------------------------------------------ context setup */

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = acquireWebGL2Context(canvas);
    if (!gl) {
      setGpuAvailable(false);
      onRendererChange?.('canvas2d');
      return;
    }

    const device = new WebGL2GpuDevice(gl);
    const renderer = new GpuSceneRenderer(device);

    rendererRef.current = renderer;
    setGpuAvailable(true);
    setContextLost(false);
    onRendererChange?.('gpu');

    const onLost = (event: Event): void => {
      event.preventDefault();
      setContextLost(true);
      onRendererChange?.('none');
    };
    const onRestored = (): void => {
      setContextLost(false);
      onRendererChange?.('gpu');
    };

    canvas.addEventListener('webglcontextlost', onLost, false);
    canvas.addEventListener('webglcontextrestored', onRestored, false);

    return () => {
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      renderer.dispose();
      rendererRef.current = null;
    };
  }, [onRendererChange]);

  /* ------------------------------------------------------- canvas sizing */

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const fallback = fallbackRef.current;
    if (!container) return;

    const resize = (): void => {
      const rect = container.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));
      const ratio = window.devicePixelRatio || 1;

      setSize({ width, height });

      if (canvas) {
        canvas.width = Math.floor(width * ratio);
        canvas.height = Math.floor(height * ratio);
      }
      if (fallback) {
        fallback.width = Math.floor(width * ratio);
        fallback.height = Math.floor(height * ratio);
      }
      if (labelRef.current) {
        labelRef.current.width = Math.floor(width * ratio);
        labelRef.current.height = Math.floor(height * ratio);
      }
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  /* --------------------------------------------------------- render loop */

  useEffect(() => {
    let frame = 0;

    const draw = (): void => {
      const activeScene = sceneRef.current;
      const now = performance.now() / 1000;
      if (sessionStartRef.current === 0) sessionStartRef.current = now;

      const emphasis: GpuEmphasis = {
        selectedIds: selectionRef.current,
        hoveredId: hoveredRef.current,
        time: now - sessionStartRef.current,
      };

      const camera = cameraFor(size.width, size.height);

      if (gpuAvailable && !contextLost && rendererRef.current) {
        try {
          const stats = rendererRef.current.render(
            activeScene ?? EMPTY_SCENE,
            camera,
            mode,
            optionsRef.current,
            emphasis,
            overridesRef.current,
          );
          onFrameStats?.(stats);
        } catch {
          // A driver-level failure must not leave a silently blank viewport.
          setGpuAvailable(false);
          onRendererChange?.('canvas2d');
        }
      } else if (fallbackRef.current) {
        fallbackRendererRef.current ??= new FallbackRenderer(fallbackRef.current);
        fallbackRendererRef.current.draw(
          activeScene,
          camera,
          mode,
          emphasis,
          overridesRef.current,
          optionsRef.current,
        );
      }

      drawLabels(
        labelRef.current,
        activeScene,
        camera,
        mode,
        optionsRef.current,
        emphasis,
        overridesRef.current,
      );

      frame = requestAnimationFrame(draw);
    };

    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [cameraFor, contextLost, gpuAvailable, mode, onFrameStats, onRendererChange, size.height, size.width]);

  /* -------------------------------------------------------- interaction */

  /** Pointer position in CSS pixels relative to the viewport. */
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

  /** Projects the current scene, honouring any dragged positions. */
  const projectionsFor = useCallback(
    (width: number, height: number): HostProjection[] => {
      const activeScene = sceneRef.current;
      if (!activeScene) return [];

      return projectHosts(
        activeScene.getNodes(),
        cameraFor(width, height),
        mode,
        { width, height },
        overridesRef.current,
      );
    },
    [cameraFor, mode],
  );

  const pickHost = useCallback(
    (x: number, y: number, viewport: { width: number; height: number }, tolerance = 0): string | null =>
      hitTestHost({ x, y }, projectionsFor(viewport.width, viewport.height), tolerance),
    [projectionsFor],
  );

  const publishSelection = useCallback(
    (next: readonly string[]): void => {
      onSelectionChange?.([...next]);
      onSelectNode?.(next.length > 0 ? next[next.length - 1] ?? null : null);
    },
    [onSelectNode, onSelectionChange],
  );

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>): void => {
      const point = localPoint(event);
      event.currentTarget.setPointerCapture(event.pointerId);

      // Right-click is the context menu, never a camera or host gesture.
      if (event.button === 2) {
        gestureRef.current = NO_GESTURE;
        return;
      }

      const picked = pickHost(point.x, point.y, point);

      if (event.button === 0 && picked) {
        const nextSelection = resolveSelection(selectionRef.current, picked, {
          shift: event.shiftKey,
        });
        publishSelection(nextSelection);

        // Dragging a host that is already selected moves the whole selection;
        // dragging a newly picked host moves just that one.
        const dragged = selectionRef.current.includes(picked) && !event.shiftKey
          ? nextSelection
          : [picked];

        const world = resolveHostPositions(
          sceneRef.current?.getNodes() ?? [],
          mode,
          overridesRef.current,
        );
        const anchor = world.get(picked) ?? [0, 0, 0];

        gestureRef.current = {
          kind: 'hosts',
          x: point.x,
          y: point.y,
          button: event.button,
          hostIds: dragged,
          basis: computeDragBasis(
            cameraFor(point.width, point.height),
            mode,
            sceneRef.current?.getNodes().length ?? 0,
            { width: point.width, height: point.height },
            anchor as readonly [number, number, number],
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
        // Hover. A small tolerance makes hosts easier to discover than to
        // click, which is the usual asymmetry in a 3D editor.
        const hovered = pickHost(point.x, point.y, point, 4);
        if (hovered !== hoveredRef.current) {
          hoveredRef.current = hovered;
          setHoveredId(hovered);
          onHoverChange?.(hovered);
        }
        return;
      }

      if (gesture.kind === 'hosts') {
        // `gesture.x/y` is the pointer-down position and is deliberately never
        // updated on this branch, unlike the camera branch. Measuring the delta
        // from the drag origin rather than from the previous move means the host
        // tracks the cursor exactly instead of accumulating rounding error
        // across many small moves.
        if (!isDragGesture({ x: gesture.x, y: gesture.y }, { x: point.x, y: point.y })) return;
        if (!gesture.basis) return;

        const delta = dragWorldDelta(
          gesture.basis,
          point.x - gesture.x,
          point.y - gesture.y,
        );

        const world = resolveHostPositions(
          sceneRef.current?.getNodes() ?? [],
          mode,
          null,
        );

        onMoveHosts?.(
          gesture.hostIds,
          offsetHosts(gesture.startOverrides, world, gesture.hostIds, delta),
        );
        return;
      }

      // Camera gesture.
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
          const scale = orbitRef.current.distance * 0.0016;
          orbitRef.current = {
            ...orbitRef.current,
            distance: Math.max(6, orbitRef.current.distance + dy * scale),
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

      // A click on empty space that was not a camera drag clears the selection.
      publishSelection(resolveSelection(selectionRef.current, null, { shift: event.shiftKey }));
    },
    [localPoint, publishSelection],
  );

  const onContextMenu = useCallback(
    (event: React.MouseEvent<HTMLDivElement>): void => {
      event.preventDefault();
      const point = localPoint(event);

      onHostContextMenu?.({
        x: point.x,
        y: point.y,
        hostId: pickHost(point.x, point.y, point),
      });
    },
    [localPoint, onHostContextMenu, pickHost],
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

  const active = gpuAvailable && !contextLost;
  const draggingHosts = gestureRef.current.kind === 'hosts';

  return (
    <div
      ref={containerRef}
      className={className}
      data-testid="engine-viewport"
      data-renderer={contextLost ? 'lost' : gpuAvailable ? 'gpu' : 'canvas2d'}
      data-mode={mode}
      data-hovered-host={hoveredId ?? ''}
      data-selected-count={effectiveSelection.length}
      data-selected-hosts={effectiveSelection.join(' ')}
      data-cursor={draggingHosts ? 'grabbing' : hoveredId ? 'pointer' : 'default'}
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
      onContextMenu={onContextMenu}
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
        ref={canvasRef}
        data-testid="engine-viewport-gl"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          display: active ? 'block' : 'none',
        }}
      />
      <canvas
        ref={labelRef}
        data-testid="engine-viewport-labels"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          display: options.showLabels ? 'block' : 'none',
        }}
      />
      <canvas
        ref={fallbackRef}
        data-testid="engine-viewport-canvas2d"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          display: active ? 'none' : 'block',
        }}
      />

      {!active ? (
        <div
          data-testid="engine-viewport-fallback-notice"
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
          {contextLost
            ? 'WebGL context lost — waiting for the driver to restore it.'
            : 'WebGL2 unavailable — rendering through the Canvas2D fallback.'}
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ helpers */

/** An empty scene, so the renderer still clears the frame with no state. */
const EMPTY_SCENE = new SceneGraph();

/* --------------------------------------------------------- canvas fallback */

/**
 * Canvas2D fallback renderer, used only when the platform has no WebGL2
 * context. It draws the same engine scene description so the topology remains
 * readable instead of presenting a blank surface.
 */
class FallbackRenderer {
  private readonly canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  draw(
    scene: SceneGraph | null,
    camera: GpuSceneCamera,
    mode: GpuProjectionMode,
    emphasis: GpuEmphasis = DEFAULT_GPU_EMPHASIS,
    overrides: ReadonlyMap<string, readonly [number, number, number]> | null = null,
    options: GpuRenderOptions = DEFAULT_GPU_RENDER_OPTIONS,
  ): void {
    const context = this.canvas.getContext('2d');
    if (!context) return;

    const ratio = window.devicePixelRatio || 1;
    const width = this.canvas.width / ratio;
    const height = this.canvas.height / ratio;

    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);
    context.fillStyle = '#0b0d10';
    context.fillRect(0, 0, width, height);

    if (!scene) return;

    const nodes = scene.getNodes();
    const projections = projectHosts(nodes, camera, mode, { width, height }, overrides);
    const byId = new Map(projections.map((projection) => [projection.id, projection]));
    const selected = new Set(emphasis.selectedIds);

    context.lineWidth = 1.5;
    for (const connection of scene.getConnections()) {
      const source = byId.get(connection.source);
      const target = byId.get(connection.target);
      if (!source || !target || !source.visible || !target.visible) continue;

      context.strokeStyle =
        connection.type === 'blocked' ? 'rgba(217,102,106,0.95)' : 'rgba(107,133,168,0.6)';
      context.beginPath();
      context.moveTo(source.x, source.y);
      context.lineTo(target.x, target.y);
      context.stroke();
    }

    nodes.forEach((node, index) => {
      const projection = projections[index];
      if (!projection || !projection.visible) return;

      const metadata = (node.metadata ?? {}) as Record<string, unknown>;
      const isSelected = selected.has(node.id);
      const isHovered = emphasis.hoveredId === node.id;
      const radius = Math.max(6, projection.radiusPx * (isSelected ? 1.08 : isHovered ? 1.16 : 1));

      context.beginPath();
      context.arc(projection.x, projection.y, radius, 0, Math.PI * 2);
      if (options.showWireframe) {
        context.lineWidth = 2;
        context.strokeStyle = fallbackColor(metadata, options);
        context.stroke();
      } else {
        context.fillStyle = fallbackColor(metadata, options);
        context.fill();
      }

      // Selection and hover halos mirror the GPU renderer so the fallback does
      // not silently lose the interaction affordances.
      if (isSelected || isHovered) {
        context.beginPath();
        context.arc(projection.x, projection.y, radius * 1.55, 0, Math.PI * 2);
        context.strokeStyle = isSelected
          ? 'rgba(158,220,255,0.85)'
          : 'rgba(133,178,235,0.6)';
        context.lineWidth = isSelected ? 2 : 1.5;
        context.stroke();
      }

      if (options.showIsolated && metadata.isolated === true) {
        context.beginPath();
        context.arc(projection.x, projection.y, radius * 1.4, 0, Math.PI * 2);
        context.strokeStyle = 'rgba(242,199,82,0.65)';
        context.lineWidth = 1.5;
        context.stroke();
      }

      // Labels are drawn by the dedicated label layer, which sits above both
      // the GPU surface and this fallback. Drawing them here too would double
      // every label whenever WebGL2 is unavailable.
    });
  }
}

function fallbackColor(metadata: Record<string, unknown>, options: GpuRenderOptions): string {
  if (metadata.isAttackerPosition === true) return 'rgba(255,191,77,0.95)';
  if (options.showIsolated && metadata.isolated === true) return 'rgba(217,164,65,0.9)';
  if (options.showCompromised && metadata.compromised === true) return 'rgba(229,101,111,0.95)';
  if (options.showAlerts && metadata.alerted === true) return 'rgba(255,107,122,0.95)';
  if (options.showEvidence && metadata.hasEvidence === true) return 'rgba(126,178,222,0.95)';
  if (metadata.isObjectiveTarget === true) return 'rgba(140,217,140,0.95)';
  return 'rgba(79,164,255,0.9)';
}
