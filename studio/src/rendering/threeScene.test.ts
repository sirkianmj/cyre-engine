import { describe, expect, it } from 'vitest';

import { CyberSimulation } from '@cyre/engine';

import { CyberWorldAdapter, layoutHostPosition, resolveHostPositions, styleForHostMetadata } from '@cyre/engine';

import { describeThreeScene, geometryForHost, statePulse } from './threeScene';

import type { GpuEmphasis, GpuProjectionMode, GpuRenderOptions } from '@cyre/engine';

import { DEFAULT_GPU_RENDER_OPTIONS } from '@cyre/engine';

function options(overrides: Partial<GpuRenderOptions> = {}): GpuRenderOptions {
  return { ...DEFAULT_GPU_RENDER_OPTIONS, ...overrides };
}

function emphasis(overrides: Partial<GpuEmphasis> = {}): GpuEmphasis {
  return { selectedIds: [], hoveredId: null, time: 0, ...overrides };
}

/** A live incident: compromise, escalation, detection and one containment. */
function incidentGraph() {
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

const MODES: GpuProjectionMode[] = ['2d', '2.5d', '3d'];

describe('geometryForHost', () => {
  it('gives real solids in 3D and discs in the flat modes', () => {
    expect(geometryForHost('database_server', '3d')).toBe('cylinder');
    expect(geometryForHost('admin_workstation', '3d')).toBe('box');
    expect(geometryForHost('internal_network', '3d')).toBe('box');
    expect(geometryForHost('web_server', '3d')).toBe('sphere');

    // A flat top-down view should not pretend a disc is a 3D solid.
    for (const mode of ['2d', '2.5d'] as const) {
      expect(geometryForHost('database_server', mode)).toBe('disc');
      expect(geometryForHost('web_server', mode)).toBe('disc');
    }
  });
});

describe('describeThreeScene', () => {
  it('describes every host and every link the engine scene contains', () => {
    const graph = incidentGraph();

    for (const mode of MODES) {
      const descriptor = describeThreeScene(
        graph.getNodes(),
        graph.getConnections(),
        mode,
        emphasis(),
      );

      expect(descriptor.hosts).toHaveLength(graph.getNodes().length);
      expect(descriptor.links).toHaveLength(graph.getConnections().length);
      expect(descriptor.mode).toBe(mode);
    }
  });

  it('places hosts exactly where the engine renderer places them', () => {
    const graph = incidentGraph();

    for (const mode of MODES) {
      const expected = resolveHostPositions(graph.getNodes(), mode);
      const descriptor = describeThreeScene(
        graph.getNodes(),
        graph.getConnections(),
        mode,
        emphasis(),
      );

      descriptor.hosts.forEach((host) => {
        expect(host.position).toEqual(expected.get(host.id));
      });
    }
  });

  it('colours hosts from the engine style, not its own palette', () => {
    const graph = incidentGraph();
    const descriptor = describeThreeScene(
      graph.getNodes(),
      graph.getConnections(),
      '2d',
      emphasis({ time: 0 }),
    );

    descriptor.hosts.forEach((host) => {
      const node = graph.getNodes().find((candidate) => candidate.id === host.id);
      const style = styleForHostMetadata((node?.metadata ?? {}) as Record<string, unknown>);

      // At time 0 the pulse is not exactly 1, so compare direction and range
      // rather than equality: the Three.js colour must be the engine colour
      // scaled by brightness, never a different hue.
      host.color.forEach((channel, index) => {
        expect(channel).toBeGreaterThan(0);
        expect(channel).toBeLessThanOrEqual(1.35);
        expect(style.color[index]).toBeGreaterThan(0);
      });
    });
  });

  it('marks the isolated host and nothing else', () => {
    const graph = incidentGraph();
    const descriptor = describeThreeScene(
      graph.getNodes(),
      graph.getConnections(),
      '3d',
      emphasis(),
    );

    const isolated = descriptor.hosts.filter((host) => host.isolated);

    expect(isolated.length).toBeGreaterThan(0);
    isolated.forEach((host) => {
      const node = graph.getNodes().find((candidate) => candidate.id === host.id);
      expect((node?.metadata as Record<string, unknown>)?.isolated).toBe(true);
    });
  });

  it('drops the isolation marker when the overlay is off', () => {
    const graph = incidentGraph();
    const descriptor = describeThreeScene(
      graph.getNodes(),
      graph.getConnections(),
      '3d',
      emphasis(),
      null,
      options({ showIsolated: false }),
    );

    expect(descriptor.hosts.some((host) => host.isolated)).toBe(false);
  });

  it('flags selection and hover on the right hosts', () => {
    const graph = incidentGraph();
    const nodes = graph.getNodes();
    const picked = nodes.slice(0, 2).map((node) => node.id);
    const hovered = nodes[3]?.id ?? nodes[0].id;

    const descriptor = describeThreeScene(
      nodes,
      graph.getConnections(),
      '3d',
      emphasis({ selectedIds: picked, hoveredId: hovered }),
    );

    descriptor.hosts.forEach((host) => {
      expect(host.selected).toBe(picked.includes(host.id));
      expect(host.hovered).toBe(host.id === hovered);
    });
  });

  it('lifts a hovered host more than a selected one, as the GPU renderer does', () => {
    const graph = incidentGraph();
    const nodes = graph.getNodes();

    const selected = describeThreeScene(nodes, [], '3d', emphasis({ selectedIds: [nodes[0].id] }));
    const hovered = describeThreeScene(nodes, [], '3d', emphasis({ hoveredId: nodes[0].id }));

    const selectedHost = selected.hosts.find((host) => host.id === nodes[0].id);
    const hoveredHost = hovered.hosts.find((host) => host.id === nodes[0].id);

    expect(hoveredHost?.scale).toBeGreaterThan(selectedHost?.scale ?? 0);
  });

  it('honours dragged positions', () => {
    const graph = incidentGraph();
    const nodes = graph.getNodes();
    const manual: readonly [number, number, number] = [4.5, -2.25, 6];
    const overrides = new Map([[nodes[0].id, manual]]);

    const descriptor = describeThreeScene(nodes, graph.getConnections(), '3d', emphasis(), overrides);
    const moved = descriptor.hosts.find((host) => host.id === nodes[0].id);

    expect(moved?.position).toEqual(manual);
  });

  it('drops links whose endpoints are not in the scene', () => {
    const graph = incidentGraph();
    const descriptor = describeThreeScene(
      graph.getNodes(),
      [
        { source: 'ghost-a', target: 'ghost-b' },
        ...graph.getConnections(),
      ],
      '3d',
      emphasis(),
    );

    expect(descriptor.links).toHaveLength(graph.getConnections().length);
  });

  it('reports the grid flag from the render options', () => {
    const graph = incidentGraph();

    expect(
      describeThreeScene(graph.getNodes(), [], '3d', emphasis(), null, options({ showGrid: true })).grid,
    ).toBe(true);
    expect(
      describeThreeScene(graph.getNodes(), [], '3d', emphasis(), null, options({ showGrid: false })).grid,
    ).toBe(false);
  });

  it('treats a non-finite clock as zero instead of NaN-ing every colour', () => {
    const graph = incidentGraph();
    const descriptor = describeThreeScene(
      graph.getNodes(),
      graph.getConnections(),
      '3d',
      emphasis({ time: Number.NaN }),
    );

    descriptor.hosts.forEach((host) => {
      host.color.forEach((channel) => expect(Number.isFinite(channel)).toBe(true));
      expect(Number.isFinite(host.emissive)).toBe(true);
    });
  });
});

describe('statePulse', () => {
  const clean: Record<string, unknown> = {};
  const compromised: Record<string, unknown> = { compromised: true };

  it('leaves a host in no cyber state completely still', () => {
    for (const time of [0, 0.3, 1.7, 9.9]) {
      expect(statePulse(clean, time, 'host-a')).toBe(1);
    }
  });

  it('moves a compromised host over time', () => {
    const values = new Set([0, 0.25, 0.5, 0.75, 1].map((time) => statePulse(compromised, time, 'h')));
    expect(values.size).toBeGreaterThan(1);
  });

  it('keeps the same phase for the same host across frames', () => {
    expect(statePulse(compromised, 0.5, 'host-x')).toBe(statePulse(compromised, 0.5, 'host-x'));
  });

  it('matches the layout the engine renderer would use', () => {
    // The Three.js renderer must not invent its own placement, so assert the
    // automatic layout it reads is the engine's.
    expect(resolveHostPositions([{ id: 'a' }, { id: 'b' }], '2d').get('b')).toEqual(
      layoutHostPosition(1, 2, '2d'),
    );
  });
});
