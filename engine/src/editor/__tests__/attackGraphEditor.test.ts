import { describe, it, expect } from 'vitest';
import { AttackGraphEditor } from '../AttackGraphEditor.js';

function createEditor(): AttackGraphEditor {
  const editor = new AttackGraphEditor();
  editor.addNode({ id: 'recon', label: 'Reconnaissance', stage: 'recon', status: 'discovered' });
  editor.addNode({ id: 'initial-access', label: 'Initial Access', stage: 'initial-access', status: 'hidden' });
  editor.addNode({ id: 'credential-access', label: 'Credential Access', stage: 'credential-access', status: 'hidden' });
  editor.addNode({ id: 'lateral-movement', label: 'Lateral Movement', stage: 'lateral-movement', status: 'hidden' });
  editor.addNode({ id: 'exfiltration', label: 'Exfiltration', stage: 'exfiltration', status: 'hidden' });
  editor.connect('recon', 'initial-access', { id: 'e1' });
  editor.connect('initial-access', 'credential-access', { id: 'e2' });
  editor.connect('credential-access', 'lateral-movement', { id: 'e3' });
  editor.connect('lateral-movement', 'exfiltration', { id: 'e4' });
  editor.connect('initial-access', 'exfiltration', { id: 'e5' });
  return editor;
}

describe('AttackGraphEditor', () => {
  it('adds and lists attack graph nodes', () => {
    const editor = createEditor();
    expect(editor.listNodes()).toHaveLength(5);
    expect(editor.getNode('recon').stage).toBe('recon');
  });

  it('rejects duplicate nodes', () => {
    const editor = createEditor();
    expect(() =>
      editor.addNode({ id: 'recon', label: 'Duplicate Recon', status: 'hidden' }),
    ).toThrow(/already exists/);
  });

  it('rejects invalid node id and label', () => {
    const editor = new AttackGraphEditor();
    expect(() => editor.addNode({ id: '', label: 'Bad', status: 'hidden' })).toThrow(/id is required/);
    expect(() => editor.addNode({ id: 'bad', label: '   ', status: 'hidden' })).toThrow(/label is required/);
  });

  it('rejects invalid node status', () => {
    const editor = new AttackGraphEditor();
    expect(() =>
      editor.addNode({ id: 'bad', label: 'Bad', status: 'invalid' as any }),
    ).toThrow(/Invalid attack graph node status/);
  });

  it('connects nodes with directed edges', () => {
    const editor = createEditor();
    const edge = editor.connect('exfiltration', 'recon', {
      id: 'cycle',
      probability: 0.5,
      description: 'Return path',
    });
    expect(edge.id).toBe('cycle');
    expect(editor.getEdge('cycle').probability).toBe(0.5);
    expect(editor.getEdge('cycle').description).toBe('Return path');
  });

  it('rejects connecting missing nodes', () => {
    const editor = createEditor();
    expect(() => editor.connect('recon', 'missing')).toThrow(/does not exist/);
  });

  it('rejects duplicate directed edges', () => {
    const editor = createEditor();
    expect(() => editor.connect('recon', 'initial-access')).toThrow(/already exists/);
  });

  it('rejects self-loop edges', () => {
    const editor = createEditor();
    expect(() => editor.connect('recon', 'recon')).toThrow(/must be different nodes/);
  });

  it('removes a node and its connected edges', () => {
    const editor = createEditor();
    editor.removeNode('credential-access');
    expect(editor.listNodes()).toHaveLength(4);
    expect(editor.listEdges()).toHaveLength(3);
    expect(editor.getEdge('e1')).toBeDefined();
    expect(editor.getEdge('e4')).toBeDefined();
    expect(editor.getEdge('e5')).toBeDefined();
    expect(() => editor.getEdge('e2')).toThrow(/does not exist/);
    expect(() => editor.getEdge('e3')).toThrow(/does not exist/);
  });

  it('sets node status and stage', () => {
    const editor = createEditor();
    editor.setNodeStatus('initial-access', 'compromised');
    editor.setNodeStage('initial-access', 'exploitation');
    expect(editor.getNode('initial-access').status).toBe('compromised');
    expect(editor.getNode('initial-access').stage).toBe('exploitation');
  });

  it('determines source and target nodes', () => {
    const editor = createEditor();
    expect(editor.getSourceNodes().map((node) => node.id)).toEqual(['recon']);
    expect(editor.getTargetNodes().map((node) => node.id)).toEqual(['exfiltration']);
  });

  it('returns neighbors for a node', () => {
    const editor = createEditor();
    expect(editor.getNeighbors('initial-access')).toEqual(['credential-access', 'exfiltration', 'recon']);
  });

  it('finds all paths between source and target', () => {
    const editor = createEditor();
    const paths = editor.findPaths('recon', 'exfiltration');
    expect(paths).toEqual([
      ['recon', 'initial-access', 'credential-access', 'lateral-movement', 'exfiltration'],
      ['recon', 'initial-access', 'exfiltration'],
    ]);
  });

  it('returns empty paths when no route exists', () => {
    const editor = createEditor();
    editor.removeEdge('e1');
    expect(editor.findPaths('recon', 'exfiltration')).toEqual([]);
  });

  it('returns node and edge copies', () => {
    const editor = createEditor();
    const nodes = editor.listNodes();
    nodes[0].label = 'Mutated';
    expect(editor.getNode('recon').label).toBe('Reconnaissance');

    const edges = editor.listEdges();
    edges[0].description = 'Mutated';
    expect(editor.getEdge('e1').description).toBeUndefined();
  });
});
