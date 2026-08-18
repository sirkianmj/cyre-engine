import { describe, it, expect } from 'vitest';
import { DebugInspector } from '../DebugInspector.js';
import { NetworkGraph } from '../../cyber/index.js';
import { AttackState } from '../../cyber/index.js';
import { AttackStage } from '../../cyber/index.js';

describe('DebugInspector', () => {
  it('inspects a component with toJSON', () => {
    const inspector = new DebugInspector();
    const graph = new NetworkGraph();
    graph.addNode('a', { name: 'A' });
    graph.addNode('b', { name: 'B' });
    graph.addEdge('a', 'b');
    const snapshot = inspector.inspectComponent('network', graph);
    expect(snapshot.sections).toHaveProperty('network');
    expect(snapshot.summary).toContain('network');
    expect(snapshot.sections.network).toBeDefined();
  });

  it('inspects component without toJSON', () => {
    const inspector = new DebugInspector();
    const plain = { foo: 'bar' };
    const snapshot = inspector.inspectComponent('plain', plain);
    expect(snapshot.sections.plain).toEqual({ foo: 'bar' });
    expect(snapshot.summary).toContain('object');
  });

  it('inspects multiple components', () => {
    const inspector = new DebugInspector();
    const graph = new NetworkGraph();
    graph.addNode('a', { name: 'A' });
    const attackState = new AttackState(AttackStage.Recon);
    attackState.advance(100);
    const snapshot = inspector.inspectAll({
      network: graph,
      attackState,
      primitive: 42,
    });
    expect(Object.keys(snapshot.sections)).toEqual(['network', 'attackState', 'primitive']);
    expect(snapshot.summary).toContain('network');
    expect(snapshot.summary).toContain('attackState');
    expect(snapshot.summary).toContain('primitive');
  });
});
