/**
 * StudioDocument
 * ---------------
 * The editable document surface of CYRE Studio: the cyber scenario draft
 * plus the authoring network graph. It is the payload carried by the
 * undo/redo `HistoryStack`.
 */

import type {
  CyberScenarioDefinition,
  NetworkGraphEdge,
  NetworkGraphNode,
} from '@cyre/engine';

export interface StudioDocument {
  scenarioDraft: CyberScenarioDefinition | null;
  networkNodes: NetworkGraphNode[];
  networkEdges: NetworkGraphEdge[];
}

export function createEmptyDocument(): StudioDocument {
  return { scenarioDraft: null, networkNodes: [], networkEdges: [] };
}

/** Frame-by-frame playback state for a recorded cyber replay. */
export interface ReplayPlaybackState {
  replay: import('@cyre/engine').CyberSimulationReplay | null;
  index: number;
  playing: boolean;
  state: import('@cyre/engine').CyberSimulationState | null;
}

/** Creates the default scenario draft used by the scenario editor window. */
export function createScenarioDraft(id = 'custom-scenario'): CyberScenarioDefinition {
  return {
    id,
    name: 'Custom Scenario',
    description: 'A scenario authored in CYRE Studio.',
    seed: 42,
    targetHostId: 'core-data',
    nodes: [
      { id: 'internet', name: 'Internet', type: 'internet' },
      {
        id: 'edge-gateway',
        name: 'Edge Gateway',
        type: 'gateway',
        services: [{ name: 'https', port: 443, protocol: 'tcp' }],
      },
      {
        id: 'app-server',
        name: 'Application Server',
        type: 'web_server',
        services: [{ name: 'http', port: 80, protocol: 'tcp', vulnerability: 'CVE-2024-0001' }],
        vulnerabilities: ['CVE-2024-0001'],
      },
      {
        id: 'core-data',
        name: 'Core Data Store',
        type: 'database_server',
        services: [{ name: 'postgresql', port: 5432, protocol: 'tcp' }],
      },
    ],
    connectionLogs: [
      { type: 'recon', source: 'internet', target: 'edge-gateway' },
      { type: 'service_discovery', source: 'internet', target: 'app-server' },
    ],
  };
}
