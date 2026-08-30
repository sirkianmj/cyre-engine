import { describe, it, expect } from 'vitest';
import { AttackGraph } from '../AttackGraph.js';
import type { AttackGraphNode, AttackGraphEdge } from '../AttackGraphTypes.js';

describe('AttackGraph', () => {
  it('adds nodes and edges', () => {
    const graph = new AttackGraph();
    graph.addNode('a', 'Node A', { status: 'discovered' });
    graph.addNode('b', 'Node B');
    graph.addEdge('a', 'b', { weight: 2 });

    expect(graph.hasNode('a')).toBe(true);
    expect(graph.hasNode('b')).toBe(true);
    expect(graph.getEdge('a', 'b')).toBeDefined();
    expect(graph.getEdge('a', 'b')!.weight).toBe(2);
    expect(graph.getEdge('a', 'b')!.status).toBe('hidden');
  });

  it('throws on duplicate node', () => {
    const graph = new AttackGraph();
    graph.addNode('a', 'Node A');
    expect(() => graph.addNode('a', 'Duplicate')).toThrow(/already exists/);
  });

  it('throws on edge with missing node', () => {
    const graph = new AttackGraph();
    graph.addNode('a', 'Node A');
    expect(() => graph.addEdge('a', 'missing')).toThrow(/does not exist/);
  });

  it('throws on self-loop', () => {
    const graph = new AttackGraph();
    graph.addNode('a', 'Node A');
    expect(() => graph.addEdge('a', 'a')).toThrow(/Self-loops/);
  });

  it('throws on duplicate edge', () => {
    const graph = new AttackGraph();
    graph.addNode('a', 'Node A');
    graph.addNode('b', 'Node B');
    graph.addEdge('a', 'b');
    expect(() => graph.addEdge('a', 'b')).toThrow(/already exists/);
  });

  it('discovers nodes and edges', () => {
    const graph = new AttackGraph();
    graph.addNode('a', 'Node A');
    graph.addNode('b', 'Node B');
    graph.addEdge('a', 'b');

    graph.discoverNode('a');
    graph.discoverEdge('a', 'b');

    expect(graph.getNode('a')!.status).toBe('discovered');
    expect(graph.getEdge('a', 'b')!.status).toBe('discovered');
    expect(graph.getDiscoveredNodes()).toHaveLength(1);
    expect(graph.getDiscoveredEdges()).toHaveLength(1);
  });

  it('marks node compromised', () => {
    const graph = new AttackGraph();
    graph.addNode('a', 'Node A');
    graph.markCompromised('a');
    expect(graph.getNode('a')!.status).toBe('compromised');
    expect(graph.getDiscoveredNodes()).toHaveLength(1); // compromised counts as discovered
  });

  it('finds shortest path using all edges', () => {
    const graph = new AttackGraph();
    ['a', 'b', 'c', 'd'].forEach((id) => graph.addNode(id, `Node ${id}`));
    graph.addEdge('a', 'b', { weight: 1 });
    graph.addEdge('b', 'c', { weight: 2 });
    graph.addEdge('a', 'c', { weight: 5 });
    graph.addEdge('c', 'd', { weight: 1 });

    const result = graph.shortestPath('a', 'd');
    expect(result).not.toBeNull();
    expect(result!.path).toEqual(['a', 'b', 'c', 'd']);
    expect(result!.score).toBe(4);
  });

  it('returns null when no path exists', () => {
    const graph = new AttackGraph();
    graph.addNode('a', 'Node A');
    graph.addNode('b', 'Node B');
    expect(graph.shortestPath('a', 'b')).toBeNull();
  });

  it('visible-only path ignores hidden edges', () => {
    const graph = new AttackGraph();
    graph.addNode('a', 'Node A', { status: 'discovered' });
    graph.addNode('b', 'Node B', { status: 'discovered' });
    graph.addNode('c', 'Node C', { status: 'discovered' });
    graph.addEdge('a', 'b', { status: 'discovered', weight: 1 });
    graph.addEdge('b', 'c', { status: 'hidden', weight: 1 });
    graph.addEdge('a', 'c', { status: 'discovered', weight: 10 });

    const visiblePath = graph.shortestPath('a', 'c', true);
    expect(visiblePath).not.toBeNull();
    expect(visiblePath!.path).toEqual(['a', 'c']); // hidden edge a->b->c not used
    expect(visiblePath!.score).toBe(10);

    const fullPath = graph.shortestPath('a', 'c', false);
    expect(fullPath!.path).toEqual(['a', 'b', 'c']);
    expect(fullPath!.score).toBe(2);
  });

  it('validates graph without errors', () => {
    const graph = new AttackGraph();
    graph.addNode('a', 'A');
    graph.addNode('b', 'B');
    graph.addEdge('a', 'b');
    expect(() => graph.validate()).not.toThrow();
  });

  it('removes node and connected edges', () => {
    const graph = new AttackGraph();
    graph.addNode('a', 'A');
    graph.addNode('b', 'B');
    graph.addEdge('a', 'b');
    graph.removeNode('b');
    expect(graph.hasNode('b')).toBe(false);
    expect(graph.getEdges()).toHaveLength(0);
  });

  it('serialises to JSON', () => {
    const graph = new AttackGraph();
    graph.addNode('a', 'A', { status: 'discovered' });
    graph.addNode('b', 'B');
    graph.addEdge('a', 'b', { status: 'hidden', weight: 3 });
    const json = graph.toJSON();
    expect(json.nodes).toHaveLength(2);
    expect(json.edges).toHaveLength(1);
    expect(json.edges[0].weight).toBe(3);
  });
});
