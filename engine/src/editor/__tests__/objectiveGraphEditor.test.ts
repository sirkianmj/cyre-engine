import { describe, it, expect } from 'vitest';
import { ObjectiveGraphEditor } from '../ObjectiveGraphEditor.js';

function createEditor(): ObjectiveGraphEditor {
  const editor = new ObjectiveGraphEditor();
  editor.addNode({ id: 'detect', label: 'Detect Incident', status: 'completed' });
  editor.addNode({ id: 'investigate', label: 'Investigate Incident', status: 'available' });
  editor.addNode({ id: 'identify', label: 'Identify Account', status: 'locked' });
  editor.addNode({ id: 'contain', label: 'Contain Incident', status: 'locked' });
  editor.addNode({ id: 'recover', label: 'Recover Systems', status: 'locked' });
  editor.connect('detect', 'investigate', 'dependency', { id: 'e1' });
  editor.connect('investigate', 'identify', 'dependency', { id: 'e2' });
  editor.connect('identify', 'contain', 'dependency', { id: 'e3' });
  editor.connect('contain', 'recover', 'dependency', { id: 'e4' });
  return editor;
}

describe('ObjectiveGraphEditor', () => {
  it('adds and lists objective nodes', () => {
    const editor = createEditor();
    expect(editor.listNodes()).toHaveLength(5);
    expect(editor.getNode('detect').status).toBe('completed');
  });

  it('rejects duplicate nodes', () => {
    const editor = createEditor();
    expect(() =>
      editor.addNode({ id: 'detect', label: 'Duplicate Detect', status: 'locked' }),
    ).toThrow(/already exists/);
  });

  it('rejects invalid node id and label', () => {
    const editor = new ObjectiveGraphEditor();
    expect(() => editor.addNode({ id: '', label: 'Bad', status: 'locked' })).toThrow(/id is required/);
    expect(() => editor.addNode({ id: 'bad', label: '   ', status: 'locked' })).toThrow(/label is required/);
  });

  it('rejects invalid node status', () => {
    const editor = new ObjectiveGraphEditor();
    expect(() =>
      editor.addNode({ id: 'bad', label: 'Bad', status: 'invalid' as any }),
    ).toThrow(/Invalid objective graph node status/);
  });

  it('connects nodes with typed dependency edges', () => {
    const editor = new ObjectiveGraphEditor();
    editor.addNode({ id: 'a', label: 'A', status: 'locked' });
    editor.addNode({ id: 'b', label: 'B', status: 'locked' });
    const edge = editor.connect('a', 'b', 'sequence', { id: 'edge-ab' });
    expect(edge.id).toBe('edge-ab');
    expect(editor.getEdge('edge-ab').type).toBe('sequence');
  });

  it('rejects connecting missing nodes', () => {
    const editor = createEditor();
    expect(() => editor.connect('detect', 'missing', 'dependency')).toThrow(/does not exist/);
  });

  it('rejects duplicate typed edges', () => {
    const editor = createEditor();
    expect(() => editor.connect('detect', 'investigate', 'dependency')).toThrow(/already exists/);
  });

  it('rejects self-loop edges', () => {
    const editor = createEditor();
    expect(() => editor.connect('detect', 'detect', 'dependency')).toThrow(/must be different nodes/);
  });

  it('rejects edges that create cycles', () => {
    const editor = createEditor();
    expect(() => editor.connect('recover', 'detect', 'dependency')).toThrow(/would create a cycle/);
  });

  it('removes a node and its connected edges', () => {
    const editor = createEditor();
    editor.removeNode('identify');
    expect(editor.listNodes()).toHaveLength(4);
    expect(editor.listEdges()).toHaveLength(2);
  });

  it('returns prerequisites and dependents', () => {
    const editor = createEditor();
    expect(editor.getPrerequisites('contain')).toEqual(['identify']);
    expect(editor.getDependents('investigate')).toEqual(['identify']);
  });

  it('determines source and target nodes', () => {
    const editor = createEditor();
    expect(editor.getSourceNodes().map((node) => node.id)).toEqual(['detect']);
    expect(editor.getTargetNodes().map((node) => node.id)).toEqual(['recover']);
  });

  it('finds paths between objectives', () => {
    const editor = createEditor();
    expect(editor.findPaths('detect', 'recover')).toEqual([
      ['detect', 'investigate', 'identify', 'contain', 'recover'],
    ]);
  });

  it('returns empty paths when no route exists', () => {
    const editor = createEditor();
    expect(editor.findPaths('recover', 'detect')).toEqual([]);
  });

  it('topologically sorts objectives', () => {
    const editor = createEditor();
    expect(editor.topologicalSort()).toEqual([
      'detect',
      'investigate',
      'identify',
      'contain',
      'recover',
    ]);
  });

  it('completes a node and unlocks successors when prerequisites are met', () => {
    const editor = createEditor();
    editor.completeNode('investigate');
    expect(editor.getNode('investigate').status).toBe('completed');
    expect(editor.getNode('identify').status).toBe('available');
  });

  it('does not unlock successors if prerequisites are incomplete', () => {
    const editor = new ObjectiveGraphEditor();
    editor.addNode({ id: 'a', label: 'A', status: 'active' });
    editor.addNode({ id: 'b', label: 'B', status: 'locked' });
    editor.addNode({ id: 'c', label: 'C', status: 'locked' });
    editor.connect('a', 'c', 'dependency');
    editor.connect('b', 'c', 'dependency');
    editor.completeNode('a');
    expect(editor.getNode('c').status).toBe('locked');
    editor.completeNode('b');
    expect(editor.getNode('c').status).toBe('available');
  });

  it('fails a node and persists failed status', () => {
    const editor = createEditor();
    editor.failNode('investigate');
    expect(editor.getNode('investigate').status).toBe('failed');
  });

  it('searches nodes by id, label, and status', () => {
    const editor = createEditor();
    expect(editor.search('account').map((node) => node.id)).toEqual(['identify']);
    expect(editor.search('completed').map((node) => node.id)).toEqual(['detect']);
    expect(editor.search('').length).toBe(5);
  });

  it('returns node and edge copies', () => {
    const editor = createEditor();
    const nodes = editor.listNodes();
    nodes[0].label = 'Mutated';
    expect(editor.getNode('detect').label).toBe('Detect Incident');

    const edges = editor.listEdges();
    edges[0].type = 'optional';
    expect(editor.getEdge('e1').type).toBe('dependency');
  });
});
