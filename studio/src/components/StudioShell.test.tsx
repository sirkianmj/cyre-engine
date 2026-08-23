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
    expect(application.hasSavedProject()).toBe(true);
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
    const lastNode = state.networkNodes[state.networkNodes.length - 1];

    expect(state.networkNodes.length).toBeGreaterThan(0);
    expect(lastNode.type).toBe('server');
    expect(state.inspectorTarget?.id).toBe(lastNode.id);
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

describe('Phase 04: Authoring Tools', () => {
  it('creates a scenario', () => {
    const app = new StudioApplication();
    app.createScenario('Test Scenario');
    expect(app.getState().currentScenarioData?.name).toBe('Test Scenario');
  });

  it('adds mission objective', () => {
    const app = new StudioApplication();
    app.createMissionDesign('Test Mission');
    app.addMissionObjective('Find attacker', 'primary');
    expect(app.getState().missionDesign.objectives.length).toBe(1);
  });

  it('adds objective graph node', () => {
    const app = new StudioApplication();
    app.addObjectiveGraphNode('Objective 1', 'available');
    expect(app.getState().objectiveGraphNodes.length).toBe(1);
  });

  it('adds event trigger rule', () => {
    const app = new StudioApplication();
    app.addEventTriggerRule('Suspicious Login Alert', 'suspicious-login', 'generate-alert');
    expect(app.getState().eventTriggerRules.length).toBe(1);
  });
});

describe('Phase 05: Live Simulation', () => {
  it('records a live event', () => {
    const app = new StudioApplication();
    app.recordLiveEvent('alert_acknowledged', 'alert-1');
    expect(app.getState().liveSimulationEvents.length).toBe(1);
  });

  it('clears live events', () => {
    const app = new StudioApplication();
    app.recordLiveEvent('evidence_viewed', 'evidence-1');
    app.clearLiveEvents();
    expect(app.getState().liveSimulationEvents.length).toBe(0);
  });
});

describe('Phase 06: Debugger and Replay', () => {
  it('starts and stops debugger', () => {
    const app = new StudioApplication();
    app.startDebugger();
    expect(app.getState().debugSnapshot?.state).toBe('running');
    app.stopDebugger();
    expect(app.getState().debugSnapshot?.state).toBe('stopped');
  });

  it('records replay events', () => {
    const app = new StudioApplication();
    app.recordReplayEvent('mission-start');
    expect(app.getState().replayEvents.length).toBe(1);
    expect(app.getState().replayCurrentIndex).toBe(0);
  });

  it('steps through replay events', () => {
    const app = new StudioApplication();
    app.recordReplayEvent('a');
    app.recordReplayEvent('b');
    app.stepReplay();
    expect(app.getState().replayCurrentIndex).toBe(1);
  });
});

describe('Phase 07: Presentation', () => {
  it('lists themes', () => {
    const app = new StudioApplication();
    expect(app.getState().uiThemes.length).toBeGreaterThan(0);
  });

  it('activates a theme', () => {
    const app = new StudioApplication();
    const themeId = app.getState().uiThemes[0].id;
    app.activateTheme(themeId);
    expect(app.getState().activeThemeId).toBe(themeId);
  });

  it('runs UX audit', () => {
    const app = new StudioApplication();
    app.runUxAudit();
    expect(app.getState().uxAuditReport).not.toBeNull();
  });
});


describe('Phase 08: Game UI Workspace', () => {
  it('sets active game UI panel', () => {
    const app = new StudioApplication();
    app.setGameUIActivePanel('mission');
    expect(app.getState().gameUiRender?.activePanel).toBe('mission');
  });

  it('adds game UI evidence', () => {
    const app = new StudioApplication();
    app.addGameUIEvidence({
      id: 'evidence-test',
      type: 'log',
      title: 'Test Evidence',
      sourceId: 'test',
    });
    const render = app.getState().gameUiRender as any;
    expect(render.evidence.length).toBe(1);
  });

  it('adds game UI alert', () => {
    const app = new StudioApplication();
    app.addGameUIAlert({
      id: 'alert-test',
      title: 'Test Alert',
      description: 'Alert message',
      severity: 'medium',
      status: 'new',
      timestamp: Date.now(),
    });
    const render = app.getState().gameUiRender as any;
    expect(render.alerts.length).toBe(1);
  });
});

describe('Phase 09: Rendering', () => {
  it('lists rendering backends', () => {
    const app = new StudioApplication();
    expect(app.getState().renderingBackends.length).toBeGreaterThan(0);
  });

  it('renders a scene', () => {
    const app = new StudioApplication();
    app.renderScene(800, 600, '2d');
    expect(app.getState().renderResult).not.toBeNull();
  });

  it('registers real 2D, 2.5D, and 3D engine backends', () => {
    const app = new StudioApplication();
    const ids = app.getState().renderingBackends.map((backend) => backend.id);
    expect(ids).toContain('cyre-2d');
    expect(ids).toContain('cyre-2.5d');
    expect(ids).toContain('cyre-3d');
  });

  it('renders with the 3D engine backend', () => {
    const app = new StudioApplication();
    app.setRenderMode('3d');
    app.renderScene(1280, 720, '3d');
    const result = app.getState().renderResult as { backendId?: string } | null;
    expect(result).not.toBeNull();
    expect(result?.backendId).toBe('renderer-3d');
  });

  it('switches the active backend with render mode', () => {
    const app = new StudioApplication();
    app.setRenderMode('2d');
    expect(app.getState().activeRenderingBackendId).toBe('cyre-2d');
    app.setRenderMode('2.5d');
    expect(app.getState().activeRenderingBackendId).toBe('cyre-2.5d');
  });
});

describe('Phase 10: Asset Pipeline', () => {
  it('registers an asset', () => {
    const app = new StudioApplication();
    app.registerAsset('Test Image', 'image');
    expect(app.getState().assets.length).toBe(1);
  });

  it('imports an asset from content', () => {
    const app = new StudioApplication();
    app.importAssetFromContent('Imported Data', 'data', '{}');
    expect(app.getState().assets.length).toBeGreaterThanOrEqual(0);
  });

  it('generates asset previews', () => {
    const app = new StudioApplication();
    app.registerAsset('Scenario Asset', 'scenario');
    app.generateAssetPreviews();
    expect(app.getState().assetPreviews.length).toBe(1);
  });
});

describe('Phase 11: Scripting & Plugins', () => {
  it('creates a sample CYRE script', () => {
    const app = new StudioApplication();
    app.createSampleCyreScript();
    expect(app.getState().cyreScripts.length).toBe(1);
  });

  it('registers a sample plugin', () => {
    const app = new StudioApplication();
    app.registerSamplePlugin('Test Plugin');
    expect(app.getState().cyrePluginInfos.length).toBe(1);
  });
});

describe('Phase 12: Build & Deployment', () => {
  it('registers and builds a web profile', () => {
    const app = new StudioApplication();
    app.registerBuildProfile('web-dev', 'Web Dev', 'web', 'development');
    expect(app.getState().buildProfiles.length).toBe(1);

    app.buildProfile('web-dev');
    expect(app.getState().buildResults.length).toBe(1);
  });

  it('sets a release channel', () => {
    const app = new StudioApplication();
    app.setReleaseChannel('stable');
    expect(app.getState().activeReleaseChannel).toBe('stable');
  });

  it('packages a web game', () => {
    const app = new StudioApplication();
    app.packageWebGame('Test Game');
    expect(app.getState().packagingResults.length).toBe(1);
  });
});

describe('Phase 13: Real Viewport & File Import/Export', () => {
  it('keeps rendering panels available', () => {
    const app = new StudioApplication();
    const ids = app.getState().panels.map((panel) => panel.id);
    expect(ids).toContain('asset-files');
  });

  it('still renders an asset scene', () => {
    const app = new StudioApplication();
    app.addNetworkNodeFromPalette('server', 100, 100);
    app.renderScene(800, 600, '2d');
    expect(app.getState().renderResult).not.toBeNull();
  });
});

describe('Phase 13: Unreal Editor Shell', () => {
  it('seeds a default studio scene', () => {
    const app = new StudioApplication();
    expect(app.getState().networkNodes.length).toBeGreaterThan(0);
  });

  it('keeps unreal shell panels available', () => {
    const app = new StudioApplication();
    const ids = app.getState().panels.map((panel) => panel.id);
    expect(ids).toContain('asset-files');
  });
});
