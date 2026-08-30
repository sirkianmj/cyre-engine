import {
  CYBER_STATE_COLORS,
  EMPHASIS_COLORS,
  resolveHostPositions,
  styleForHostMetadata,
} from '@cyre/engine';

import type { GpuEmphasis, GpuProjectionMode, GpuRenderOptions } from '@cyre/engine';

import { DEFAULT_GPU_RENDER_OPTIONS } from '@cyre/engine';

/**
 * Three.js scene description.
 *
 * The Three.js renderer is an *alternative* to the engine GPU renderer, not a
 * parallel implementation of the simulation. Both start from the same
 * `SceneGraph` produced by `CyberWorldAdapter`, use the engine's own
 * `resolveHostPositions` for placement and `styleForHostMetadata` for colour,
 * so switching renderers cannot change what is being shown — only how it is
 * drawn.
 *
 * The mapping from scene graph to draw description is kept here as plain data so
 * it can be tested under Node, where no WebGL context exists. The React
 * component then turns this description into real Three.js objects.
 */

export type ThreeHostGeometry = 'sphere' | 'box' | 'cylinder' | 'disc';

export interface ThreeHostDescriptor {
  id: string;
  name: string;
  geometry: ThreeHostGeometry;
  position: readonly [number, number, number];
  /** Uniform scale applied to a unit primitive. */
  scale: number;
  color: readonly [number, number, number];
  opacity: number;
  selected: boolean;
  hovered: boolean;
  /** Draws an isolation ring around the host. */
  isolated: boolean;
  /** Emissive strength for the state pulse. */
  emissive: number;
}

export interface ThreeLinkDescriptor {
  id: string;
  from: readonly [number, number, number];
  to: readonly [number, number, number];
  color: readonly [number, number, number];
  blocked: boolean;
}

export interface ThreeSceneDescriptor {
  mode: GpuProjectionMode;
  hosts: ThreeHostDescriptor[];
  links: ThreeLinkDescriptor[];
  grid: boolean;
  selectedIds: readonly string[];
  hoveredId: string | null;
}

interface SceneNodeLike {
  id: string;
  name: string;
  type?: string;
  metadata?: unknown;
}

interface SceneConnectionLike {
  id?: string;
  source: string;
  target: string;
  type?: string;
}

/**
 * Chooses the primitive for a host.
 *
 * 3D gets real solids; the flat projections get a disc, which is the correct
 * primitive for an orthographic top-down view rather than a 3D shape flattened
 * to look like one.
 */
export function geometryForHost(
  hostType: string,
  mode: GpuProjectionMode,
): ThreeHostGeometry {
  if (mode !== '3d') return 'disc';
  if (hostType === 'database_server') return 'cylinder';
  if (hostType === 'admin_workstation' || hostType === 'internal_network') return 'box';
  return 'sphere';
}

/**
 * The same state pulse the engine GPU renderer applies, so the two renderers
 * animate identically instead of one being live and the other static.
 */
export function statePulse(metadata: Record<string, unknown>, time: number, hostId: string): number {
  let hash = 0;
  for (let index = 0; index < hostId.length; index += 1) {
    hash = (hash * 31 + hostId.charCodeAt(index)) % 100003;
  }
  const phase = (hash / 100003) * Math.PI * 2;

  if (metadata.isAttackerPosition === true) return 1 + 0.16 * Math.sin(time * 2.6 + phase);
  if (metadata.compromised === true || metadata.alerted === true) {
    return 1 + 0.14 * Math.sin(time * 2.1 + phase);
  }
  if (metadata.isolated === true) return 1 + 0.07 * Math.sin(time * 1.4 + phase);
  return 1;
}

export function describeThreeScene(
  nodes: readonly SceneNodeLike[],
  connections: readonly SceneConnectionLike[],
  mode: GpuProjectionMode,
  emphasis: GpuEmphasis,
  overrides?: ReadonlyMap<string, readonly [number, number, number]> | null,
  options: GpuRenderOptions = DEFAULT_GPU_RENDER_OPTIONS,
): ThreeSceneDescriptor {
  const positions = resolveHostPositions(nodes, mode, overrides);
  const selected = new Set(emphasis.selectedIds);
  const time = Number.isFinite(emphasis.time) ? Math.max(0, emphasis.time) : 0;

  const brightness =
    Number.isFinite(options.brightness) && options.brightness > 0 ? options.brightness : 1;

  const hosts: ThreeHostDescriptor[] = nodes.map((node) => {
    const metadata = (node.metadata ?? {}) as Record<string, unknown>;
    const style = styleForHostMetadata(metadata, {
      showCompromised: options.showCompromised,
      showIsolated: options.showIsolated,
      showAlerts: options.showAlerts,
    });

    const isSelected = selected.has(node.id);
    const isHovered = emphasis.hoveredId === node.id;
    const lift = isSelected ? 1.08 : isHovered ? 1.16 : 1;
    const pulse = statePulse(metadata, time, node.id);
    const glow = pulse * (isHovered ? 1.22 : isSelected ? 1.14 : 1);

    return {
      id: node.id,
      name: node.name,
      geometry: geometryForHost(String(node.type ?? ''), mode),
      position: positions.get(node.id) ?? [0, 0, 0],
      scale: style.radius * lift,
      color: [
        Math.min(1, style.color[0] * brightness * glow),
        Math.min(1, style.color[1] * brightness * glow),
        Math.min(1, style.color[2] * brightness * glow),
      ],
      opacity: style.hollow ? 0.9 : 1,
      selected: isSelected,
      hovered: isHovered,
      isolated: options.showIsolated && metadata.isolated === true,
      // Emissive tracks the same pulse so a compromised host visibly breathes.
      emissive: Math.max(0, pulse - 1),
    };
  });

  const links: ThreeLinkDescriptor[] = connections.flatMap((connection, index) => {
    const from = positions.get(connection.source);
    const to = positions.get(connection.target);
    if (!from || !to) return [];

    const blocked = connection.type === 'blocked';
    const base = blocked ? CYBER_STATE_COLORS.blocked : CYBER_STATE_COLORS.edge;

    return [
      {
        id: connection.id ?? `${connection.source}->${connection.target}-${index}`,
        from,
        to,
        color: [base[0] * brightness, base[1] * brightness, base[2] * brightness],
        blocked,
      },
    ];
  });

  return {
    mode,
    hosts,
    links,
    grid: options.showGrid,
    selectedIds: emphasis.selectedIds,
    hoveredId: emphasis.hoveredId,
  };
}

/** Palette shared with the engine renderer so emphasis looks the same in both. */
export const THREE_EMPHASIS_COLORS = EMPHASIS_COLORS;
