export type AttackGraphNodeStatus = 'hidden' | 'discovered' | 'compromised' | 'contained';

export interface AttackGraphNode {
  id: string;
  label: string;
  stage?: string;
  status: AttackGraphNodeStatus;
  metadata?: Record<string, unknown>;
}

export interface AttackGraphEdge {
  id: string;
  source: string;
  target: string;
  description?: string;
  probability?: number;
}

export class AttackGraphEditor {
  private readonly nodes = new Map<string, AttackGraphNode>();
  private readonly edges = new Map<string, AttackGraphEdge>();

  addNode(node: AttackGraphNode): void {
    this.validateNode(node);
    if (this.nodes.has(node.id)) {
      throw new Error(`Attack graph node "${node.id}" already exists.`);
    }
    this.nodes.set(node.id, this.copyNode(node));
  }

  getNode(nodeId: string): AttackGraphNode {
    const node = this.nodes.get(nodeId);
    if (!node) {
      throw new Error(`Attack graph node "${nodeId}" does not exist.`);
    }
    return this.copyNode(node);
  }

  listNodes(): AttackGraphNode[] {
    return [...this.nodes.values()].map((node) => this.copyNode(node));
  }

  removeNode(nodeId: string): void {
    this.requireNode(nodeId);
    this.nodes.delete(nodeId);

    for (const [edgeId, edge] of [...this.edges.entries()]) {
      if (edge.source === nodeId || edge.target === nodeId) {
        this.edges.delete(edgeId);
      }
    }
  }

  addEdge(edge: AttackGraphEdge): void {
    this.validateEdge(edge);
    if (this.edges.has(edge.id)) {
      throw new Error(`Attack graph edge "${edge.id}" already exists.`);
    }
    this.edges.set(edge.id, this.copyEdge(edge));
  }

  connect(source: string, target: string, options: Partial<Omit<AttackGraphEdge, 'source' | 'target'>> = {}): AttackGraphEdge {
    this.requireNode(source);
    this.requireNode(target);

    if (source === target) {
      throw new Error('Attack graph edge source and target must be different nodes.');
    }

    const id = options.id ?? `${source}->${target}`;
    const edge: AttackGraphEdge = {
      id,
      source,
      target,
      description: options.description,
      probability: options.probability,
    };

    this.validateEdge(edge);
    if (this.edges.has(edge.id)) {
      throw new Error(`Attack graph edge "${edge.id}" already exists.`);
    }

    if ([...this.edges.values()].some((entry) => entry.source === source && entry.target === target)) {
      throw new Error(`Attack graph edge from "${source}" to "${target}" already exists.`);
    }

    this.edges.set(edge.id, this.copyEdge(edge));
    return this.copyEdge(edge);
  }

  getEdge(edgeId: string): AttackGraphEdge {
    const edge = this.edges.get(edgeId);
    if (!edge) {
      throw new Error(`Attack graph edge "${edgeId}" does not exist.`);
    }
    return this.copyEdge(edge);
  }

  listEdges(): AttackGraphEdge[] {
    return [...this.edges.values()].map((edge) => this.copyEdge(edge));
  }

  removeEdge(edgeId: string): void {
    if (!this.edges.has(edgeId)) {
      throw new Error(`Attack graph edge "${edgeId}" does not exist.`);
    }
    this.edges.delete(edgeId);
  }

  setNodeStatus(nodeId: string, status: AttackGraphNodeStatus): void {
    const node = this.requireNode(nodeId);
    this.validateStatus(status);
    this.nodes.set(nodeId, { ...node, status });
  }

  setNodeStage(nodeId: string, stage: string): void {
    const node = this.requireNode(nodeId);
    if (!stage || stage.trim() === '') {
      throw new Error('Attack graph node stage is required.');
    }
    this.nodes.set(nodeId, { ...node, stage });
  }

  getSourceNodes(): AttackGraphNode[] {
    const targetIds = new Set<string>();
    for (const edge of this.edges.values()) {
      targetIds.add(edge.target);
    }
    return this.listNodes().filter((node) => !targetIds.has(node.id));
  }

  getTargetNodes(): AttackGraphNode[] {
    const sourceIds = new Set<string>();
    for (const edge of this.edges.values()) {
      sourceIds.add(edge.source);
    }
    return this.listNodes().filter((node) => !sourceIds.has(node.id));
  }

  getNeighbors(nodeId: string): string[] {
    this.requireNode(nodeId);
    const neighborIds = new Set<string>();
    for (const edge of this.edges.values()) {
      if (edge.source === nodeId) {
        neighborIds.add(edge.target);
      } else if (edge.target === nodeId) {
        neighborIds.add(edge.source);
      }
    }
    return [...neighborIds].sort();
  }

  findPaths(source: string, target: string): string[][] {
    this.requireNode(source);
    this.requireNode(target);

    const results: string[][] = [];
    const visit = (currentId: string, path: string[], visited: Set<string>): void => {
      if (currentId === target) {
        results.push([...path]);
        return;
      }

      const outgoingIds = this.listEdges()
        .filter((edge) => edge.source === currentId)
        .map((edge) => edge.target)
        .sort();

      for (const nextId of outgoingIds) {
        if (visited.has(nextId)) {
          continue;
        }
        visited.add(nextId);
        visit(nextId, [...path, nextId], visited);
        visited.delete(nextId);
      }
    };

    visit(source, [source], new Set<string>([source]));
    return results;
  }

  private requireNode(nodeId: string): AttackGraphNode {
    const node = this.nodes.get(nodeId);
    if (!node) {
      throw new Error(`Attack graph node "${nodeId}" does not exist.`);
    }
    return node;
  }

  private validateNode(node: AttackGraphNode): void {
    if (!node.id || node.id.trim() === '') {
      throw new Error('Attack graph node id is required.');
    }
    if (!node.label || node.label.trim() === '') {
      throw new Error('Attack graph node label is required.');
    }
    this.validateStatus(node.status);
  }

  private validateEdge(edge: AttackGraphEdge): void {
    if (!edge.id || edge.id.trim() === '') {
      throw new Error('Attack graph edge id is required.');
    }
    if (!edge.source || edge.source.trim() === '') {
      throw new Error('Attack graph edge source is required.');
    }
    if (!edge.target || edge.target.trim() === '') {
      throw new Error('Attack graph edge target is required.');
    }
    this.requireNode(edge.source);
    this.requireNode(edge.target);
    if (edge.source === edge.target) {
      throw new Error('Attack graph edge source and target must be different nodes.');
    }
    if (edge.probability !== undefined && (!Number.isFinite(edge.probability) || edge.probability < 0 || edge.probability > 1)) {
      throw new Error('Attack graph edge probability must be a finite number between 0 and 1.');
    }
  }

  private validateStatus(status: AttackGraphNodeStatus): void {
    if (!['hidden', 'discovered', 'compromised', 'contained'].includes(status)) {
      throw new Error(`Invalid attack graph node status "${status}".`);
    }
  }

  private copyNode(node: AttackGraphNode): AttackGraphNode {
    return {
      id: node.id,
      label: node.label,
      stage: node.stage,
      status: node.status,
      metadata: node.metadata ? JSON.parse(JSON.stringify(node.metadata)) : undefined,
    };
  }

  private copyEdge(edge: AttackGraphEdge): AttackGraphEdge {
    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      description: edge.description,
      probability: edge.probability,
    };
  }
}
