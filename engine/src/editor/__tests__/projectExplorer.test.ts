import { describe, it, expect } from 'vitest';
import { ProjectExplorer, type ProjectNode } from '../ProjectExplorer.js';

function createExplorer(): ProjectExplorer {
  const explorer = new ProjectExplorer();
  explorer.addNode({ id: 'root', name: 'CYRE Project', type: 'folder' });
  explorer.addNode({ id: 'scenarios', name: 'Scenarios', type: 'folder', parentId: 'root' });
  explorer.addNode({ id: 'missions', name: 'Missions', type: 'folder', parentId: 'root' });
  explorer.addNode({
    id: 'scenario-001',
    name: 'Compromised Employee',
    type: 'scenario',
    parentId: 'scenarios',
    metadata: { author: 'CYRE', difficulty: 'medium' },
  });
  explorer.addNode({
    id: 'scenario-002',
    name: 'Ransomware Outbreak',
    type: 'scenario',
    parentId: 'scenarios',
    metadata: { author: 'CYRE', difficulty: 'hard' },
  });
  explorer.addNode({ id: 'mission-001', name: 'Mission 001', type: 'mission', parentId: 'missions' });
  return explorer;
}

describe('ProjectExplorer', () => {
  it('adds and lists project nodes', () => {
    const explorer = createExplorer();
    expect(explorer.listNodes()).toHaveLength(6);
  });

  it('rejects duplicate node ids', () => {
    const explorer = createExplorer();
    expect(() => explorer.addNode({ id: 'root', name: 'Duplicate Root', type: 'folder' })).toThrow(
      /already exists/,
    );
  });

  it('rejects invalid node id and name', () => {
    const explorer = new ProjectExplorer();
    expect(() => explorer.addNode({ id: '', name: 'Bad', type: 'folder' })).toThrow(
      /Project node id is required/,
    );
    expect(() => explorer.addNode({ id: 'bad-name', name: '   ', type: 'folder' })).toThrow(
      /Project node name is required/,
    );
  });

  it('rejects invalid node type', () => {
    const explorer = new ProjectExplorer();
    expect(() =>
      explorer.addNode({ id: 'bad', name: 'Bad Type', type: 'invalid' as ProjectNode['type'] }),
    ).toThrow(/Invalid project node type/);
  });

  it('returns children sorted by name', () => {
    const explorer = createExplorer();
    const rootChildren = explorer.getChildren('root');
    expect(rootChildren.map((node) => node.id)).toEqual(['missions', 'scenarios']);
  });

  it('renames a node', () => {
    const explorer = createExplorer();
    explorer.renameNode('scenario-001', 'Employee Compromise');
    expect(explorer.getNode('scenario-001').name).toBe('Employee Compromise');
  });

  it('moves a node to a new parent', () => {
    const explorer = createExplorer();
    explorer.addNode({ id: 'archive', name: 'Archive', type: 'folder', parentId: 'root' });
    explorer.moveNode('scenario-001', 'archive');
    expect(explorer.getNode('scenario-001').parentId).toBe('archive');
    expect(explorer.getChildren('archive').map((node) => node.id)).toEqual(['scenario-001']);
  });

  it('prevents moving a node into its descendant', () => {
    const explorer = createExplorer();
    explorer.addNode({ id: 'nested', name: 'Nested', type: 'folder', parentId: 'scenarios' });
    expect(() => explorer.moveNode('scenarios', 'nested')).toThrow(/descendants/);
  });

  it('duplicates a node and its children', () => {
    const explorer = createExplorer();
    const duplicate = explorer.duplicateNode('scenarios', 'scenarios-copy', 'Scenarios Copy');
    expect(duplicate.id).toBe('scenarios-copy');
    expect(duplicate.name).toBe('Scenarios Copy');
    const copiedChildren = explorer.getChildren('scenarios-copy');
    expect(copiedChildren.map((node) => node.id)).toEqual([
      'scenarios-copy-scenario-001',
      'scenarios-copy-scenario-002',
    ]);
  });

  it('searches by id, name, type, and metadata', () => {
    const explorer = createExplorer();
    expect(explorer.search('ransomware').map((node) => node.id)).toEqual(['scenario-002']);
    expect(explorer.search('mission').map((node) => node.id)).toEqual(['missions', 'mission-001']);
    expect(explorer.search('hard').map((node) => node.id)).toEqual(['scenario-002']);
  });

  it('filters nodes by type', () => {
    const explorer = createExplorer();
    expect(explorer.filterByType('scenario').map((node) => node.id)).toEqual([
      'scenario-001',
      'scenario-002',
    ]);
  });

  it('returns the path from root to node', () => {
    const explorer = createExplorer();
    expect(explorer.getPath('scenario-001')).toEqual(['root', 'scenarios', 'scenario-001']);
  });

  it('sets metadata independently', () => {
    const explorer = createExplorer();
    explorer.setMetadata('scenario-001', { severity: 'high' });
    expect(explorer.getNode('scenario-001').metadata).toEqual({ severity: 'high' });
  });

  it('removes a node and its descendants', () => {
    const explorer = createExplorer();
    explorer.removeNode('scenarios');
    expect(() => explorer.getNode('scenarios')).toThrow(/does not exist/);
    expect(() => explorer.getNode('scenario-001')).toThrow(/does not exist/);
    expect(explorer.listNodes().map((node) => node.id)).toEqual([
      'root',
      'missions',
      'mission-001',
    ]);
  });
});
