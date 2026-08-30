export type CyreScriptAttackerSophistication = 'low' | 'medium' | 'high' | 'advanced';
export type CyreScriptDefenseMonitoringLevel = 'none' | 'basic' | 'advanced';

export interface CyreScriptNetworkNode {
  id: string;
  type: string;
  name?: string;
}

export interface CyreScriptNetworkEdge {
  source: string;
  target: string;
  type?: string;
}

export interface CyreScriptAsset {
  id: string;
  name: string;
  type: string;
  value: number;
  metadata?: Record<string, unknown>;
}

export interface CyreScriptUser {
  id: string;
  name: string;
  email?: string;
  role?: string;
  accounts?: string[];
}

export interface CyreScriptAttacker {
  id: string;
  name: string;
  objective: string;
  sophistication: CyreScriptAttackerSophistication;
}

export interface CyreScriptDefense {
  controls: string[];
  monitoringLevel: CyreScriptDefenseMonitoringLevel;
}

export interface CyreScriptAttackPath {
  source: string;
  target: string;
  path: string[];
}

export interface CyreScriptEvidence {
  id: string;
  type: string;
  title: string;
  description: string;
  sourceId?: string;
  timestamp?: number;
  data?: Record<string, unknown>;
}

export interface CyreScriptObjective {
  id: string;
  description: string;
  type?: string;
}

export interface CyreScriptTimelineEvent {
  id: string;
  type: string;
  timestamp: number;
  sourceId?: string;
  targetId?: string;
  data?: Record<string, unknown>;
}

export interface CyreScriptDefinition {
  id: string;
  name: string;
  description?: string;
  organizationName: string;
  industry?: string;
  networkNodes: CyreScriptNetworkNode[];
  networkEdges: CyreScriptNetworkEdge[];
  assets: CyreScriptAsset[];
  users: CyreScriptUser[];
  attacker: CyreScriptAttacker;
  defense: CyreScriptDefense;
  attackPath: CyreScriptAttackPath;
  evidence: CyreScriptEvidence[];
  objectives: CyreScriptObjective[];
  timeline: CyreScriptTimelineEvent[];
  timeLimitMs?: number;
  seed?: number;
}
