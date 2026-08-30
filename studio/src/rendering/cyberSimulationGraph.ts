import { CyberWorldAdapter } from '@cyre/engine';

import type {
  CyberSimulationState,
  NetworkGraphEdge,
  NetworkGraphNode,
} from '@cyre/engine';

export interface CyberSimulationGraph {
  nodes: NetworkGraphNode[];
  edges: NetworkGraphEdge[];
}

/**
 * Maps an engine host type onto the viewport's visual vocabulary.
 * This is a presentation concern, so it stays in the Studio.
 */
function mapHostType(type: string | undefined): NetworkGraphNode['type'] {
  switch (type) {
    case 'internet':
    case 'internal_network':
      return 'network';
    case 'gateway':
      return 'firewall';
    case 'web_server':
      return 'server';
    case 'database_server':
      return 'database';
    case 'admin_workstation':
      return 'client';
    default:
      return 'host';
  }
}

/** Deterministic grid placement; layout is a viewport concern, not the engine's. */
function layoutPosition(index: number): { x: number; y: number } {
  return {
    x: 140 + (index % 5) * 160,
    y: 120 + Math.floor(index / 5) * 140,
  };
}

/**
 * Builds the viewport graph from the engine's own scene description.
 *
 * Topology, host visual state (compromised, isolated, alerted, evidence,
 * attacker position, objective target, containment) and the connection graph
 * all come from `CyberWorldAdapter`, so every renderer — 2D, 2.5D and 3D —
 * draws from one engine-produced description instead of re-deriving it here.
 * The Studio contributes only layout and visual vocabulary.
 */
export function graphFromCyberSimulationState(
  state: CyberSimulationState | null,
): CyberSimulationGraph {
  if (!state) {
    return { nodes: [], edges: [] };
  }

  const scene = CyberWorldAdapter.toSceneGraph(state);

  const nodes: NetworkGraphNode[] = scene.getNodes().map((node, index) => {
    const metadata = (node.metadata ?? {}) as Record<string, unknown>;

    return {
      id: node.id,
      label: node.name,
      type: mapHostType(node.type),
      position: layoutPosition(index),
      metadata: {
        compromised: metadata.compromised === true,
        isolated: metadata.isolated === true,
        alerted: metadata.alerted === true,
        evidence: metadata.hasEvidence === true,
        isAttackerPosition: metadata.isAttackerPosition === true,
        isObjectiveTarget: metadata.isObjectiveTarget === true,
        blocked: metadata.blocked === true,
        accessLevel: metadata.accessLevel,
        services: metadata.services,
        vulnerabilities: metadata.vulnerabilities,
        defenderActions: metadata.defenderActions,
      },
    };
  });

  const edges: NetworkGraphEdge[] = scene.getConnections().map((connection) => ({
    id: `${connection.source}->${connection.target}`,
    source: connection.source,
    target: connection.target,
    type: connection.type === 'blocked' ? 'blocked' : 'connects',
    metadata: connection.metadata,
  }));

  return { nodes, edges };
}
