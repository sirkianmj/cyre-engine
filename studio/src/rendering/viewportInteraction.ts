import {
  computeCameraMatrices,
  computeLayoutExtent,
  computeViewProjection,
  resolveHostPositions,
  styleForHostMetadata,
} from '@cyre/engine';

import type { GpuProjectionMode, GpuSceneCamera } from '@cyre/engine';

/**
 * Viewport interaction primitives.
 *
 * Everything here is pure and DOM-free so the selection model, hit testing and
 * drag maths can be tested under Node. The React viewport is left to do only
 * what a component should: read pointer events and draw.
 *
 * All screen-space values are CSS pixels relative to the viewport's top-left
 * corner, matching `getBoundingClientRect`.
 */

/** A host projected into screen space, ready for hit testing and labels. */
export interface HostProjection {
  id: string;
  /** Screen X in CSS pixels. */
  x: number;
  /** Screen Y in CSS pixels, origin top-left. */
  y: number;
  /** World-space radius of the host. */
  worldRadius: number;
  /**
   * The host's radius in screen pixels, measured by projecting a point one
   * world radius away along the camera's right axis. This is what labels and
   * pick targets are anchored to, so both stay correct as the camera zooms.
   */
  radiusPx: number;
  /** Pick radius in screen pixels, never smaller than a comfortable target. */
  pickRadius: number;
  /** False when the host is behind the camera or outside the clip volume. */
  visible: boolean;
  /** Relative on-screen size; 1 in the flat projections. */
  scale: number;
}

export interface ViewportSize {
  width: number;
  height: number;
}

export interface PointerModifiers {
  /** Shift: extend or shrink the current selection. */
  shift: boolean;
}

/**
 * The minimum pick radius in CSS pixels.
 *
 * Distant hosts project small, but a 3px target is unusable with a mouse, so
 * picking keeps a floor. Visual size and pick size are therefore allowed to
 * differ, which is the standard trade in every 3D editor.
 */
export const MIN_PICK_RADIUS_PX = 12;

export interface ScreenPoint {
  x: number;
  y: number;
}

interface Projection {
  x: number;
  y: number;
  w: number;
}

function project(
  matrix: ArrayLike<number>,
  world: readonly [number, number, number],
  size: ViewportSize,
): Projection {
  const x = matrix[0] * world[0] + matrix[4] * world[1] + matrix[8] * world[2] + matrix[12];
  const y = matrix[1] * world[0] + matrix[5] * world[1] + matrix[9] * world[2] + matrix[13];
  const w = matrix[3] * world[0] + matrix[7] * world[1] + matrix[11] * world[2] + matrix[15];

  return {
    x: ((x / w + 1) / 2) * size.width,
    y: ((1 - y / w) / 2) * size.height,
    w,
  };
}

/**
 * Projects every host in a scene into screen space.
 *
 * Host positions come from the engine's own `resolveHostPositions`, so a host
 * the user has dragged is picked and labelled where it is actually drawn rather
 * than where the automatic layout would have put it.
 */
export function projectHosts(
  nodes: readonly { id: string; metadata?: unknown }[],
  camera: GpuSceneCamera,
  mode: GpuProjectionMode,
  size: ViewportSize,
  overrides?: ReadonlyMap<string, readonly [number, number, number]> | null,
): HostProjection[] {
  if (size.width <= 0 || size.height <= 0) return [];

  const extent = computeLayoutExtent(nodes.length, mode);
  const matrix = computeViewProjection(camera, mode, extent);
  const { view } = computeCameraMatrices(camera, mode, extent);
  const right = normalize(view[0], view[4], view[8]);
  const positions = resolveHostPositions(nodes, mode, overrides);

  return nodes.map((node) => {
    const world = (positions.get(node.id) ?? [0, 0, 0]) as readonly [number, number, number];
    const worldRadius = styleForHostMetadata(
      (node.metadata ?? {}) as Record<string, unknown>,
    ).radius;

    const degenerate = world.some((component) => !Number.isFinite(component));
    const point = degenerate ? { x: -9999, y: -9999, w: 0 } : project(matrix, world, size);

    const visible = Number.isFinite(point.w) && point.w > 1e-6;

    // Measure the on-screen radius by projecting a point one world radius out
    // along the camera's right axis. Deriving it beats assuming a constant
    // pixels-per-unit, which is wrong the moment the camera zooms or orbits.
    const edge = degenerate
      ? point
      : project(
          matrix,
          [
            world[0] + right[0] * worldRadius,
            world[1] + right[1] * worldRadius,
            world[2] + right[2] * worldRadius,
          ],
          size,
        );
    const radiusPx = visible ? Math.hypot(edge.x - point.x, edge.y - point.y) : 0;

    const scale = mode === '3d' && visible
      ? Math.max(0.35, Math.min(2.4, 14 / point.w))
      : 1;

    return {
      id: node.id,
      x: point.x,
      y: point.y,
      worldRadius,
      radiusPx,
      // A 15% margin around the drawn host, floored so distant hosts stay
      // clickable with a mouse.
      pickRadius: Math.max(MIN_PICK_RADIUS_PX, radiusPx * 1.15),
      visible,
      scale,
    };
  });
}

/**
 * Finds the host under a pointer position.
 *
 * Nearest wins when hosts overlap, so a host drawn in front of another is the
 * one selected. `tolerance` widens every pick radius, used for the more
 * forgiving hover test.
 */
export function hitTestHost(
  point: ScreenPoint,
  projections: readonly HostProjection[],
  tolerance = 0,
): string | null {
  let bestId: string | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const projection of projections) {
    if (!projection.visible) continue;

    const distance = Math.hypot(point.x - projection.x, point.y - projection.y);
    if (distance > projection.pickRadius + tolerance) continue;
    if (distance >= bestDistance) continue;

    bestDistance = distance;
    bestId = projection.id;
  }

  return bestId;
}

/**
 * Applies a click to the current selection.
 *
 * The model matches the desktop editors users already know:
 * - a plain click on empty space clears the selection;
 * - a plain click on a host that is *not* selected replaces the selection;
 * - a plain click on a host that *is* selected keeps the whole selection, so
 *   the user can grab a multi-selection and drag it;
 * - shift-click toggles that host in or out, leaving everything else alone.
 */
export function resolveSelection(
  current: readonly string[],
  pickedId: string | null,
  modifiers: PointerModifiers,
): string[] {
  if (modifiers.shift) {
    if (!pickedId) return [...current];
    return current.includes(pickedId)
      ? current.filter((id) => id !== pickedId)
      : [...current, pickedId];
  }

  if (!pickedId) return [];
  if (current.includes(pickedId)) return [...current];
  return [pickedId];
}

/** Whether a pointer gesture travelled far enough to count as a drag. */
export function isDragGesture(start: ScreenPoint, end: ScreenPoint, thresholdPx = 4): boolean {
  return Math.hypot(end.x - start.x, end.y - start.y) > thresholdPx;
}

/**
 * The camera axes and screen scale needed to convert a pointer drag into world
 * movement.
 *
 * Derived by projecting a unit step along each camera axis rather than by
 * re-deriving the projection, so it stays correct for the orthographic flat
 * modes and the perspective 3D mode alike.
 */
export interface DragBasis {
  right: readonly [number, number, number];
  up: readonly [number, number, number];
  /** Screen pixels covered by one world unit at the target plane. */
  pixelsPerWorldUnit: number;
}

/**
 * Builds the drag basis.
 *
 * `origin` is the world point the drag is anchored at — normally the position
 * of the host the user grabbed, falling back to the camera target. In the
 * perspective 3D mode the on-screen size of a world unit depends on depth, so
 * measuring the scale at the target plane would make a host nearer or farther
 * than the target slide faster or slower than the cursor. Measuring it on the
 * plane through the grabbed host is what makes the drag track the pointer. The
 * flat projections are orthographic, so depth is irrelevant and both choices
 * agree exactly.
 */
export function computeDragBasis(
  camera: GpuSceneCamera,
  mode: GpuProjectionMode,
  nodeCount: number,
  size: ViewportSize,
  origin: readonly [number, number, number] = camera.target,
): DragBasis | null {
  if (size.width <= 0 || size.height <= 0) return null;

  const extent = computeLayoutExtent(nodeCount, mode);
  const { view } = computeCameraMatrices(camera, mode, extent);
  const matrix = computeViewProjection(camera, mode, extent);

  const right = normalize(view[0], view[4], view[8]);
  const up = normalize(view[1], view[5], view[9]);

  const anchor: readonly [number, number, number] = origin.every((c) => Number.isFinite(c))
    ? origin
    : camera.target;

  const originPoint = project(matrix, anchor, size);
  const stepped = project(
    matrix,
    [anchor[0] + right[0], anchor[1] + right[1], anchor[2] + right[2]],
    size,
  );

  const pixelsPerWorldUnit = Math.hypot(
    stepped.x - originPoint.x,
    stepped.y - originPoint.y,
  );
  if (!Number.isFinite(pixelsPerWorldUnit) || pixelsPerWorldUnit <= 1e-6) return null;

  return { right, up, pixelsPerWorldUnit };
}

/**
 * Converts a pointer delta in CSS pixels into a world-space displacement on
 * the camera-facing plane through the target.
 *
 * Screen Y grows downward while the camera's up axis grows upward, so the
 * vertical term is negated. Moving on the camera plane is what makes a drag
 * track the cursor in all three modes instead of sliding along a fixed world
 * axis the user cannot see.
 */
export function dragWorldDelta(
  basis: DragBasis,
  dxPixels: number,
  dyPixels: number,
): readonly [number, number, number] {
  const along = dxPixels / basis.pixelsPerWorldUnit;
  const across = -dyPixels / basis.pixelsPerWorldUnit;

  return [
    basis.right[0] * along + basis.up[0] * across,
    basis.right[1] * along + basis.up[1] * across,
    basis.right[2] * along + basis.up[2] * across,
  ];
}

/**
 * Applies a world displacement to a set of hosts, producing the override map
 * the renderer and the projector both consume.
 */
export function offsetHosts(
  previous: ReadonlyMap<string, readonly [number, number, number]>,
  positions: ReadonlyMap<string, readonly [number, number, number]>,
  hostIds: readonly string[],
  delta: readonly [number, number, number],
): Map<string, readonly [number, number, number]> {
  const next = new Map(previous);

  for (const id of hostIds) {
    const base = previous.get(id) ?? positions.get(id);
    if (!base) continue;

    const moved: readonly [number, number, number] = [
      base[0] + delta[0],
      base[1] + delta[1],
      base[2] + delta[2],
    ];

    if (moved.every((component) => Number.isFinite(component))) {
      next.set(id, moved);
    }
  }

  return next;
}

function normalize(
  x: number,
  y: number,
  z: number,
): readonly [number, number, number] {
  const length = Math.hypot(x, y, z);
  if (length < 1e-9) return [0, 1, 0];
  return [x / length, y / length, z / length];
}
