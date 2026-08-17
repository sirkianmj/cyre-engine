/**
 * AttackGraph
 * ------------
 * Represents an attack graph with nodes and edges.
 * Nodes and edges can be hidden or discovered, simulating the player's
 * investigation progress.
 */

import type {
  AttackGraphNode,
  AttackGraphEdge,
  AttackGraphNodeStatus,
  AttackGraphEdgeStatus,
} from './AttackGraphTypes.js';

export interface PathResult {
  path: string[];
  score: number;
}

export class AttackGraph {
  private nodes: Map<string, AttackGraphNode> = new Map();
  private edges: AttackGraphEdge[] = [];

  addNode(
    id: string,
    label: string,
    options: {
      type?: string;
      status?: AttackGraphNodeStatus;
      metadata?: Record<string, unknown>;
    } = {},
  ): AttackGraphNode {
    if (!id || id.trim() === '') {
      throw new Error('AttackGraphNode id must be a non-empty string.');
    }
    if (!label || label.trim() === '') {
      throw new Error('AttackGraphNode label must be a non-empty string.');
    }
    if (this.nodes.has(id)) {
      throw new Error(`AttackGraphNode "${id}" already exists.`);
    }
    const node: AttackGraphNode = {
      id,
      label,
      type: options.type,
      status: options.status ?? 'hidden',
      metadata: options.metadata,
    };
    this.nodes.set(id, node);
    return node;
  }

  removeNode(id: string): void {
    if (!this.nodes.has(id)) {
      throw new Error(`AttackGraphNode "${id}" does not exist.`);
    }
    this.nodes.delete(id);
    // Remove all edges connected to this node
    this.edges = this.edges.filter((edge) => edge.source !== id && edge.target !== id);
  }

  hasNode(id: string): boolean {
    return this.nodes.has(id);
  }

  getNode(id: string): AttackGraphNode | undefined {
    return this.nodes.get(id);
  }

  getNodes(): AttackGraphNode[] {
    return Array.from(this.nodes.values());
  }

  addEdge(
    source: string,
    target: string,
    options: {
      type?: string;
      status?: AttackGraphEdgeStatus;
      weight?: number;
      metadata?: Record<string, unknown>;
    } = {},
  ): AttackGraphEdge {
    if (!this.nodes.has(source)) {
      throw new Error(`Source node "${source}" does not exist.`);
    }
    if (!this.nodes.has(target)) {
      throw new Error(`Target node "${target}" does not exist.`);
    }
    if (source === target) {
      throw new Error('Self-loops are not allowed.');
    }
    const weight = options.weight ?? 1;
    if (!Number.isFinite(weight) || weight <= 0) {
      throw new Error('Edge weight must be a positive finite number.');
    }
    // Check duplicate source-target edge
    if (this.edges.some((edge) => edge.source === source && edge.target === target)) {
      throw new Error(`Edge from "${source}" to "${target}" already exists.`);
    }
    const edge: AttackGraphEdge = {
      source,
      target,
      type: options.type,
      status: options.status ?? 'hidden',
      weight,
      metadata: options.metadata,
    };
    this.edges.push(edge);
    return edge;
  }

  removeEdge(source: string, target: string): void {
    const index = this.edges.findIndex(
      (edge) => edge.source === source && edge.target === target,
    );
    if (index === -1) {
      throw new Error(`Edge from "${source}" to "${target}" does not exist.`);
    }
    this.edges.splice(index, 1);
  }

  getEdges(): AttackGraphEdge[] {
    return [...this.edges];
  }

  getEdge(source: string, target: string): AttackGraphEdge | undefined {
    return this.edges.find(
      (edge) => edge.source === source && edge.target === target,
    );
  }

  /**
   * Mark a node as discovered.
   */
  discoverNode(id: string): void {
    const node = this.nodes.get(id);
    if (!node) {
      throw new Error(`AttackGraphNode "${id}" does not exist.`);
    }
    if (node.status === 'compromised') {
      throw new Error(`Node "${id}" is already compromised.`);
    }
    node.status = 'discovered';
  }

  /**
   * Mark a node as compromised (e.g., attacker has reached it).
   * Also marks it discovered if it was hidden.
   */
  markCompromised(id: string): void {
    const node = this.nodes.get(id);
    if (!node) {
      throw new Error(`AttackGraphNode "${id}" does not exist.`);
    }
    node.status = 'compromised';
  }

  /**
   * Mark an edge as discovered.
   */
  discoverEdge(source: string, target: string): void {
    const edge = this.getEdge(source, target);
    if (!edge) {
      throw new Error(`Edge from "${source}" to "${target}" does not exist.`);
    }
    edge.status = 'discovered';
  }

  getDiscoveredNodes(): AttackGraphNode[] {
    return this.getNodes().filter((node) => node.status !== 'hidden');
  }

  getHiddenNodes(): AttackGraphNode[] {
    return this.getNodes().filter((node) => node.status === 'hidden');
  }

  getDiscoveredEdges(): AttackGraphEdge[] {
    return this.edges.filter((edge) => edge.status === 'discovered');
  }

  getHiddenEdges(): AttackGraphEdge[] {
    return this.edges.filter((edge) => edge.status === 'hidden');
  }

  /**
   * Find shortest path (minimum total weight) from source to target using BFS
   * with weighting. Since weights are positive, we can use Dijkstra's algorithm.
   * If visibleOnly is true, only discovered edges are traversed.
   */
  shortestPath(source: string, target: string, visibleOnly = false): PathResult | null {
    if (!this.nodes.has(source)) {
      throw new Error(`Source node "${source}" does not exist.`);
    }
    if (!this.nodes.has(target)) {
      throw new Error(`Target node "${target}" does not exist.`);
    }
    if (source === target) {
      return { path: [source], score: 0 };
    }

    const edges = visibleOnly ? this.getDiscoveredEdges() : this.edges;
    const dist = new Map<string, number>();
    const prev = new Map<string, string>();
    const pq: { node: string; dist: number }[] = [];

    for (const node of this.nodes.keys()) {
      dist.set(node, Infinity);
    }
    dist.set(source, 0);
    pq.push({ node: source, dist: 0 });

    while (pq.length > 0) {
      pq.sort((a, b) => a.dist - b.dist);
      const current = pq.shift()!;
      if (current.node === target) break;

      const outgoing = edges.filter((edge) => edge.source === current.node);
      for (const edge of outgoing) {
        const newDist = current.dist + edge.weight;
        if (newDist < dist.get(edge.target)!) {
          dist.set(edge.target, newDist);
          prev.set(edge.target, current.node);
          pq.push({ node: edge.target, dist: newDist });
        }
      }
    }

    if (!dist.has(target) || dist.get(target) === Infinity) {
      return null;
    }

    const path: string[] = [target];
    let node = target;
    while (prev.has(node)) {
      node = prev.get(node)!;
      path.unshift(node);
    }
    return { path, score: dist.get(target)! };
  }

  /**
   * Validate graph structure: all edges reference existing nodes,
   * weights positive, no self-loops.
   * Throws if invalid.
   */
  validate(): void {
    for (const edge of this.edges) {
      if (!this.nodes.has(edge.source)) {
        throw new Error(`Edge source "${edge.source}" references missing node.`);
      }
      if (!this.nodes.has(edge.target)) {
        throw new Error(`Edge target "${edge.target}" references missing node.`);
      }
      if (edge.source === edge.target) {
        throw new Error(`Self-loop detected at node "${edge.source}".`);
      }
      if (!Number.isFinite(edge.weight) || edge.weight <= 0) {
        throw new Error(`Invalid weight on edge from "${edge.source}" to "${edge.target}".`);
      }
    }
  }

  toJSON(): { nodes: AttackGraphNode[]; edges: AttackGraphEdge[] } {
    return {
      nodes: this.getNodes(),
      edges: this.getEdges(),
    };
  }
}
