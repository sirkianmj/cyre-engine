export type ProjectNodeType = 'folder' | 'scenario' | 'mission' | 'asset' | 'scene';

export interface ProjectNode {
  id: string;
  name: string;
  type: ProjectNodeType;
  parentId?: string;
  metadata?: Record<string, unknown>;
}

export class ProjectExplorer {
  private readonly nodes = new Map<string, ProjectNode>();

  addNode(node: ProjectNode): void {
    this.validateNode(node);

    if (this.nodes.has(node.id)) {
      throw new Error(`Project node "${node.id}" already exists.`);
    }

    if (node.parentId !== undefined) {
      this.requireNode(node.parentId);
    }

    this.nodes.set(node.id, this.copyNode(node));
  }

  getNode(nodeId: string): ProjectNode {
    const node = this.nodes.get(nodeId);
    if (!node) {
      throw new Error(`Project node "${nodeId}" does not exist.`);
    }
    return this.copyNode(node);
  }

  listNodes(): ProjectNode[] {
    return [...this.nodes.values()].map((node) => this.copyNode(node));
  }

  getChildren(parentId?: string): ProjectNode[] {
    return this.listNodes()
      .filter((node) => node.parentId === parentId)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  removeNode(nodeId: string): void {
    this.requireNode(nodeId);
    const descendantIds = this.getDescendantIds(nodeId);
    for (const id of descendantIds) {
      this.nodes.delete(id);
    }
  }

  renameNode(nodeId: string, newName: string): void {
    const node = this.requireNode(nodeId);
    if (!newName || newName.trim() === '') {
      throw new Error('Project node name is required.');
    }
    this.nodes.set(nodeId, { ...node, name: newName });
  }

  moveNode(nodeId: string, newParentId?: string): void {
    this.requireNode(nodeId);

    if (newParentId !== undefined) {
      this.requireNode(newParentId);
      if (newParentId === nodeId) {
        throw new Error('Project node cannot be moved into itself.');
      }

      let currentParentId: string | undefined = newParentId;
      while (currentParentId !== undefined) {
        if (currentParentId === nodeId) {
          throw new Error('Project node cannot be moved into one of its descendants.');
        }
        const parent = this.nodes.get(currentParentId);
        currentParentId = parent ? parent.parentId : undefined;
      }
    }

    const node = this.requireNode(nodeId);
    this.nodes.set(nodeId, { ...node, parentId: newParentId });
  }

  duplicateNode(nodeId: string, newId: string, newName?: string): ProjectNode {
    const source = this.requireNode(nodeId);

    if (!newId || newId.trim() === '') {
      throw new Error('Duplicate node id is required.');
    }
    if (this.nodes.has(newId)) {
      throw new Error(`Project node "${newId}" already exists.`);
    }

    const duplicateRoot = this.duplicateSubtree(
      source,
      newId,
      newName ?? `${source.name} Copy`,
      source.parentId,
    );

    this.nodes.set(duplicateRoot.id, duplicateRoot);
    return this.copyNode(duplicateRoot);
  }

  search(query: string): ProjectNode[] {
    const normalizedQuery = query.trim().toLowerCase();
    if (normalizedQuery === '') {
      return this.listNodes();
    }

    return this.listNodes().filter((node) => {
      const searchableText = [
        node.id,
        node.name,
        node.type,
        ...this.metadataToSearchableStrings(node.metadata),
      ]
        .join(' ')
        .toLowerCase();
      return searchableText.includes(normalizedQuery);
    });
  }

  filterByType(type: ProjectNodeType): ProjectNode[] {
    return this.listNodes().filter((node) => node.type === type);
  }

  getPath(nodeId: string): string[] {
    this.requireNode(nodeId);
    const path: string[] = [];
    let currentNode: ProjectNode | undefined = this.nodes.get(nodeId);

    while (currentNode) {
      path.unshift(currentNode.id);
      currentNode = currentNode.parentId ? this.nodes.get(currentNode.parentId) : undefined;
    }

    return path;
  }

  setMetadata(nodeId: string, metadata: Record<string, unknown>): void {
    const node = this.requireNode(nodeId);
    this.nodes.set(nodeId, {
      ...node,
      metadata: { ...metadata },
    });
  }

  private duplicateSubtree(
    source: ProjectNode,
    newId: string,
    newName: string,
    parentId: string | undefined,
  ): ProjectNode {
    const duplicate: ProjectNode = {
      id: newId,
      name: newName,
      type: source.type,
      parentId,
      metadata: source.metadata ? { ...source.metadata } : undefined,
    };

    const childIds = this.getChildren(source.id).map((child) => child.id);
    for (const childId of childIds) {
      const child = this.requireNode(childId);
      const childDuplicate = this.duplicateSubtree(
        child,
        `${newId}-${child.id}`,
        child.name,
        newId,
      );
      this.nodes.set(childDuplicate.id, childDuplicate);
    }

    return duplicate;
  }

  private getDescendantIds(nodeId: string): string[] {
    const descendantIds: string[] = [];
    const visit = (currentId: string): void => {
      for (const child of this.getChildren(currentId)) {
        descendantIds.push(child.id);
        visit(child.id);
      }
    };
    visit(nodeId);
    descendantIds.push(nodeId);
    return descendantIds;
  }

  private requireNode(nodeId: string): ProjectNode {
    const node = this.nodes.get(nodeId);
    if (!node) {
      throw new Error(`Project node "${nodeId}" does not exist.`);
    }
    return node;
  }

  private copyNode(node: ProjectNode): ProjectNode {
    return {
      id: node.id,
      name: node.name,
      type: node.type,
      parentId: node.parentId,
      metadata: node.metadata ? { ...node.metadata } : undefined,
    };
  }

  private metadataToSearchableStrings(metadata?: Record<string, unknown>): string[] {
    if (!metadata) {
      return [];
    }
    return Object.entries(metadata).map(([key, value]) => `${key} ${String(value)}`);
  }

  private validateNode(node: ProjectNode): void {
    if (!node.id || node.id.trim() === '') {
      throw new Error('Project node id is required.');
    }
    if (!node.name || node.name.trim() === '') {
      throw new Error('Project node name is required.');
    }
    if (!['folder', 'scenario', 'mission', 'asset', 'scene'].includes(node.type)) {
      throw new Error(`Invalid project node type "${node.type}".`);
    }
  }
}
