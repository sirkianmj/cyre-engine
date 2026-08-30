export interface SceneGraphNodeData {
  id: string;
  name: string;
  type?: string;
  metadata?: Record<string, unknown>;
}

export interface SceneGraphEdgeData {
  source: string;
  target: string;
  /** Optional semantic label, e.g. the observed traffic type. */
  type?: string;
  metadata?: Record<string, unknown>;
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export class SceneGraph {
  private nodes: Map<string, SceneGraphNodeData> = new Map();
  private parentMap: Map<string, string> = new Map();
  /**
   * Directed connections between nodes. Unlike `parentMap`, which models a
   * single-parent hierarchy, a connection graph allows any number of outgoing
   * and incoming edges per node, which is what a network topology is.
   */
  private connections: SceneGraphEdgeData[] = [];

  addNode(data: SceneGraphNodeData): void {
    if (!data.id || data.id.trim() === '') {
      throw new Error('SceneGraph node id is required.');
    }
    if (!data.name || data.name.trim() === '') {
      throw new Error('SceneGraph node name is required.');
    }
    if (this.nodes.has(data.id)) {
      throw new Error(`SceneGraph node "${data.id}" already exists.`);
    }

    const node: SceneGraphNodeData = {
      id: data.id,
      name: data.name,
      type: data.type,
      metadata: data.metadata !== undefined ? deepClone(data.metadata) : undefined,
    };
    this.nodes.set(node.id, node);
  }

  setParent(childId: string, parentId: string): void {
    if (!this.nodes.has(childId)) {
      throw new Error(`SceneGraph node "${childId}" does not exist.`);
    }
    if (!this.nodes.has(parentId)) {
      throw new Error(`SceneGraph node "${parentId}" does not exist.`);
    }
    if (childId === parentId) {
      throw new Error('SceneGraph node cannot be its own parent.');
    }

    // Walk upward from parent to root; if child is encountered, a cycle exists.
    let cursor: string | undefined = parentId;
    while (cursor !== undefined) {
      if (cursor === childId) {
        throw new Error('SceneGraph parent assignment would create a cycle.');
      }
      cursor = this.parentMap.get(cursor);
    }

    this.parentMap.set(childId, parentId);
  }

  hasNode(id: string): boolean {
    return this.nodes.has(id);
  }

  getNode(id: string): SceneGraphNodeData | undefined {
    const node = this.nodes.get(id);
    return node !== undefined ? deepClone(node) : undefined;
  }

  getNodes(): SceneGraphNodeData[] {
    return Array.from(this.nodes.values()).map((node) => deepClone(node));
  }

  getParent(childId: string): string | undefined {
    return this.parentMap.get(childId);
  }

  getChildren(parentId: string): SceneGraphNodeData[] {
    if (!this.nodes.has(parentId)) {
      throw new Error(`SceneGraph node "${parentId}" does not exist.`);
    }
    const children: SceneGraphNodeData[] = [];
    for (const [child, parent] of this.parentMap.entries()) {
      if (parent === parentId) {
        const node = this.nodes.get(child);
        if (node !== undefined) {
          children.push(deepClone(node));
        }
      }
    }
    return children;
  }

  getRoots(): SceneGraphNodeData[] {
    const childIds = new Set(this.parentMap.keys());
    return Array.from(this.nodes.values())
      .filter((node) => !childIds.has(node.id))
      .map((node) => deepClone(node));
  }

  getEdges(): SceneGraphEdgeData[] {
    return Array.from(this.parentMap.entries()).map(([source, target]) => ({
      source,
      target,
    }));
  }

  /**
   * Adds a directed connection between two existing nodes. Duplicate
   * source/target pairs are ignored so a graph can be rebuilt idempotently.
   */
  addConnection(edge: SceneGraphEdgeData): void {
    if (!edge || typeof edge.source !== 'string' || edge.source.trim() === '') {
      throw new Error('SceneGraph connection source is required.');
    }
    if (typeof edge.target !== 'string' || edge.target.trim() === '') {
      throw new Error('SceneGraph connection target is required.');
    }
    if (!this.nodes.has(edge.source)) {
      throw new Error(`SceneGraph connection source "${edge.source}" does not exist.`);
    }
    if (!this.nodes.has(edge.target)) {
      throw new Error(`SceneGraph connection target "${edge.target}" does not exist.`);
    }

    const exists = this.connections.some(
      (entry) => entry.source === edge.source && entry.target === edge.target,
    );
    if (exists) return;

    this.connections.push({
      source: edge.source,
      target: edge.target,
      type: edge.type,
      metadata: edge.metadata !== undefined ? deepClone(edge.metadata) : undefined,
    });
  }

  hasConnection(source: string, target: string): boolean {
    return this.connections.some(
      (entry) => entry.source === source && entry.target === target,
    );
  }

  removeConnection(source: string, target: string): void {
    this.connections = this.connections.filter(
      (entry) => !(entry.source === source && entry.target === target),
    );
  }

  /** The directed connection graph, in insertion order. */
  getConnections(): SceneGraphEdgeData[] {
    return this.connections.map((edge) => ({
      ...edge,
      metadata: edge.metadata !== undefined ? deepClone(edge.metadata) : undefined,
    }));
  }

  validate(): void {
    for (const edge of this.connections) {
      if (!this.nodes.has(edge.source)) {
        throw new Error(`SceneGraph connection source "${edge.source}" references missing node.`);
      }
      if (!this.nodes.has(edge.target)) {
        throw new Error(`SceneGraph connection target "${edge.target}" references missing node.`);
      }
      if (edge.source === edge.target) {
        throw new Error(`SceneGraph connection "${edge.source}" is a self-loop.`);
      }
    }

    for (const [child, parent] of this.parentMap.entries()) {
      if (!this.nodes.has(child)) {
        throw new Error(`SceneGraph edge source "${child}" references missing node.`);
      }
      if (!this.nodes.has(parent)) {
        throw new Error(`SceneGraph edge target "${parent}" references missing node.`);
      }
    }

    // Ensure no cycles exist.
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (nodeId: string): void => {
      if (visiting.has(nodeId)) {
        throw new Error('SceneGraph contains a cycle.');
      }
      if (visited.has(nodeId)) return;

      visiting.add(nodeId);
      const parent = this.parentMap.get(nodeId);
      if (parent !== undefined) {
        if (!this.nodes.has(parent)) {
          throw new Error(`SceneGraph edge target "${parent}" references missing node.`);
        }
        visit(parent);
      }
      visiting.delete(nodeId);
      visited.add(nodeId);
    };

    for (const nodeId of this.nodes.keys()) {
      visit(nodeId);
    }
  }

  clone(): SceneGraph {
    return SceneGraph.fromJSON(this.toJSON());
  }

  toJSON(): Record<string, unknown> {
    return {
      nodes: this.getNodes(),
      edges: this.getEdges(),
      connections: this.getConnections(),
    };
  }

  static fromJSON(data: Record<string, unknown>): SceneGraph {
    const graph = new SceneGraph();
    const rawNodes = Array.isArray(data.nodes) ? (data.nodes as SceneGraphNodeData[]) : [];
    for (const node of rawNodes) {
      graph.addNode({
        id: typeof node.id === 'string' ? node.id : '',
        name: typeof node.name === 'string' ? node.name : '',
        type: typeof node.type === 'string' ? node.type : undefined,
        metadata: node.metadata !== undefined
          ? (node.metadata as Record<string, unknown>)
          : undefined,
      });
    }

    const rawEdges = Array.isArray(data.edges) ? (data.edges as SceneGraphEdgeData[]) : [];
    for (const edge of rawEdges) {
      if (
        typeof edge.source === 'string' &&
        typeof edge.target === 'string'
      ) {
        graph.setParent(edge.source, edge.target);
      }
    }

    const rawConnections = Array.isArray(data.connections)
      ? (data.connections as SceneGraphEdgeData[])
      : [];
    for (const connection of rawConnections) {
      if (
        typeof connection.source === 'string' &&
        typeof connection.target === 'string' &&
        graph.hasNode(connection.source) &&
        graph.hasNode(connection.target) &&
        connection.source !== connection.target
      ) {
        graph.addConnection({
          source: connection.source,
          target: connection.target,
          type: typeof connection.type === 'string' ? connection.type : undefined,
          metadata:
            connection.metadata !== undefined
              ? (connection.metadata as Record<string, unknown>)
              : undefined,
        });
      }
    }

    graph.validate();
    return graph;
  }
}
