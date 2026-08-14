export type NodeId = string;

export type EdgeType = 'connects' | 'routes' | 'firewall' | 'vpn' | 'wireless' | 'other';

export interface NetworkNode {
  id: NodeId;
  name?: string;
  type?: string;
  metadata?: Record<string, unknown>;
}

export interface NetworkEdge {
  source: NodeId;
  target: NodeId;
  type: EdgeType;
  metadata?: Record<string, unknown>;
}

export interface PathResult {
  path: NodeId[];
  length: number;
}
