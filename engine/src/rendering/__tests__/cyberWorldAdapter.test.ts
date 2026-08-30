import { describe, expect, it } from 'vitest';
import { CyberSimulation } from '../../cyber/simulation/CyberSimulation.js';
import { CyberWorldAdapter } from '../CyberWorldAdapter.js';

describe('CyberWorldAdapter', () => {
  it('maps cyber hosts into scene graph nodes', () => {
    const sim = new CyberSimulation(123);
    sim.initialize();

    const graph = CyberWorldAdapter.toSceneGraph(sim.getState());
    const nodes = graph.getNodes();

    expect(nodes).toHaveLength(5);
    expect(nodes.some((node) => node.id === 'gateway')).toBe(true);
    expect(nodes.some((node) => node.id === 'database-server')).toBe(true);
  });

  it('reflects attack state in scene node metadata', () => {
    const sim = new CyberSimulation(123);
    sim.initialize();
    sim.runRecon();
    sim.discoverServices();
    sim.exploitWebServer();

    const graph = CyberWorldAdapter.toSceneGraph(sim.getState());
    const webNode = graph.getNodes().find((node) => node.id === 'web-server');

    expect(webNode).toBeDefined();
    expect(webNode?.metadata?.compromised).toBe(true);
    expect(webNode?.metadata?.accessLevel).toBe('user');
  });
});
