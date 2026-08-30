export type EvidenceNodeType =
  | 'alert'
  | 'log'
  | 'host'
  | 'account'
  | 'session'
  | 'file'
  | 'process'
  | 'network'
  | 'actor'
  | 'evidence';

export type EvidenceRelationType =
  | 'generated'
  | 'references'
  | 'contains'
  | 'authenticated'
  | 'belongs_to'
  | 'communicates_with'
  | 'executed'
  | 'modified'
  | 'detected_by';

export interface EvidenceGraphNode {
  id: string;
  label: string;
  type: EvidenceNodeType;
  timestamp?: number;
  metadata?: Record<string, unknown>;
}

export interface EvidenceGraphEdge {
  id: string;
  source: string;
  target: string;
  type: EvidenceRelationType;
  confidence?: number;
}

export class EvidenceGraphEditor {
  private readonly nodes = new Map<string, EvidenceGraphNode>();
  private readonly edges = new Map<string, EvidenceGraphEdge>();

  addNode(node: EvidenceGraphNode): void {
    this.validateNode(node);
    if (this.nodes.has(node.id)) {
      throw new Error(`Evidence graph node "${node.id}" already exists.`);
    }
    this.nodes.set(node.id, this.copyNode(node));
  }

  getNode(nodeId: string): EvidenceGraphNode {
    const node = this.nodes.get(nodeId);
    if (!node) {
      throw new Error(`Evidence graph node "${nodeId}" does not exist.`);
    }
    return this.copyNode(node);
  }

  listNodes(): EvidenceGraphNode[] {
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

  addEdge(edge: EvidenceGraphEdge): void {
    this.validateEdge(edge);
    if (this.edges.has(edge.id)) {
      throw new Error(`Evidence graph edge "${edge.id}" already exists.`);
    }
    this.edges.set(edge.id, this.copyEdge(edge));
  }

  connect(source: string, target: string, type: EvidenceRelationType, options: Partial<Omit<EvidenceGraphEdge, 'source' | 'target' | 'type'>> = {}): EvidenceGraphEdge {
    this.requireNode(source);
    this.requireNode(target);

    if (source === target) {
      throw new Error('Evidence graph edge source and target must be different nodes.');
    }

    const id = options.id ?? `${source}-${type}->${target}`;
    const edge: EvidenceGraphEdge = {
      id,
      source,
      target,
      type,
      confidence: options.confidence,
    };

    this.validateEdge(edge);
    if (this.edges.has(edge.id)) {
      throw new Error(`Evidence graph edge "${edge.id}" already exists.`);
    }

    if ([...this.edges.values()].some((entry) => entry.source === source && entry.target === target && entry.type === type)) {
      throw new Error(`Evidence graph edge from "${source}" to "${target}" of type "${type}" already exists.`);
    }

    this.edges.set(edge.id, this.copyEdge(edge));
    return this.copyEdge(edge);
  }

  getEdge(edgeId: string): EvidenceGraphEdge {
    const edge = this.edges.get(edgeId);
    if (!edge) {
      throw new Error(`Evidence graph edge "${edgeId}" does not exist.`);
    }
    return this.copyEdge(edge);
  }

  listEdges(): EvidenceGraphEdge[] {
    return [...this.edges.values()].map((edge) => this.copyEdge(edge));
  }

  removeEdge(edgeId: string): void {
    if (!this.edges.has(edgeId)) {
      throw new Error(`Evidence graph edge "${edgeId}" does not exist.`);
    }
    this.edges.delete(edgeId);
  }

  getConnectedEdges(nodeId: string): EvidenceGraphEdge[] {
    this.requireNode(nodeId);
    return this.listEdges().filter((edge) => edge.source === nodeId || edge.target === nodeId);
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

  findByType(type: EvidenceNodeType): EvidenceGraphNode[] {
    return this.listNodes().filter((node) => node.type === type);
  }

  findByRelation(type: EvidenceRelationType): EvidenceGraphEdge[] {
    return this.listEdges().filter((edge) => edge.type === type);
  }

  search(query: string): EvidenceGraphNode[] {
    const normalizedQuery = query.trim().toLowerCase();
    if (normalizedQuery === '') {
      return this.listNodes();
    }

    return this.listNodes().filter((node) => {
      const searchableText = [
        node.id,
        node.label,
        node.type,
      ]
        .join(' ')
        .toLowerCase();
      return searchableText.includes(normalizedQuery);
    });
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

  private requireNode(nodeId: string): EvidenceGraphNode {
    const node = this.nodes.get(nodeId);
    if (!node) {
      throw new Error(`Evidence graph node "${nodeId}" does not exist.`);
    }
    return node;
  }

  private validateNode(node: EvidenceGraphNode): void {
    if (!node.id || node.id.trim() === '') {
      throw new Error('Evidence graph node id is required.');
    }
    if (!node.label || node.label.trim() === '') {
      throw new Error('Evidence graph node label is required.');
    }
    if (!['alert', 'log', 'host', 'account', 'session', 'file', 'process', 'network', 'actor', 'evidence'].includes(node.type)) {
      throw new Error(`Invalid evidence graph node type "${node.type}".`);
    }
    if (node.timestamp !== undefined && (!Number.isFinite(node.timestamp) || node.timestamp < 0)) {
      throw new Error('Evidence graph node timestamp must be a non-negative finite number.');
    }
  }

  private validateEdge(edge: EvidenceGraphEdge): void {
    if (!edge.id || edge.id.trim() === '') {
      throw new Error('Evidence graph edge id is required.');
    }
    if (!edge.source || edge.source.trim() === '') {
      throw new Error('Evidence graph edge source is required.');
    }
    if (!edge.target || edge.target.trim() === '') {
      throw new Error('Evidence graph edge target is required.');
    }
    this.requireNode(edge.source);
    this.requireNode(edge.target);
    if (edge.source === edge.target) {
      throw new Error('Evidence graph edge source and target must be different nodes.');
    }
    if (!['generated', 'references', 'contains', 'authenticated', 'belongs_to', 'communicates_with', 'executed', 'modified', 'detected_by'].includes(edge.type)) {
      throw new Error(`Invalid evidence relation type "${edge.type}".`);
    }
    if (edge.confidence !== undefined && (!Number.isFinite(edge.confidence) || edge.confidence < 0 || edge.confidence > 1)) {
      throw new Error('Evidence graph edge confidence must be a finite number between 0 and 1.');
    }
  }

  private copyNode(node: EvidenceGraphNode): EvidenceGraphNode {
    return {
      id: node.id,
      label: node.label,
      type: node.type,
      timestamp: node.timestamp,
      metadata: node.metadata ? JSON.parse(JSON.stringify(node.metadata)) : undefined,
    };
  }

  private copyEdge(edge: EvidenceGraphEdge): EvidenceGraphEdge {
    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: edge.type,
      confidence: edge.confidence,
    };
  }
}
