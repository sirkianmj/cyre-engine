import type { CyberSimulationState } from './CyberSimulationTypes.js';
import { AttackStage } from '../AttackStage.js';

export type CyberScenarioNodeType =
  | 'internet'
  | 'gateway'
  | 'web_server'
  | 'database_server'
  | 'admin_workstation'
  | 'internal_network';

export interface CyberScenarioService {
  name: string;
  port: number;
  protocol: 'tcp' | 'udp';
  vulnerability?: string;
}

export interface CyberScenarioNode {
  id: string;
  name: string;
  type: CyberScenarioNodeType;
  services?: CyberScenarioService[];
  vulnerabilities?: string[];
}

export interface CyberScenarioDefinition {
  id: string;
  name: string;
  description: string;
  seed: number;
  targetHostId: string;
  nodes: CyberScenarioNode[];
  connectionLogs: Array<{
    type: string;
    source: string;
    target?: string;
  }>;
}

export function createStateFromScenario(
  scenario: CyberScenarioDefinition,
): CyberSimulationState {
  const hosts: CyberSimulationState['hosts'] = {};

  for (const node of scenario.nodes) {
    hosts[node.id] = {
      id: node.id,
      name: node.name,
      type: node.type,
      compromised: false,
      accessLevel: 'none',
      services: node.services ?? [],
      vulnerabilities: node.vulnerabilities ?? [],
      isolated: false,
    };
  }

  return {
    hosts,
    attacker: {
      position: 'internet',
      privileges: 'none',
      discoveredServices: [],
    },
    attackStage: AttackStage.Recon,
    objective: {
      targetHostId: scenario.targetHostId,
      achieved: false,
    },
    monitoring: {
      enabled: true,
      logs: [],
    },
    evidence: [],
    alerts: [],
    defenderActions: [],
    blockedPaths: [],
  };
}
