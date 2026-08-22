import { describe, expect, it } from 'vitest';
import { StudioApplication } from '../studio/StudioApplication';

describe('StudioApplication', () => {
  it('creates a default CYRE project', () => {
    const application = new StudioApplication();
    const state = application.getState();

    expect(state.projectTitle).toBe(
      'Untitled CYRE Project',
    );
    expect(state.projectData?.id).toBeTruthy();
    expect(state.playState).toBe('stopped');
    expect(state.workspaces.length).toBeGreaterThan(0);
    expect(state.engineState).toBeTruthy();
  });

  it('controls the real play mode lifecycle', () => {
    const application = new StudioApplication();

    application.play();
    expect(application.getState().playState).toBe('running');
    expect(application.getState().isPlaying).toBe(true);

    application.pause();
    expect(application.getState().playState).toBe('paused');
    expect(application.getState().isPaused).toBe(true);

    application.resume();
    expect(application.getState().playState).toBe('running');

    application.stop();
    expect(application.getState().playState).toBe('stopped');
  });

  it('creates and saves a project', () => {
    const application = new StudioApplication();

    application.createProject(
      'Test Project',
      'training-simulation',
    );

    expect(application.getState().projectTitle).toBe(
      'Test Project',
    );

    expect(() => application.saveProject()).not.toThrow();
  });

  it('rejects invalid simulation speed', () => {
    const application = new StudioApplication();

    expect(() => application.setSimulationSpeed(0)).toThrow();
    expect(() => application.setSimulationSpeed(-1)).toThrow();
    expect(() => application.setSimulationSpeed(Number.NaN)).toThrow();
  });
});

describe('Phase 01: Inspector / Palette / Multi-Selection', () => {
  it('creates a network node from entity palette', () => {
    const application = new StudioApplication();

    application.addNetworkNodeFromPalette('server', 100, 120);
    const state = application.getState();

    expect(state.networkNodes.length).toBeGreaterThan(0);
    expect(state.networkNodes[0].type).toBe('server');
    expect(state.inspectorTarget?.id).toBe(state.networkNodes[0].id);
  });

  it('selects a project node into inspector', () => {
    const application = new StudioApplication();
    const projectNodeId = application.getState().projectExplorerNodes[0].id;

    application.selectProjectNode(projectNodeId);
    const state = application.getState();

    expect(state.inspectorTarget?.id).toBe(projectNodeId);
    expect(state.selectionCount).toBe(1);
  });

  it('updates inspector property value', () => {
    const application = new StudioApplication();
    const projectNodeId = application.getState().projectExplorerNodes[0].id;

    application.selectProjectNode(projectNodeId);
    application.setInspectorPropertyValue('name', 'Renamed Node');

    expect(application.getState().inspectorTarget?.properties.find(
      (property) => property.key === 'name',
    )?.value).toBe('Renamed Node');
  });
});

describe('Phase 03: Graph Editors', () => {
  it('adds attack graph node', () => {
    const app = new StudioApplication();
    app.addAttackGraphNode('Initial Access', 'hidden');
    expect(app.getState().attackGraphNodes.length).toBe(1);
  });

  it('adds evidence graph node', () => {
    const app = new StudioApplication();
    app.addEvidenceGraphNode('Suspicious Login', 'alert');
    expect(app.getState().evidenceGraphNodes.length).toBe(1);
  });

  it('adds timeline entry', () => {
    const app = new StudioApplication();
    app.addTimelineEntry(1, 'Investigation Start', 'phase');
    expect(app.getState().timelineEntries.length).toBe(1);
  });
});
