import { describe, expect, it } from 'vitest';

import { CyberSimulation } from '../../cyber/simulation/CyberSimulation.js';
import { CyberWorldAdapter } from '../CyberWorldAdapter.js';
import { SceneGraph } from '../SceneGraph.js';

describe('SceneGraph directed connections', () => {
  function graphWith(...ids: string[]): SceneGraph {
    const graph = new SceneGraph();
    for (const id of ids) graph.addNode({ id, name: id });
    return graph;
  }

  it('allows many outgoing and incoming edges per node', () => {
    const graph = graphWith('a', 'b', 'c', 'd');

    graph.addConnection({ source: 'a', target: 'b' });
    graph.addConnection({ source: 'a', target: 'c' });
    graph.addConnection({ source: 'a', target: 'd' });
    graph.addConnection({ source: 'b', target: 'a' });

    expect(graph.getConnections()).toHaveLength(4);
    expect(graph.hasConnection('a', 'c')).toBe(true);
    expect(graph.hasConnection('c', 'a')).toBe(false);
  });

  it('permits cycles, which a network topology requires', () => {
    const graph = graphWith('a', 'b', 'c');

    graph.addConnection({ source: 'a', target: 'b' });
    graph.addConnection({ source: 'b', target: 'c' });
    graph.addConnection({ source: 'c', target: 'a' });

    expect(() => graph.validate()).not.toThrow();
    expect(graph.getConnections()).toHaveLength(3);
  });

  it('ignores duplicate connections so a graph rebuilds idempotently', () => {
    const graph = graphWith('a', 'b');

    graph.addConnection({ source: 'a', target: 'b', type: 'recon' });
    graph.addConnection({ source: 'a', target: 'b', type: 'exploit' });

    expect(graph.getConnections()).toHaveLength(1);
  });

  it('rejects connections to unknown nodes and self-loops', () => {
    const graph = graphWith('a');

    expect(() => graph.addConnection({ source: 'a', target: 'ghost' })).toThrow(
      /does not exist/,
    );
    expect(() => graph.addConnection({ source: 'ghost', target: 'a' })).toThrow(
      /does not exist/,
    );
    expect(() => graph.addConnection({ source: '', target: 'a' })).toThrow(/source is required/);

    graph.addConnection({ source: 'a', target: 'a' } as never);
    // A self-loop that slips in is caught by validation.
    expect(() => graph.validate()).toThrow(/self-loop/);
  });

  it('removes a connection', () => {
    const graph = graphWith('a', 'b');
    graph.addConnection({ source: 'a', target: 'b' });

    graph.removeConnection('a', 'b');

    expect(graph.hasConnection('a', 'b')).toBe(false);
    expect(graph.getConnections()).toHaveLength(0);
  });

  it('round-trips connections through JSON', () => {
    const graph = graphWith('a', 'b', 'c');
    graph.addConnection({ source: 'a', target: 'b', type: 'recon', metadata: { traffic: 'recon' } });
    graph.addConnection({ source: 'b', target: 'c', type: 'exploit' });

    const restored = SceneGraph.fromJSON(JSON.parse(JSON.stringify(graph.toJSON())));

    expect(restored.getConnections()).toEqual(graph.getConnections());
    expect(restored.hasConnection('a', 'b')).toBe(true);
    expect(restored.getConnections()[0].metadata).toEqual({ traffic: 'recon' });
  });

  it('keeps the hierarchy model separate from connections', () => {
    const graph = graphWith('root', 'child', 'peer');
    graph.setParent('child', 'root');
    graph.addConnection({ source: 'child', target: 'peer' });

    expect(graph.getEdges()).toEqual([{ source: 'child', target: 'root' }]);
    expect(graph.getConnections()).toHaveLength(1);
  });
});

describe('CyberWorldAdapter emits a renderable network', () => {
  function runIncident(): CyberSimulation {
    const sim = new CyberSimulation(123);
    sim.initialize();
    sim.runRecon();
    sim.discoverServices();
    sim.exploitWebServer();
    sim.escalatePrivileges();
    sim.moveToDatabase();
    sim.detectThreats();
    return sim;
  }

  it('emits observed traffic as directed connections', () => {
    const graph = CyberWorldAdapter.toSceneGraph(runIncident().getState());
    const connections = graph.getConnections();

    expect(connections.length).toBeGreaterThan(0);
    expect(connections.some((edge) => edge.source === 'internet' && edge.target === 'gateway')).toBe(
      true,
    );
    expect(connections.some((edge) => edge.type === 'exploit')).toBe(true);
  });

  it('marks the attacker position and objective target on nodes', () => {
    const graph = CyberWorldAdapter.toSceneGraph(runIncident().getState());

    const attacker = graph.getNodes().find((node) => node.id === 'database-server');
    expect(attacker?.metadata?.isAttackerPosition).toBe(true);
    expect(attacker?.metadata?.isObjectiveTarget).toBe(true);

    const bystander = graph.getNodes().find((node) => node.id === 'admin-workstation');
    expect(bystander?.metadata?.isAttackerPosition).toBe(false);
  });

  it('flags alerted hosts and evidence sources for overlays', () => {
    const graph = CyberWorldAdapter.toSceneGraph(runIncident().getState());

    const alerted = graph.getNodes().filter((node) => node.metadata?.alerted === true);
    expect(alerted.length).toBeGreaterThan(0);

    const withEvidence = graph.getNodes().filter((node) => node.metadata?.hasEvidence === true);
    expect(withEvidence.length).toBeGreaterThan(0);
  });

  it('records defender containment on nodes and as blocked connections', () => {
    const sim = runIncident();
    sim.isolateHost('web-server');
    sim.blockNetworkPath('web-server', 'database-server');

    const graph = CyberWorldAdapter.toSceneGraph(sim.getState());

    const isolated = graph.getNodes().find((node) => node.id === 'web-server');
    expect(isolated?.metadata?.isolated).toBe(true);
    expect(isolated?.metadata?.blocked).toBe(true);
    expect(isolated?.metadata?.defenderActions).toEqual(
      expect.arrayContaining(['isolate', 'block']),
    );

    const blocked = graph
      .getConnections()
      .find((edge) => edge.source === 'web-server' && edge.target === 'database-server');
    expect(blocked?.type).toBe('blocked');
    expect(blocked?.metadata?.blocked).toBe(true);
  });

  it('produces a graph that passes its own validation', () => {
    const sim = runIncident();
    sim.isolateHost('web-server');
    sim.blockNetworkPath('web-server', 'database-server');

    expect(() => CyberWorldAdapter.toSceneGraph(sim.getState()).validate()).not.toThrow();
  });

  it('rejects state without hosts', () => {
    expect(() => CyberWorldAdapter.toSceneGraph(null as never)).toThrow(/hosts is required/);
  });
});
