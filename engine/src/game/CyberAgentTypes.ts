export const CYBER_AGENT_ROLES = [
  'attacker',
  'defender',
  'npc',
  'analyst',
] as const;

export type CyberAgentRole = (typeof CYBER_AGENT_ROLES)[number];

export function isCyberAgentRole(value: string): value is CyberAgentRole {
  return (CYBER_AGENT_ROLES as readonly string[]).includes(value);
}

export const CYBER_AGENT_STATUSES = [
  'idle',
  'active',
  'paused',
  'terminated',
] as const;

export type CyberAgentStatus = (typeof CYBER_AGENT_STATUSES)[number];

export function isCyberAgentStatus(
  value: string,
): value is CyberAgentStatus {
  return (CYBER_AGENT_STATUSES as readonly string[]).includes(value);
}

export interface CyberAgentAction {
  id: string;
  type: string;
  targetId?: string;
  sourceId?: string;
  timestamp: number;
  data?: Record<string, unknown>;
}

export interface CyberAgentDecision {
  action: CyberAgentAction;
  confidence: number;
  reasoning?: string;
  alternatives?: CyberAgentAction[];
}

export interface CyberAgentObservation {
  agentId: string;
  timestamp: number;
  summary: string;
  events: unknown[];
  entities: unknown[];
  worldState?: Record<string, unknown>;
}

export interface CyberAgentContext {
  readonly agentId: string;
  readonly role: CyberAgentRole;
  observe(): CyberAgentObservation;
  act(action: CyberAgentAction): void;
  report(message: string, data?: Record<string, unknown>): void;
  now(): number;
}

export interface CyberAgent {
  readonly id: string;
  readonly name: string;
  readonly role: CyberAgentRole;
  getStatus(): CyberAgentStatus;
  start(context: CyberAgentContext): void;
  pause(): void;
  resume(): void;
  stop(): void;
  step(context: CyberAgentContext): CyberAgentDecision | void;
}

export interface CyberAgentActionRecord {
  sequence: number;
  agentId: string;
  action: CyberAgentAction;
  timestamp: number;
}

export interface CyberAgentRegistrySnapshot {
  name: string;
  agentCount: number;
  agentIds: string[];
  agentsByRole: Record<string, string[]>;
  summary: string;
}
