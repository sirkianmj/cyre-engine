export type NetworkGraphNodeType =
  | 'host'
  | 'server'
  | 'client'
  | 'router'
  | 'firewall'
  | 'database'
  | 'service'
  | 'network'
  | 'other';

export interface NetworkGraphNode {
  id: string;
  label: string;
  type: NetworkGraphNodeType;
  subnet?: string;
  zone?: string;
  group?: string;
  position?: { x: number; y: number };
  metadata?: Record<string, unknown>;
}

export interface NetworkGraphEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  weight?: number;
  bidirectional?: boolean;
}

export class NetworkGraphEditor {
  private readonly nodes = new Map<string, NetworkGraphNode>();
  private readonly edges = new Map<string, NetworkGraphEdge>();

  addNode(node: NetworkGraphNode): void {
    this.validateNode(node);
    if (this.nodes.has(node.id)) {
      throw new Error(`Network graph node "${node.id}" already exists.`);
    }
    this.nodes.set(node.id, this.copyNode(node));
  }

  getNode(nodeId: string): NetworkGraphNode {
    const node = this.nodes.get(nodeId);
    if (!node) {
      throw new Error(`Network graph node "${nodeId}" does not exist.`);
    }
    return this.copyNode(node);
  }

  listNodes(): NetworkGraphNode[] {
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

  addEdge(edge: NetworkGraphEdge): void {
    this.validateEdge(edge);
    if (this.edges.has(edge.id)) {
      throw new Error(`Network graph edge "${edge.id}" already exists.`);
    }
    this.edges.set(edge.id, this.copyEdge(edge));
  }

  connect(source: string, target: string, options: Partial<Omit<NetworkGraphEdge, 'source' | 'target'>> = {}): NetworkGraphEdge {
    this.requireNode(source);
    this.requireNode(target);

    if (source === target) {
      throw new Error('Network graph edge source and target must be different nodes.');
    }

    const id = options.id ?? `${source}->${target}`;
    const edge: NetworkGraphEdge = {
      id,
      source,
      target,
      type: options.type,
      weight: options.weight,
      bidirectional: options.bidirectional ?? false,
    };

    this.validateEdge(edge);
    if (this.edges.has(edge.id)) {
      throw new Error(`Network graph edge "${edge.id}" already exists.`);
    }

    if ([...this.edges.values()].some((entry) => entry.source === source && entry.target === target)) {
      throw new Error(`Network graph edge from "${source}" to "${target}" already exists.`);
    }

    this.edges.set(edge.id, this.copyEdge(edge));
    return this.copyEdge(edge);
  }

  getEdge(edgeId: string): NetworkGraphEdge {
    const edge = this.edges.get(edgeId);
    if (!edge) {
      throw new Error(`Network graph edge "${edgeId}" does not exist.`);
    }
    return this.copyEdge(edge);
  }

  listEdges(): NetworkGraphEdge[] {
    return [...this.edges.values()].map((edge) => this.copyEdge(edge));
  }

  removeEdge(edgeId: string): void {
    if (!this.edges.has(edgeId)) {
      throw new Error(`Network graph edge "${edgeId}" does not exist.`);
    }
    this.edges.delete(edgeId);
  }

  getConnectedEdges(nodeId: string): NetworkGraphEdge[] {
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

  setSubnet(nodeId: string, subnet: string): void {
    this.requireNode(nodeId);
    if (!subnet || subnet.trim() === '') {
      throw new Error('Network graph node subnet is required.');
    }
    const node = this.getNode(nodeId);
    this.nodes.set(nodeId, { ...node, subnet });
  }

  setZone(nodeId: string, zone: string): void {
    this.requireNode(nodeId);
    if (!zone || zone.trim() === '') {
      throw new Error('Network graph node zone is required.');
    }
    const node = this.getNode(nodeId);
    this.nodes.set(nodeId, { ...node, zone });
  }

  setGroup(nodeId: string, group: string): void {
    this.requireNode(nodeId);
    if (!group || group.trim() === '') {
      throw new Error('Network graph node group is required.');
    }
    const node = this.getNode(nodeId);
    this.nodes.set(nodeId, { ...node, group });
  }

  getNodesBySubnet(subnet: string): NetworkGraphNode[] {
    return this.listNodes().filter((node) => node.subnet === subnet);
  }

  getNodesByZone(zone: string): NetworkGraphNode[] {
    return this.listNodes().filter((node) => node.zone === zone);
  }

  getNodesByGroup(group: string): NetworkGraphNode[] {
    return this.listNodes().filter((node) => node.group === group);
  }

  search(query: string): NetworkGraphNode[] {
    const normalizedQuery = query.trim().toLowerCase();
    if (normalizedQuery === '') {
      return this.listNodes();
    }

    return this.listNodes().filter((node) => {
      const searchableText = [
        node.id,
        node.label,
        node.type,
        node.subnet ?? '',
        node.zone ?? '',
        node.group ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return searchableText.includes(normalizedQuery);
    });
  }

  autoLayout(): void {
    const nodeIds = [...this.nodes.keys()];
    const incomingTargets = new Set<string>();
    for (const edge of this.edges.values()) {
      incomingTargets.add(edge.target);
    }

    const roots = nodeIds.filter((nodeId) => !incomingTargets.has(nodeId));
    const startRoots = roots.length > 0 ? roots : [nodeIds[0]];
    const levelMap = new Map<string, number>();
    const visited = new Set<string>();
    const queue: string[] = [...startRoots];

    for (const root of startRoots) {
      levelMap.set(root, 0);
    }

    let head = 0;
    while (head < queue.length) {
      const currentId = queue[head];
      head += 1;

      if (visited.has(currentId)) {
        continue;
      }
      visited.add(currentId);

      const currentLevel = levelMap.get(currentId) ?? 0;
      for (const edge of this.edges.values()) {
        if (edge.source !== currentId) {
          continue;
        }

        const targetLevel = levelMap.get(edge.target);
        if (targetLevel === undefined || targetLevel < currentLevel + 1) {
          levelMap.set(edge.target, currentLevel + 1);
        }

        if (!visited.has(edge.target)) {
          queue.push(edge.target);
        }
      }
    }

    let fallbackLevel = Math.max(0, ...levelMap.values());
    for (const nodeId of nodeIds) {
      if (!visited.has(nodeId)) {
        levelMap.set(nodeId, fallbackLevel);
        visited.add(nodeId);
      }
    }

    const levelEntries = new Map<number, string[]>();
    for (const nodeId of nodeIds) {
      const level = levelMap.get(nodeId) ?? fallbackLevel;
      const entries = levelEntries.get(level) ?? [];
      entries.push(nodeId);
      levelEntries.set(level, entries);
    }

    const sortedLevels = [...levelEntries.keys()].sort((a, b) => a - b);
    for (const level of sortedLevels) {
      const ids = levelEntries.get(level) ?? [];
      ids.sort();
      ids.forEach((nodeId, index) => {
        const node = this.getNode(nodeId);
        this.nodes.set(nodeId, {
          ...node,
          position: {
            x: level * 180,
            y: index * 120,
          },
        });
      });
    }
  }

  private requireNode(nodeId: string): NetworkGraphNode {
    const node = this.nodes.get(nodeId);
    if (!node) {
      throw new Error(`Network graph node "${nodeId}" does not exist.`);
    }
    return node;
  }

  private validateNode(node: NetworkGraphNode): void {
    if (!node.id || node.id.trim() === '') {
      throw new Error('Network graph node id is required.');
    }
    if (!node.label || node.label.trim() === '') {
      throw new Error('Network graph node label is required.');
    }
    if (!['host', 'server', 'client', 'router', 'firewall', 'database', 'service', 'network', 'other'].includes(node.type)) {
      throw new Error(`Invalid network graph node type "${node.type}".`);
    }
  }

  private validateEdge(edge: NetworkGraphEdge): void {
    if (!edge.id || edge.id.trim() === '') {
      throw new Error('Network graph edge id is required.');
    }
    if (!edge.source || edge.source.trim() === '') {
      throw new Error('Network graph edge source is required.');
    }
    if (!edge.target || edge.target.trim() === '') {
      throw new Error('Network graph edge target is required.');
    }
    this.requireNode(edge.source);
    this.requireNode(edge.target);
    if (edge.source === edge.target) {
      throw new Error('Network graph edge source and target must be different nodes.');
    }
    if (edge.weight !== undefined && (!Number.isFinite(edge.weight) || edge.weight < 0)) {
      throw new Error('Network graph edge weight must be a non-negative finite number.');
    }
  }

  private copyNode(node: NetworkGraphNode): NetworkGraphNode {
    return {
      id: node.id,
      label: node.label,
      type: node.type,
      subnet: node.subnet,
      zone: node.zone,
      group: node.group,
      position: node.position ? { ...node.position } : undefined,
      metadata: node.metadata ? JSON.parse(JSON.stringify(node.metadata)) : undefined,
    };
  }

  private copyEdge(edge: NetworkGraphEdge): NetworkGraphEdge {
    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: edge.type,
      weight: edge.weight,
      bidirectional: edge.bidirectional,
    };
  }
}
