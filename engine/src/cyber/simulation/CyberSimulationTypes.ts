import type { AttackStage } from '../AttackStage.js';

export type HostType =
  | 'internet'
  | 'gateway'
  | 'web_server'
  | 'database_server'
  | 'admin_workstation'
  | 'internal_network';

export interface CyberService {
  name: string;
  port: number;
  protocol: 'tcp' | 'udp';
  vulnerability?: string;
}

export interface CyberHostState {
  id: string;
  name: string;
  type: HostType;
  compromised: boolean;
  accessLevel: 'none' | 'user' | 'admin';
  services: CyberService[];
  vulnerabilities: string[];
  isolated: boolean;
}

export interface CyberDetectionEvidence {
  id: string;
  type: string;
  description: string;
  sourceId: string;
  timestamp: number;
}

export interface CyberAlert {
  id: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  sourceId: string;
  timestamp: number;
  status: 'new' | 'acknowledged' | 'investigating' | 'contained' | 'recovered' | 'resolved';
}

export interface CyberDefenderActionRecord {
  action: string;
  targetId?: string;
  timestamp: number;
}

export interface BlockedPath {
  source: string;
  target: string;
}

export interface CyberSimulationState {
  hosts: Record<string, CyberHostState>;
  attacker: {
    position: string;
    privileges: 'none' | 'user' | 'admin';
    discoveredServices: string[];
  };
  attackStage: AttackStage;
  objective: {
    targetHostId: string;
    achieved: boolean;
  };
  monitoring: {
    enabled: boolean;
    logs: Array<{
      timestamp: number;
      type: string;
      source: string;
      target?: string;
    }>;
  };
  evidence: CyberDetectionEvidence[];
  alerts: CyberAlert[];
  defenderActions: CyberDefenderActionRecord[];
  blockedPaths: BlockedPath[];
}
