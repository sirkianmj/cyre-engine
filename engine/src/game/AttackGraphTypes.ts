/**
 * AttackGraphTypes
 * -----------------
 * Types used by the attack graph system.
 */

export type AttackGraphNodeStatus = 'hidden' | 'discovered' | 'compromised';

export interface AttackGraphNode {
  id: string;
  label: string;
  type?: string;
  status: AttackGraphNodeStatus;
  metadata?: Record<string, unknown>;
}

export type AttackGraphEdgeStatus = 'hidden' | 'discovered';

export interface AttackGraphEdge {
  source: string;
  target: string;
  type?: string;
  status: AttackGraphEdgeStatus;
  /** Numerical weight representing cost/difficulty of traversing this edge */
  weight: number;
  metadata?: Record<string, unknown>;
}
