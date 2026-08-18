import { describe, it, expect } from 'vitest';
import { EvidenceGraphEditor } from '../EvidenceGraphEditor.js';

function createEditor(): EvidenceGraphEditor {
  const editor = new EvidenceGraphEditor();
  editor.addNode({ id: 'alert-1', label: 'Multiple failed logins', type: 'alert', timestamp: 190 });
  editor.addNode({ id: 'account-alice', label: 'alice.johnson', type: 'account' });
  editor.addNode({ id: 'host-pc', label: 'Employee PC', type: 'host' });
  editor.addNode({ id: 'log-4625', label: 'Windows Event 4625', type: 'log', timestamp: 200 });
  editor.connect('alert-1', 'log-4625', 'generated', { id: 'e1', confidence: 0.95 });
  editor.connect('log-4625', 'account-alice', 'authenticated', { id: 'e2', confidence: 0.9 });
  editor.connect('account-alice', 'host-pc', 'belongs_to', { id: 'e3', confidence: 0.85 });
  return editor;
}

describe('EvidenceGraphEditor', () => {
  it('adds and lists evidence graph nodes', () => {
    const editor = createEditor();
    expect(editor.listNodes()).toHaveLength(4);
    expect(editor.getNode('alert-1').type).toBe('alert');
  });

  it('rejects duplicate nodes', () => {
    const editor = createEditor();
    expect(() =>
      editor.addNode({ id: 'alert-1', label: 'Duplicate Alert', type: 'alert' }),
    ).toThrow(/already exists/);
  });

  it('rejects invalid node id and label', () => {
    const editor = new EvidenceGraphEditor();
    expect(() => editor.addNode({ id: '', label: 'Bad', type: 'log' })).toThrow(/id is required/);
    expect(() => editor.addNode({ id: 'bad', label: '   ', type: 'log' })).toThrow(/label is required/);
  });

  it('rejects invalid node type', () => {
    const editor = new EvidenceGraphEditor();
    expect(() =>
      editor.addNode({ id: 'bad', label: 'Bad', type: 'invalid' as any }),
    ).toThrow(/Invalid evidence graph node type/);
  });

  it('connects evidence nodes with typed edges', () => {
    const editor = createEditor();
    const edge = editor.connect('host-pc', 'alert-1', 'references', {
      id: 'edge-host-alert',
      confidence: 0.5,
    });
    expect(edge.id).toBe('edge-host-alert');
    expect(editor.getEdge('edge-host-alert').type).toBe('references');
    expect(editor.getEdge('edge-host-alert').confidence).toBe(0.5);
  });

  it('rejects connecting missing nodes', () => {
    const editor = createEditor();
    expect(() => editor.connect('alert-1', 'missing', 'references')).toThrow(/does not exist/);
  });

  it('rejects duplicate relation edges', () => {
    const editor = createEditor();
    expect(() => editor.connect('alert-1', 'log-4625', 'generated')).toThrow(/already exists/);
  });

  it('rejects self-loop edges', () => {
    const editor = createEditor();
    expect(() => editor.connect('alert-1', 'alert-1', 'references')).toThrow(/must be different nodes/);
  });

  it('removes a node and its connected edges', () => {
    const editor = createEditor();
    editor.removeNode('log-4625');
    expect(editor.listNodes()).toHaveLength(3);
    expect(editor.listEdges()).toHaveLength(1);
  });

  it('returns neighbors for a node', () => {
    const editor = createEditor();
    expect(editor.getNeighbors('log-4625')).toEqual(['account-alice', 'alert-1']);
    expect(editor.getNeighbors('host-pc')).toEqual(['account-alice']);
  });

  it('filters nodes by type', () => {
    const editor = createEditor();
    expect(editor.findByType('account').map((node) => node.id)).toEqual(['account-alice']);
    expect(editor.findByType('log').map((node) => node.id)).toEqual(['log-4625']);
  });

  it('filters edges by relation type', () => {
    const editor = createEditor();
    expect(editor.findByRelation('generated').map((edge) => edge.id)).toEqual(['e1']);
    expect(editor.findByRelation('authenticated').map((edge) => edge.id)).toEqual(['e2']);
  });

  it('searches nodes by id, label, and type', () => {
    const editor = createEditor();
    expect(editor.search('alice').map((node) => node.id)).toEqual(['account-alice']);
    expect(editor.search('alert').map((node) => node.id)).toEqual(['alert-1']);
    expect(editor.search('').length).toBe(4);
  });

  it('finds paths between evidence nodes', () => {
    const editor = createEditor();
    expect(editor.findPaths('alert-1', 'host-pc')).toEqual([
      ['alert-1', 'log-4625', 'account-alice', 'host-pc'],
    ]);
  });

  it('returns empty paths when no route exists', () => {
    const editor = createEditor();
    expect(editor.findPaths('host-pc', 'alert-1')).toEqual([]);
  });

  it('returns node and edge copies', () => {
    const editor = createEditor();
    const nodes = editor.listNodes();
    nodes[0].label = 'Mutated';
    expect(editor.getNode('alert-1').label).toBe('Multiple failed logins');

    const edges = editor.listEdges();
    edges[0].confidence = 1;
    expect(editor.getEdge('e1').confidence).toBe(0.95);
  });
});
