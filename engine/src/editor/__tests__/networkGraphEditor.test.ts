import { describe, it, expect } from 'vitest';
import { NetworkGraphEditor } from '../NetworkGraphEditor.js';

function createEditor(): NetworkGraphEditor {
  const editor = new NetworkGraphEditor();
  editor.addNode({ id: 'internet', label: 'Internet', type: 'network', zone: 'external' });
  editor.addNode({ id: 'firewall', label: 'Edge Firewall', type: 'firewall', zone: 'dmz' });
  editor.addNode({ id: 'web', label: 'Web Server', type: 'server', zone: 'dmz', subnet: '10.0.1.0/24' });
  editor.addNode({ id: 'database', label: 'Database Server', type: 'database', zone: 'internal', subnet: '10.0.2.0/24' });
  editor.connect('internet', 'firewall', { id: 'edge-inet-fw' });
  editor.connect('firewall', 'web', { id: 'edge-fw-web' });
  editor.connect('web', 'database', { id: 'edge-web-db' });
  return editor;
}

describe('NetworkGraphEditor', () => {
  it('adds and lists nodes', () => {
    const editor = createEditor();
    expect(editor.listNodes()).toHaveLength(4);
    expect(editor.getNode('web').type).toBe('server');
  });

  it('rejects duplicate nodes', () => {
    const editor = createEditor();
    expect(() =>
      editor.addNode({ id: 'web', label: 'Duplicate Web', type: 'server' }),
    ).toThrow(/already exists/);
  });

  it('rejects invalid node id and label', () => {
    const editor = new NetworkGraphEditor();
    expect(() => editor.addNode({ id: '', label: 'Bad', type: 'host' })).toThrow(/id is required/);
    expect(() => editor.addNode({ id: 'bad', label: '   ', type: 'host' })).toThrow(/label is required/);
  });

  it('rejects invalid node type', () => {
    const editor = new NetworkGraphEditor();
    expect(() =>
      editor.addNode({ id: 'bad', label: 'Bad', type: 'invalid' as any }),
    ).toThrow(/Invalid network graph node type/);
  });

  it('connects nodes and returns the edge', () => {
    const editor = createEditor();
    const edge = editor.connect('database', 'firewall', { id: 'edge-db-fw', bidirectional: true });
    expect(edge.id).toBe('edge-db-fw');
    expect(editor.getEdge('edge-db-fw').source).toBe('database');
    expect(editor.getEdge('edge-db-fw').target).toBe('firewall');
    expect(editor.getEdge('edge-db-fw').bidirectional).toBe(true);
  });

  it('rejects connecting missing nodes', () => {
    const editor = createEditor();
    expect(() => editor.connect('web', 'missing')).toThrow(/does not exist/);
  });

  it('rejects duplicate directed edges', () => {
    const editor = createEditor();
    expect(() => editor.connect('internet', 'firewall')).toThrow(/already exists/);
  });

  it('rejects self-loop edges', () => {
    const editor = createEditor();
    expect(() => editor.connect('web', 'web')).toThrow(/must be different nodes/);
  });

  it('removes a node and its connected edges', () => {
    const editor = createEditor();
    editor.removeNode('firewall');
    expect(() => editor.getNode('firewall')).toThrow(/does not exist/);
    expect(editor.getConnectedEdges('web')).toHaveLength(1);
    expect(editor.listEdges()).toHaveLength(1);
  });

  it('gets neighbors for a node', () => {
    const editor = createEditor();
    expect(editor.getNeighbors('firewall')).toEqual(['internet', 'web']);
    expect(editor.getNeighbors('database')).toEqual(['web']);
  });

  it('sets subnet, zone, and group', () => {
    const editor = createEditor();
    editor.setSubnet('web', '192.168.1.0/24');
    editor.setZone('web', 'production');
    editor.setGroup('web', 'web-tier');

    expect(editor.getNode('web').subnet).toBe('192.168.1.0/24');
    expect(editor.getNode('web').zone).toBe('production');
    expect(editor.getNode('web').group).toBe('web-tier');
  });

  it('groups nodes by subnet, zone, and group', () => {
    const editor = createEditor();
    expect(editor.getNodesBySubnet('10.0.1.0/24').map((node) => node.id)).toEqual(['web']);
    expect(editor.getNodesByZone('dmz').map((node) => node.id)).toEqual(['firewall', 'web']);
    expect(editor.getNodesByGroup('web-tier')).toEqual([]);
  });

  it('searches nodes by id, label, type, subnet, zone, and group', () => {
    const editor = createEditor();
    expect(editor.search('database').map((node) => node.id)).toEqual(['database']);
    expect(editor.search('internal').map((node) => node.id)).toEqual(['database']);
    expect(editor.search('server').map((node) => node.id)).toEqual(['web', 'database']);
  });

  it('assigns deterministic layered positions with auto layout', () => {
    const editor = createEditor();
    editor.autoLayout();
    expect(editor.getNode('internet').position).toBeDefined();
    expect(editor.getNode('internet').position?.x).toBeLessThan(editor.getNode('firewall').position?.x as number);
    expect(editor.getNode('firewall').position?.x).toBeLessThan(editor.getNode('web').position?.x as number);
    expect(editor.getNode('web').position?.x).toBeLessThan(editor.getNode('database').position?.x as number);
  });

  it('returns node and edge copies', () => {
    const editor = createEditor();
    const nodes = editor.listNodes();
    nodes[0].label = 'Mutated';
    expect(editor.getNode('internet').label).toBe('Internet');

    const edges = editor.listEdges();
    edges[0].type = 'mutated';
    expect(editor.getEdge('edge-inet-fw').type).toBeUndefined();
  });
});
