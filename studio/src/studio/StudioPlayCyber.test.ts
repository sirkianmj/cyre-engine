import { describe, expect, it } from 'vitest';
import { StudioApplication } from './StudioApplication';
import { graphFromCyberSimulationState } from '../rendering/cyberSimulationGraph';

describe('Studio play → cyber simulation → viewport', () => {
  it('initializes canonical cyber simulation when Play is pressed', () => {
    const app = new StudioApplication();

    app.play();

    const state = app.getState();
    expect(state.cyberSimulationState).not.toBeNull();
    expect(state.cyberSimulationState?.attacker.position).toBe('web-server');
    expect(state.cyberSimulationState?.hosts['web-server'].compromised).toBe(true);
  });

  it('converts live cyber state into viewport graph', () => {
    const app = new StudioApplication();
    app.play();

    const state = app.getState();
    const graph = graphFromCyberSimulationState(state.cyberSimulationState);

    expect(graph.nodes).toHaveLength(5);
    const webNode = graph.nodes.find((node) => node.id === 'web-server');
    expect(webNode).toBeDefined();
    expect(webNode?.metadata?.compromised).toBe(true);
    expect(webNode?.metadata?.accessLevel).toBe('user');
  });

  it('resets cyber simulation on Stop', () => {
    const app = new StudioApplication();
    app.play();
    expect(app.getState().cyberSimulationState).not.toBeNull();

    app.stop();
    expect(app.getState().cyberSimulationState).toBeNull();
  });
});
