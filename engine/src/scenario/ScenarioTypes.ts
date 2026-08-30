/**
 * ScenarioTypes
 * --------------
 * Type definitions for CYRE scenario representation.
 */

export interface ScenarioAsset {
  id: string;
  name: string;
  type: string;
  value: number;
  metadata?: Record<string, unknown>;
}

export interface ScenarioUser {
  id: string;
  name: string;
  email?: string;
  role?: string;
  accounts?: string[];
}

export interface ScenarioAttacker {
  id: string;
  name: string;
  objective: string;
  sophistication: 'low' | 'medium' | 'high' | 'advanced';
}

export interface ScenarioDefense {
  controls: string[];
  monitoringLevel: 'none' | 'basic' | 'advanced';
}

export interface ScenarioNetwork {
  nodes: Array<{ id: string; type: string; name?: string }>;
  edges: Array<{ source: string; target: string; type?: string }>;
}

export interface ScenarioAttackPath {
  source: string;
  target: string;
  path: string[];
}

export interface ScenarioEvidence {
  id: string;
  type: string;
  title: string;
  description: string;
  sourceId?: string;
  timestamp?: number;
  data?: Record<string, unknown>;
}

export interface ScenarioObjective {
  id: string;
  description: string;
  type?: string;
}

export interface ScenarioEvent {
  id: string;
  type: string;
  timestamp: number;
  sourceId?: string;
  targetId?: string;
  data?: Record<string, unknown>;
}

export interface Scenario {
  id: string;
  name: string;
  description?: string;
  organization: {
    name: string;
    industry?: string;
  };
  network: ScenarioNetwork;
  assets: ScenarioAsset[];
  users: ScenarioUser[];
  attacker: ScenarioAttacker;
  defense: ScenarioDefense;
  attackPath: ScenarioAttackPath;
  evidence: ScenarioEvidence[];
  objectives: ScenarioObjective[];
  timeline: ScenarioEvent[];
  timeLimitMs?: number;
  seed?: number;
}
