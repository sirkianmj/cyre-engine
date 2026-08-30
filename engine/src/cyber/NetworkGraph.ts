/**
 * NetworkGraph
 * -------------
 * A directed graph representing a computer network.
 * Edges can be bidirectional by default (physical links), or directed
 * (e.g., firewall rules, routing policies).
 */

import type { NetworkEdge, NetworkNode, NodeId, EdgeType, PathResult } from './networkTypes.js';

export class NetworkGraph {
  private nodes: Map<NodeId, NetworkNode> = new Map();
  private edges: Map<NodeId, Map<NodeId, NetworkEdge>> = new Map();

  /**
   * Add a node to the graph.
   * @throws Error if node already exists.
   */
  addNode(
    id: NodeId,
    options: { name?: string; type?: string; metadata?: Record<string, unknown> } = {},
  ): NetworkNode {
    if (this.nodes.has(id)) {
      throw new Error(`Node "${id}" already exists.`);
    }
    const node: NetworkNode = {
      id,
      name: options.name,
      type: options.type,
      metadata: options.metadata,
    };
    this.nodes.set(id, node);
    this.edges.set(id, new Map());
    return node;
  }

  /**
   * Remove a node and all its associated edges.
   */
  removeNode(id: NodeId): void {
    if (!this.nodes.has(id)) {
      throw new Error(`Node "${id}" does not exist.`);
    }
    this.nodes.delete(id);
    this.edges.delete(id);
    // Remove incoming edges from other nodes
    for (const [source, outgoing] of this.edges) {
      if (outgoing.has(id)) {
        outgoing.delete(id);
      }
    }
  }

  hasNode(id: NodeId): boolean {
    return this.nodes.has(id);
  }

  getNode(id: NodeId): NetworkNode | undefined {
    return this.nodes.get(id);
  }

  getNodes(): NetworkNode[] {
    return Array.from(this.nodes.values());
  }

  /**
   * Add an edge from source to target.
   * If bidirectional is true (default), also adds the reverse edge.
   * @throws Error if source or target node does not exist.
   */
  addEdge(
    source: NodeId,
    target: NodeId,
    options: {
      type?: EdgeType;
      metadata?: Record<string, unknown>;
      bidirectional?: boolean;
    } = {},
  ): void {
    if (!this.nodes.has(source)) {
      throw new Error(`Source node "${source}" does not exist.`);
    }
    if (!this.nodes.has(target)) {
      throw new Error(`Target node "${target}" does not exist.`);
    }
    if (source === target) {
      throw new Error('Self-loops are not allowed.');
    }

    const type = options.type ?? 'connects';
    const metadata = options.metadata;
    const bidirectional = options.bidirectional ?? true;

    const edge: NetworkEdge = { source, target, type, metadata };
    this.edges.get(source)!.set(target, edge);

    if (bidirectional) {
      const reverseEdge: NetworkEdge = { source: target, target: source, type, metadata };
      this.edges.get(target)!.set(source, reverseEdge);
    }
  }

  removeEdge(source: NodeId, target: NodeId): void {
    if (!this.edges.has(source) || !this.edges.get(source)!.has(target)) {
      throw new Error(`Edge from "${source}" to "${target}" does not exist.`);
    }
    this.edges.get(source)!.delete(target);
    // If reverse edge exists (bidirectional), remove it as well
    if (this.edges.has(target) && this.edges.get(target)!.has(source)) {
      this.edges.get(target)!.delete(source);
    }
  }

  hasEdge(source: NodeId, target: NodeId): boolean {
    return this.edges.get(source)?.has(target) ?? false;
  }

  getEdge(source: NodeId, target: NodeId): NetworkEdge | undefined {
    return this.edges.get(source)?.get(target);
  }

  getNeighbors(nodeId: NodeId): NodeId[] {
    if (!this.nodes.has(nodeId)) {
      throw new Error(`Node "${nodeId}" does not exist.`);
    }
    return Array.from(this.edges.get(nodeId)!.keys());
  }

  getOutgoingEdges(nodeId: NodeId): NetworkEdge[] {
    if (!this.nodes.has(nodeId)) {
      throw new Error(`Node "${nodeId}" does not exist.`);
    }
    return Array.from(this.edges.get(nodeId)!.values());
  }

  getEdges(): NetworkEdge[] {
    const result: NetworkEdge[] = [];
    for (const outgoing of this.edges.values()) {
      for (const edge of outgoing.values()) {
        result.push(edge);
      }
    }
    return result;
  }

  /**
   * Check if a path exists from source to target using BFS.
   */
  hasPath(source: NodeId, target: NodeId): boolean {
    if (!this.nodes.has(source)) throw new Error(`Source node "${source}" does not exist.`);
    if (!this.nodes.has(target)) throw new Error(`Target node "${target}" does not exist.`);

    if (source === target) return true;

    const visited = new Set<NodeId>();
    const queue: NodeId[] = [source];
    visited.add(source);

    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const neighbor of this.edges.get(current)!.keys()) {
        if (neighbor === target) return true;
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }
    return false;
  }

  /**
   * Find the shortest path from source to target using BFS.
   * Returns null if no path exists.
   */
  shortestPath(source: NodeId, target: NodeId): PathResult | null {
    if (!this.nodes.has(source)) throw new Error(`Source node "${source}" does not exist.`);
    if (!this.nodes.has(target)) throw new Error(`Target node "${target}" does not exist.`);

    if (source === target) {
      return { path: [source], length: 0 };
    }

    const visited = new Set<NodeId>([source]);
    const queue: NodeId[] = [source];
    const parent = new Map<NodeId, NodeId>();

    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const neighbor of this.edges.get(current)!.keys()) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          parent.set(neighbor, current);
          if (neighbor === target) {
            const path: NodeId[] = [target];
            let node = target;
            while (parent.has(node)) {
              node = parent.get(node)!;
              path.unshift(node);
            }
            return { path, length: path.length - 1 };
          }
          queue.push(neighbor);
        }
      }
    }
    return null;
  }

  /**
   * Validate graph structure: ensures all edges reference existing nodes.
   * Throws if invalid.
   */
  validate(): void {
    for (const [source, outgoing] of this.edges) {
      if (!this.nodes.has(source)) {
        throw new Error(`Edge source "${source}" references missing node.`);
      }
      for (const target of outgoing.keys()) {
        if (!this.nodes.has(target)) {
          throw new Error(`Edge target "${target}" references missing node.`);
        }
      }
    }
  }

  toJSON(): { nodes: NetworkNode[]; edges: NetworkEdge[] } {
    return {
      nodes: this.getNodes(),
      edges: this.getEdges(),
    };
  }
}
