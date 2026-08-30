import { describe, expect, it } from 'vitest';

import { layoutHostPosition, type GpuProjectionMode } from '@cyre/engine';

import {
  MIN_PICK_RADIUS_PX,
  computeDragBasis,
  dragWorldDelta,
  hitTestHost,
  isDragGesture,
  offsetHosts,
  projectHosts,
  resolveSelection,
} from './viewportInteraction';

import type { DragBasis, HostProjection } from './viewportInteraction';

import type { GpuSceneCamera } from '@cyre/engine';

const SIZE = { width: 1280, height: 720 };

function camera(overrides: Partial<GpuSceneCamera> = {}): GpuSceneCamera {
  return {
    width: SIZE.width,
    height: SIZE.height,
    panX: 0,
    panY: 0,
    zoom: 1,
    yaw: 0.7,
    pitch: 0.55,
    distance: 20,
    target: [0, 0, 0],
    ...overrides,
  };
}

function hosts(count: number): Array<{ id: string; metadata: Record<string, unknown> }> {
  return Array.from({ length: count }, (_, index) => ({
    id: `host-${index}`,
    metadata: { compromised: index % 3 === 0, isolated: index === 2 },
  }));
}

const MODES: GpuProjectionMode[] = ['2d', '2.5d', '3d'];

describe('projectHosts', () => {
  it('projects every host onto the screen in all three modes', () => {
    const nodes = hosts(9);

    for (const mode of MODES) {
      const projections = projectHosts(nodes, camera(), mode, SIZE);

      expect(projections).toHaveLength(9);
      projections.forEach((projection) => {
        expect(projection.visible).toBe(true);
        expect(projection.x).toBeGreaterThan(-SIZE.width);
        expect(projection.x).toBeLessThan(SIZE.width * 2);
        expect(projection.y).toBeGreaterThan(-SIZE.height);
        expect(projection.y).toBeLessThan(SIZE.height * 2);
        expect(Number.isFinite(projection.pickRadius)).toBe(true);
      });
    }
  });

  it('gives every host a distinct screen position', () => {
    const nodes = hosts(9);

    for (const mode of MODES) {
      const positions = projectHosts(nodes, camera(), mode, SIZE).map(
        (projection) => `${projection.x.toFixed(3)},${projection.y.toFixed(3)}`,
      );
      expect(new Set(positions).size).toBe(9);
    }
  });

  it('never returns a pick radius below the usable minimum', () => {
    const nodes = hosts(6);

    for (const mode of MODES) {
      projectHosts(nodes, camera({ zoom: 0.2 }), mode, SIZE).forEach((projection) => {
        expect(projection.pickRadius).toBeGreaterThanOrEqual(MIN_PICK_RADIUS_PX);
      });
    }
  });

  it('projects a dragged host where it was moved to, not where the layout puts it', () => {
    const nodes = hosts(5);
    const overrides = new Map<string, readonly [number, number, number]>([
      ['host-0', [6, -4, 0]],
    ]);

    const laid = projectHosts(nodes, camera(), '2d', SIZE);
    const dragged = projectHosts(nodes, camera(), '2d', SIZE, overrides);

    const movedIndex = nodes.findIndex((node) => node.id === 'host-0');
    expect(dragged[movedIndex]?.x).not.toBeCloseTo(laid[movedIndex]?.x ?? 0, 3);

    // Untouched hosts must not shift.
    expect(dragged[1]?.x).toBeCloseTo(laid[1]?.x ?? 0, 6);
  });

  it('returns nothing for a zero-sized viewport rather than dividing by zero', () => {
    expect(projectHosts(hosts(4), camera(), '3d', { width: 0, height: 0 })).toEqual([]);
  });
});

describe('hitTestHost', () => {
  function ring(): HostProjection[] {
    return [
      { id: 'a', x: 100, y: 100, worldRadius: 1, radiusPx: 14, pickRadius: 20, visible: true, scale: 1 },
      { id: 'b', x: 400, y: 300, worldRadius: 1, radiusPx: 14, pickRadius: 20, visible: true, scale: 1 },
    ];
  }

  it('hits the host under the pointer', () => {
    expect(hitTestHost({ x: 400, y: 300 }, ring())).toBe('b');
    expect(hitTestHost({ x: 110, y: 100 }, ring())).toBe('a');
  });

  it('misses when the pointer is outside every pick radius', () => {
    expect(hitTestHost({ x: 900, y: 600 }, ring())).toBeNull();
  });

  it('ignores hosts behind the camera', () => {
    const behind: HostProjection[] = [
      { id: 'ghost', x: 100, y: 100, worldRadius: 1, radiusPx: 14, pickRadius: 50, visible: false, scale: 0 },
    ];
    expect(hitTestHost({ x: 100, y: 100 }, behind)).toBeNull();
  });

  it('picks the nearer of two overlapping hosts', () => {
    const overlapping: HostProjection[] = [
      { id: 'far', x: 100, y: 100, worldRadius: 1, radiusPx: 14, pickRadius: 40, visible: true, scale: 1 },
      { id: 'near', x: 112, y: 100, worldRadius: 1, radiusPx: 14, pickRadius: 40, visible: true, scale: 1 },
    ];
    expect(hitTestHost({ x: 108, y: 100 }, overlapping)).toBe('near');
  });

  it('widens the target when a tolerance is given, for hover', () => {
    const near: HostProjection[] = [
      { id: 'a', x: 100, y: 100, worldRadius: 1, radiusPx: 14, pickRadius: 12, visible: true, scale: 1 },
    ];
    expect(hitTestHost({ x: 100, y: 120 }, near)).toBeNull();
    expect(hitTestHost({ x: 100, y: 120 }, near, 10)).toBe('a');
  });
});

describe('resolveSelection', () => {
  const noShift = { shift: false };
  const shift = { shift: true };

  it('clears the selection when empty space is clicked', () => {
    expect(resolveSelection(['a', 'b'], null, noShift)).toEqual([]);
  });

  it('replaces the selection when an unselected host is clicked', () => {
    expect(resolveSelection(['a', 'b'], 'c', noShift)).toEqual(['c']);
  });

  it('keeps a multi-selection when one of its members is clicked again', () => {
    // Without this the user could never grab a multi-selection to drag it:
    // the click that starts the drag would first collapse it to one host.
    expect(resolveSelection(['a', 'b', 'c'], 'b', noShift)).toEqual(['a', 'b', 'c']);
  });

  it('adds to the selection on shift-click', () => {
    expect(resolveSelection(['a'], 'b', shift)).toEqual(['a', 'b']);
  });

  it('removes from the selection on shift-click of a selected host', () => {
    expect(resolveSelection(['a', 'b'], 'a', shift)).toEqual(['b']);
  });

  it('leaves the selection alone when shift-clicking empty space', () => {
    expect(resolveSelection(['a', 'b'], null, shift)).toEqual(['a', 'b']);
  });

  it('does not duplicate a host already selected on shift-click', () => {
    const result = resolveSelection(['a', 'b'], 'b', shift);
    expect(result).not.toContain('b');
  });
});

describe('isDragGesture', () => {
  it('treats a click as a click', () => {
    expect(isDragGesture({ x: 10, y: 10 }, { x: 12, y: 11 })).toBe(false);
  });

  it('treats real movement as a drag', () => {
    expect(isDragGesture({ x: 10, y: 10 }, { x: 60, y: 40 })).toBe(true);
  });
});

describe('drag maths', () => {
  it('derives a usable basis in every mode', () => {
    for (const mode of MODES) {
      const basis = computeDragBasis(camera(), mode, 9, SIZE);
      expect(basis).not.toBeNull();
      expect(basis?.pixelsPerWorldUnit).toBeGreaterThan(0);
      expect(Number.isFinite(basis?.pixelsPerWorldUnit)).toBe(true);
    }
  });

  it('moves a host by exactly the pointer delta, in every mode', () => {
    const nodes = hosts(6);
    const dxPixels = 90;
    const dyPixels = -55;

    for (const mode of MODES) {
      const world = projectWorld(nodes, mode);
      // Anchor the drag on the plane through the grabbed host, the way an
      // editor drags a picked object.
      const basis = computeDragBasis(
        camera(),
        mode,
        nodes.length,
        SIZE,
        world.get('host-0') ?? [0, 0, 0],
      );
      expect(basis).not.toBeNull();

      const delta = dragWorldDelta(basis as DragBasis, dxPixels, dyPixels);
      const overrides = offsetHosts(new Map(), world, ['host-0'], delta);

      const before = projectHosts(nodes, camera(), mode, SIZE);
      const after = projectHosts(nodes, camera(), mode, SIZE, overrides);

      // The host follows the cursor; everything else stays put.
      expect(after[0]?.x - (before[0]?.x ?? 0)).toBeCloseTo(dxPixels, 4);
      expect(after[0]?.y - (before[0]?.y ?? 0)).toBeCloseTo(dyPixels, 4);
      expect(after[1]?.x).toBeCloseTo(before[1]?.x ?? 0, 6);
    }
  });

  it('is exact in the flat modes without anchoring, and drifts in 3D without it', () => {
    const nodes = hosts(6);
    const dxPixels = 90;

    for (const mode of ['2d', '2.5d'] as const) {
      const basis = computeDragBasis(camera(), mode, nodes.length, SIZE) as DragBasis;
      const delta = dragWorldDelta(basis, dxPixels, 0);
      const after = projectHosts(
        nodes,
        camera(),
        mode,
        SIZE,
        offsetHosts(new Map(), projectWorld(nodes, mode), ['host-0'], delta),
      );
      const before = projectHosts(nodes, camera(), mode, SIZE);

      // Orthographic: depth is irrelevant, so the target plane is exact too.
      expect(after[0]?.x - (before[0]?.x ?? 0)).toBeCloseTo(dxPixels, 4);
    }

    // In perspective the same unanchored basis is only an approximation, which
    // is exactly why `computeDragBasis` accepts an anchor point.
    const basis3d = computeDragBasis(camera(), '3d', nodes.length, SIZE) as DragBasis;
    const world3d = projectWorld(nodes, '3d');
    const after3d = projectHosts(
      nodes,
      camera(),
      '3d',
      SIZE,
      offsetHosts(new Map(), world3d, ['host-0'], dragWorldDelta(basis3d, dxPixels, 0)),
    );
    const before3d = projectHosts(nodes, camera(), '3d', SIZE);
    const drift = Math.abs((after3d[0]?.x ?? 0) - (before3d[0]?.x ?? 0) - dxPixels);

    expect(drift).toBeGreaterThan(0.5);
    expect(drift).toBeLessThan(dxPixels);
  });

  it('moves nothing for a zero delta', () => {
    const basis = computeDragBasis(camera(), '3d', 6, SIZE) as DragBasis;
    expect(dragWorldDelta(basis, 0, 0)).toEqual([0, 0, 0]);
  });

  it('returns null rather than a division by zero for a degenerate viewport', () => {
    expect(computeDragBasis(camera(), '3d', 6, { width: 0, height: 0 })).toBeNull();
  });
});

describe('offsetHosts', () => {
  const positions = new Map<string, readonly [number, number, number]>([
    ['a', [1, 2, 3]],
    ['b', [4, 5, 6]],
  ]);

  it('moves only the named hosts', () => {
    const next = offsetHosts(new Map(), positions, ['a'], [1, 1, 1]);
    expect(next.get('a')).toEqual([2, 3, 4]);
    expect(next.has('b')).toBe(false);
  });

  it('accumulates onto an existing override', () => {
    const previous = new Map<string, readonly [number, number, number]>([['a', [10, 10, 10]]]);
    const next = offsetHosts(previous, positions, ['a'], [1, 0, 0]);
    expect(next.get('a')).toEqual([11, 10, 10]);
  });

  it('preserves overrides for hosts that were not moved', () => {
    const previous = new Map<string, readonly [number, number, number]>([['b', [9, 9, 9]]]);
    const next = offsetHosts(previous, positions, ['a'], [1, 0, 0]);
    expect(next.get('b')).toEqual([9, 9, 9]);
  });

  it('ignores ids that are in neither map', () => {
    const next = offsetHosts(new Map(), positions, ['ghost'], [1, 1, 1]);
    expect(next.size).toBe(0);
  });

  it('refuses to store a non-finite position', () => {
    const next = offsetHosts(
      new Map(),
      positions,
      ['a'],
      [Number.POSITIVE_INFINITY, 0, 0],
    );
    expect(next.has('a')).toBe(false);
  });
});

/** World positions the way the engine lays them out, for drag assertions. */
function projectWorld(
  nodes: readonly { id: string }[],
  mode: GpuProjectionMode,
): Map<string, readonly [number, number, number]> {
  return new Map(
    nodes.map((node, index) => [node.id, layoutHostPosition(index, nodes.length, mode)]),
  );
}
