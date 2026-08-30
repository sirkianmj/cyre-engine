import { describe, it, expect } from 'vitest';
import { NetworkGraph } from '../NetworkGraph.js';

describe('NetworkGraph', () => {
  it('adds nodes and edges', () => {
    const graph = new NetworkGraph();
    graph.addNode('n1', { name: 'Node1' });
    graph.addNode('n2', { name: 'Node2' });
    graph.addEdge('n1', 'n2');
    expect(graph.hasNode('n1')).toBe(true);
    expect(graph.hasNode('n2')).toBe(true);
    expect(graph.hasEdge('n1', 'n2')).toBe(true);
    expect(graph.hasEdge('n2', 'n1')).toBe(true); // bidirectional default
  });

  it('adds directed edge when bidirectional false', () => {
    const graph = new NetworkGraph();
    graph.addNode('a');
    graph.addNode('b');
    graph.addEdge('a', 'b', { bidirectional: false });
    expect(graph.hasEdge('a', 'b')).toBe(true);
    expect(graph.hasEdge('b', 'a')).toBe(false);
  });

  it('throws on adding edge with missing node', () => {
    const graph = new NetworkGraph();
    graph.addNode('a');
    expect(() => graph.addEdge('a', 'missing')).toThrow(/does not exist/);
  });

  it('finds shortest path between nodes', () => {
    const graph = new NetworkGraph();
    ['a', 'b', 'c', 'd', 'e'].forEach((id) => graph.addNode(id));
    graph.addEdge('a', 'b');
    graph.addEdge('b', 'c');
    graph.addEdge('a', 'd');
    graph.addEdge('d', 'c');
    graph.addEdge('c', 'e');

    const result = graph.shortestPath('a', 'e');
    expect(result).not.toBeNull();
    expect(result!.path).toEqual(['a', 'b', 'c', 'e']);
    expect(result!.length).toBe(3);
  });

  it('returns null when no path exists', () => {
    const graph = new NetworkGraph();
    graph.addNode('x');
    graph.addNode('y');
    expect(graph.shortestPath('x', 'y')).toBeNull();
  });

  it('removes node and its edges', () => {
    const graph = new NetworkGraph();
    graph.addNode('a');
    graph.addNode('b');
    graph.addNode('c');
    graph.addEdge('a', 'b');
    graph.addEdge('b', 'c');
    graph.removeNode('b');
    expect(graph.hasNode('b')).toBe(false);
    expect(graph.hasEdge('a', 'b')).toBe(false);
    expect(graph.hasEdge('b', 'c')).toBe(false);
    expect(graph.hasEdge('a', 'c')).toBe(false);
  });

  it('serialises to JSON with nodes and edges', () => {
    const graph = new NetworkGraph();
    graph.addNode('n1', { name: 'N1', type: 'Host' });
    graph.addNode('n2', { name: 'N2', type: 'Host' });
    graph.addEdge('n1', 'n2', { type: 'connects' });
    const json = graph.toJSON();
    expect(json.nodes).toHaveLength(2);
    expect(json.edges).toHaveLength(2); // bidirectional -> two directed edges
  });

  it('validates graph without errors', () => {
    const graph = new NetworkGraph();
    graph.addNode('a');
    graph.addNode('b');
    graph.addEdge('a', 'b');
    expect(() => graph.validate()).not.toThrow();
  });
});
