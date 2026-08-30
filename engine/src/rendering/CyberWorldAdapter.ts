import { SceneGraph } from './SceneGraph.js';
import type { SceneGraphNodeData } from './SceneGraph.js';

export interface CyberVisualizableHost {
  id: string;
  name: string;
  type: string;
  compromised: boolean;
  isolated: boolean;
  accessLevel: 'none' | 'user' | 'admin';
  services: Array<{ name: string; port: number }>;
  vulnerabilities: string[];
}

export interface CyberVisualizableState {
  hosts: Record<string, CyberVisualizableHost>;
  /** Observed traffic; drives the rendered connection graph. */
  monitoring?: { logs: Array<{ type: string; source: string; target?: string }> };
  /** Defender containment state. */
  blockedPaths?: Array<{ source: string; target: string }>;
  defenderActions?: Array<{ action: string; targetId?: string }>;
  alerts?: Array<{ id: string; sourceId: string; status: string; severity: string }>;
  evidence?: Array<{ id: string; sourceId: string; type: string }>;
  attacker?: { position: string; privileges: string };
  objective?: { targetHostId: string; achieved: boolean };
}

/** Overlay state derived from the wider simulation, not from the host itself. */
export interface CyberNodeOverlayState {
  alerted: boolean;
  hasEvidence: boolean;
  isAttackerPosition: boolean;
  isObjectiveTarget: boolean;
  blocked: boolean;
  defenderActions: string[];
}

/** Everything a renderer needs in order to style a host correctly. */
export interface CyberNodeVisualState extends CyberNodeOverlayState {
  compromised: boolean;
  isolated: boolean;
  accessLevel: string;
  services: string[];
  vulnerabilities: string[];
}

/**
 * Relative severity of observed traffic. When the same link is observed more
 * than once, the most severe observation is the one worth rendering — keeping
 * the first would silently hide an exploit behind a reconnaissance scan.
 */
const TRAFFIC_SEVERITY: Record<string, number> = {
  recon: 1,
  service_discovery: 2,
  exploit: 5,
  vulnerability_exploitation: 5,
  privilege_escalation: 6,
  lateral_movement: 7,
  target_access: 8,
  defender_investigate: 3,
  defender_isolate: 4,
  defender_block: 4,
  defender_restore: 3,
};

function trafficSeverity(type: string | undefined): number {
  if (!type) return 0;
  return TRAFFIC_SEVERITY[type] ?? 0;
}

function toNode(
  host: CyberVisualizableHost,
  overlay: CyberNodeOverlayState,
): SceneGraphNodeData {
  return {
    id: host.id,
    name: host.name,
    type: host.type,
    metadata: {
      compromised: host.compromised,
      isolated: host.isolated,
      accessLevel: host.accessLevel,
      services: host.services.map((service) => `${service.name}:${service.port}`),
      vulnerabilities: [...host.vulnerabilities],
      alerted: overlay.alerted,
      hasEvidence: overlay.hasEvidence,
      isAttackerPosition: overlay.isAttackerPosition,
      isObjectiveTarget: overlay.isObjectiveTarget,
      blocked: overlay.blocked,
      defenderActions: [...overlay.defenderActions],
    },
  };
}

export class CyberWorldAdapter {
  /**
   * Converts live cyber simulation state into the engine scene graph.
   *
   * Emits hosts as nodes carrying their full visual state (compromised,
   * isolated, alerted, evidence, attacker position, objective target,
   * containment) and observed traffic as directed connections, so every
   * renderer backend draws from one engine-produced description instead of
   * re-deriving topology itself.
   */
  static toSceneGraph(state: CyberVisualizableState): SceneGraph {
    if (!state || typeof state !== 'object' || !state.hosts) {
      throw new Error('Cyber visualizable state with hosts is required.');
    }

    const graph = new SceneGraph();
    const hosts = Object.values(state.hosts);

    const alertSources = new Set(
      (state.alerts ?? [])
        .filter((alert) => alert.status === 'new' || alert.status === 'investigating')
        .map((alert) => alert.sourceId),
    );
    const evidenceSources = new Set((state.evidence ?? []).map((entry) => entry.sourceId));

    const defenderActionsByHost = new Map<string, string[]>();
    const attributeAction = (hostId: string, action: string): void => {
      const existing = defenderActionsByHost.get(hostId) ?? [];
      if (!existing.includes(action)) existing.push(action);
      defenderActionsByHost.set(hostId, existing);
    };

    for (const action of state.defenderActions ?? []) {
      if (!action.targetId) continue;

      // Containment of a path is recorded by the engine as "source->target",
      // so it has to be attributed to both endpoints rather than looked up as
      // a host id.
      const pathMatch = /^(.+)->(.+)$/.exec(action.targetId);
      if (pathMatch) {
        attributeAction(pathMatch[1], action.action);
        attributeAction(pathMatch[2], action.action);
        continue;
      }

      attributeAction(action.targetId, action.action);
    }

    const blockedHosts = new Set<string>();
    for (const path of state.blockedPaths ?? []) {
      blockedHosts.add(path.source);
      blockedHosts.add(path.target);
    }

    const attackerPosition = state.attacker?.position;
    const objectiveTarget = state.objective?.targetHostId;

    for (const host of hosts) {
      graph.addNode(
        toNode(host, {
          alerted: alertSources.has(host.id),
          hasEvidence: evidenceSources.has(host.id),
          isAttackerPosition: attackerPosition === host.id,
          isObjectiveTarget: objectiveTarget === host.id,
          blocked: blockedHosts.has(host.id),
          defenderActions: defenderActionsByHost.get(host.id) ?? [],
        }),
      );
    }

    // Observed traffic becomes the rendered connection graph. A host may have
    // many outgoing and incoming connections, so this cannot be expressed as
    // the single-parent hierarchy; it uses the directed connection model.
    const logs = state.monitoring?.logs ?? [];
    for (const log of logs) {
      if (!log.target) continue;
      if (!state.hosts[log.source] || !state.hosts[log.target]) continue;
      if (log.source === log.target) continue;

      const existing = graph
        .getConnections()
        .find((edge) => edge.source === log.source && edge.target === log.target);

      if (existing) {
        // Keep the more severe observation for this link.
        if (trafficSeverity(log.type) > trafficSeverity(existing.type)) {
          graph.removeConnection(log.source, log.target);
          graph.addConnection({
            source: log.source,
            target: log.target,
            type: log.type,
            metadata: { traffic: log.type },
          });
        }
        continue;
      }

      graph.addConnection({
        source: log.source,
        target: log.target,
        type: log.type,
        metadata: { traffic: log.type },
      });
    }

    // Containment is rendered as its own connection semantics so a renderer
    // can show a blocked link distinctly from ordinary traffic.
    for (const path of state.blockedPaths ?? []) {
      if (!state.hosts[path.source] || !state.hosts[path.target]) continue;
      if (path.source === path.target) continue;

      if (graph.hasConnection(path.source, path.target)) {
        graph.removeConnection(path.source, path.target);
      }
      graph.addConnection({
        source: path.source,
        target: path.target,
        type: 'blocked',
        metadata: { blocked: true },
      });
    }

    return graph;
  }
}
