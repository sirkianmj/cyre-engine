export type ObjectiveGraphNodeStatus =
  | 'locked'
  | 'available'
  | 'active'
  | 'completed'
  | 'failed';

export type ObjectiveGraphEdgeType = 'dependency' | 'sequence' | 'optional';

export interface ObjectiveGraphNode {
  id: string;
  label: string;
  status: ObjectiveGraphNodeStatus;
  metadata?: Record<string, unknown>;
}

export interface ObjectiveGraphEdge {
  id: string;
  source: string;
  target: string;
  type: ObjectiveGraphEdgeType;
}

export class ObjectiveGraphEditor {
  private readonly nodes = new Map<string, ObjectiveGraphNode>();
  private readonly edges = new Map<string, ObjectiveGraphEdge>();

  addNode(node: ObjectiveGraphNode): void {
    this.validateNode(node);
    if (this.nodes.has(node.id)) {
      throw new Error(`Objective graph node "${node.id}" already exists.`);
    }
    this.nodes.set(node.id, this.copyNode(node));
  }

  getNode(nodeId: string): ObjectiveGraphNode {
    const node = this.nodes.get(nodeId);
    if (!node) {
      throw new Error(`Objective graph node "${nodeId}" does not exist.`);
    }
    return this.copyNode(node);
  }

  listNodes(): ObjectiveGraphNode[] {
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

  connect(
    source: string,
    target: string,
    type: ObjectiveGraphEdgeType,
    options: Partial<Omit<ObjectiveGraphEdge, 'source' | 'target' | 'type'>> = {},
  ): ObjectiveGraphEdge {
    this.requireNode(source);
    this.requireNode(target);

    if (source === target) {
      throw new Error('Objective graph edge source and target must be different nodes.');
    }

    const id = options.id ?? `${source}->${target}`;
    const edge: ObjectiveGraphEdge = {
      id,
      source,
      target,
      type,
    };

    this.validateEdge(edge);

    if (this.edges.has(edge.id)) {
      throw new Error(`Objective graph edge "${edge.id}" already exists.`);
    }

    if (
      [...this.edges.values()].some(
        (entry) => entry.source === source && entry.target === target && entry.type === type,
      )
    ) {
      throw new Error(
        `Objective graph edge from "${source}" to "${target}" of type "${type}" already exists.`,
      );
    }

    this.edges.set(edge.id, this.copyEdge(edge));

    if (this.hasCycle()) {
      this.edges.delete(edge.id);
      throw new Error('Objective graph edge would create a cycle.');
    }

    return this.copyEdge(edge);
  }

  getEdge(edgeId: string): ObjectiveGraphEdge {
    const edge = this.edges.get(edgeId);
    if (!edge) {
      throw new Error(`Objective graph edge "${edgeId}" does not exist.`);
    }
    return this.copyEdge(edge);
  }

  listEdges(): ObjectiveGraphEdge[] {
    return [...this.edges.values()].map((edge) => this.copyEdge(edge));
  }

  removeEdge(edgeId: string): void {
    if (!this.edges.has(edgeId)) {
      throw new Error(`Objective graph edge "${edgeId}" does not exist.`);
    }
    this.edges.delete(edgeId);
  }

  setNodeStatus(nodeId: string, status: ObjectiveGraphNodeStatus): void {
    const node = this.requireNode(nodeId);
    this.validateStatus(status);
    this.nodes.set(nodeId, { ...node, status });
  }

  completeNode(nodeId: string): void {
    this.setNodeStatus(nodeId, 'completed');
    this.unlockSuccessors(nodeId);
  }

  failNode(nodeId: string): void {
    this.setNodeStatus(nodeId, 'failed');
  }

  getNodesByStatus(status: ObjectiveGraphNodeStatus): ObjectiveGraphNode[] {
    this.validateStatus(status);
    return this.listNodes().filter((node) => node.status === status);
  }

  getPrerequisites(nodeId: string): string[] {
    this.requireNode(nodeId);
    const prerequisites = new Set<string>();
    for (const edge of this.edges.values()) {
      if (edge.target === nodeId) {
        prerequisites.add(edge.source);
      }
    }
    return [...prerequisites].sort();
  }

  getDependents(nodeId: string): string[] {
    this.requireNode(nodeId);
    const dependents = new Set<string>();
    for (const edge of this.edges.values()) {
      if (edge.source === nodeId) {
        dependents.add(edge.target);
      }
    }
    return [...dependents].sort();
  }

  getSourceNodes(): ObjectiveGraphNode[] {
    const incomingIds = new Set<string>();
    for (const edge of this.edges.values()) {
      incomingIds.add(edge.target);
    }
    return this.listNodes().filter((node) => !incomingIds.has(node.id));
  }

  getTargetNodes(): ObjectiveGraphNode[] {
    const outgoingIds = new Set<string>();
    for (const edge of this.edges.values()) {
      outgoingIds.add(edge.source);
    }
    return this.listNodes().filter((node) => !outgoingIds.has(node.id));
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

  topologicalSort(): string[] {
    const indegree = new Map<string, number>();
    const outgoing = new Map<string, string[]>();

    for (const nodeId of this.nodes.keys()) {
      indegree.set(nodeId, 0);
      outgoing.set(nodeId, []);
    }

    for (const edge of this.edges.values()) {
      indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1);
      outgoing.get(edge.source)?.push(edge.target);
    }

    for (const targets of outgoing.values()) {
      targets.sort();
    }

    const sorted: string[] = [];
    const queue: string[] = [...this.nodes.keys()]
      .filter((nodeId) => (indegree.get(nodeId) ?? 0) === 0)
      .sort();

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      sorted.push(currentId);

      for (const targetId of outgoing.get(currentId) ?? []) {
        const nextIndegree = (indegree.get(targetId) ?? 0) - 1;
        indegree.set(targetId, nextIndegree);

        if (nextIndegree === 0) {
          queue.push(targetId);
          queue.sort();
        }
      }
    }

    if (sorted.length !== this.nodes.size) {
      throw new Error('Objective graph contains a cycle and cannot be sorted.');
    }

    return sorted;
  }

  search(query: string): ObjectiveGraphNode[] {
    const normalizedQuery = query.trim().toLowerCase();
    if (normalizedQuery === '') {
      return this.listNodes();
    }

    return this.listNodes().filter((node) => {
      const searchableText = [node.id, node.label, node.status]
        .join(' ')
        .toLowerCase();
      return searchableText.includes(normalizedQuery);
    });
  }

  private unlockSuccessors(nodeId: string): void {
    for (const targetId of this.getDependents(nodeId)) {
      const target = this.requireNode(targetId);
      if (target.status === 'completed' || target.status === 'failed') {
        continue;
      }

      const prerequisites = this.getPrerequisites(targetId);
      const allCompleted = prerequisites.every((id) => this.requireNode(id).status === 'completed');

      if (allCompleted) {
        this.nodes.set(targetId, { ...target, status: 'available' });
      }
    }
  }

  private hasCycle(): boolean {
    const visiting = new Set<string>();
    const visited = new Set<string>();

    const visit = (nodeId: string): boolean => {
      if (visiting.has(nodeId)) {
        return true;
      }
      if (visited.has(nodeId)) {
        return false;
      }

      visiting.add(nodeId);
      for (const dependentId of this.getDependents(nodeId)) {
        if (visit(dependentId)) {
          return true;
        }
      }
      visiting.delete(nodeId);
      visited.add(nodeId);
      return false;
    };

    for (const nodeId of this.nodes.keys()) {
      if (visit(nodeId)) {
        return true;
      }
    }

    return false;
  }

  private requireNode(nodeId: string): ObjectiveGraphNode {
    const node = this.nodes.get(nodeId);
    if (!node) {
      throw new Error(`Objective graph node "${nodeId}" does not exist.`);
    }
    return node;
  }

  private validateNode(node: ObjectiveGraphNode): void {
    if (!node.id || node.id.trim() === '') {
      throw new Error('Objective graph node id is required.');
    }
    if (!node.label || node.label.trim() === '') {
      throw new Error('Objective graph node label is required.');
    }
    this.validateStatus(node.status);
  }

  private validateEdge(edge: ObjectiveGraphEdge): void {
    if (!edge.id || edge.id.trim() === '') {
      throw new Error('Objective graph edge id is required.');
    }
    if (!edge.source || edge.source.trim() === '') {
      throw new Error('Objective graph edge source is required.');
    }
    if (!edge.target || edge.target.trim() === '') {
      throw new Error('Objective graph edge target is required.');
    }
    this.requireNode(edge.source);
    this.requireNode(edge.target);

    if (edge.source === edge.target) {
      throw new Error('Objective graph edge source and target must be different nodes.');
    }

    if (!['dependency', 'sequence', 'optional'].includes(edge.type)) {
      throw new Error(`Invalid objective graph edge type "${edge.type}".`);
    }
  }

  private validateStatus(status: ObjectiveGraphNodeStatus): void {
    if (!['locked', 'available', 'active', 'completed', 'failed'].includes(status)) {
      throw new Error(`Invalid objective graph node status "${status}".`);
    }
  }

  private copyNode(node: ObjectiveGraphNode): ObjectiveGraphNode {
    return {
      id: node.id,
      label: node.label,
      status: node.status,
      metadata: node.metadata ? JSON.parse(JSON.stringify(node.metadata)) : undefined,
    };
  }

  private copyEdge(edge: ObjectiveGraphEdge): ObjectiveGraphEdge {
    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: edge.type,
    };
  }
}
