import { describe, expect, it } from 'vitest';
import { CyberSimulation } from '@cyre/engine';
import { graphFromCyberSimulationState } from './cyberSimulationGraph';

describe('graphFromCyberSimulationState', () => {
  it('converts cyber hosts into network nodes', () => {
    const sim = new CyberSimulation(1);
    sim.initialize();
    sim.runRecon();

    const graph = graphFromCyberSimulationState(sim.getState());

    expect(graph.nodes).toHaveLength(5);
    expect(graph.edges.length).toBeGreaterThan(0);
    expect(graph.nodes.find((node) => node.id === 'gateway')?.label).toBe('Gateway');
  });

  it('returns an empty graph for null state', () => {
    expect(graphFromCyberSimulationState(null)).toEqual({ nodes: [], edges: [] });
  });
});
