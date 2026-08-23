import {
  AttackGraphEditor,
  CommandPalette,
  CyberEntityPalette,
  DockManager,
  EditorShell,
  Engine,
  EventTriggerSystem,
  EvidenceGraphEditor,
  CyreDebugger,
  DebugInspector,
  Inspector,
  LiveEventStream,
  LiveSimulationInspector,
  GameUIWorkspace,
  MissionDesigner,
  MotionSystem,
  UIThemeManager,
  UxAuditSystem,
  VisualDesignAuditSystem,
  AccessibilityController,
  ReplayRecorder,
  ReplayStudio,
  MultiSelectionManager,
  NetworkGraphEditor,
  ObjectiveGraphEditor,
  PlayModeController,
  ProjectExplorer,
  ProjectManager,
  ScenarioEditor,
  ScenarioGenerator,
  TimelineEditor,
  WorkspaceManager,
  RenderBackendRegistry,
  RenderRequest,
  RenderResult,
  RenderTarget,
  SceneGraph,
  SimpleSceneGraphBackend,
  AssetBrowser,
  AssetDescriptor,
  CyrePluginManager,
  CyreScript,
  CyreScriptBuilder,
  CyreScriptEngine,
  CyreScriptRegistry,
  AssetImportPipeline,
  AssetImportRequest,
  AssetManager,
  AssetPreviewGenerator,
  BuildPipeline,
  BuildProfile,
  CiCdPipeline,
  DesktopPackager,
  MobilePackager,
  ReleaseChannelManager,
  WebPackager,
} from '@cyre/engine';

import type {
  DockArea,
  DockLayout,
  DockPanel,
  EditorAttackGraphNode,
  EditorAttackGraphEdge,
  EditorCommand,
  EditorEvidenceGraphNode,
  EditorEvidenceGraphEdge,
  EditorEventTriggerRule,
  EditorEventTriggerActionType,
  EditorMissionDesignerDesign,
  EditorMissionDesignerObjective,
  EditorNotification,
  EditorObjectiveGraphNode,
  EditorObjectiveGraphNodeStatus,
  EditorObjectiveGraphEdge,
  EditorObjectiveGraphEdgeType,
  EditorPanel,
  EditorTimelineEntry,
  InspectorTarget,
  LiveEventType,
  LiveSimulationEvent,
  LiveSimulationSnapshot,
  MenuGroup,
  ReplayBookmark,
  ReplayEvent,
  UIThemeDefinition,
  UxAuditReport,
  VisualDesignAuditReport,
  MenuItem,
  NetworkGraphEdge,
  NetworkGraphNode,
  ProjectData,
  ProjectModel,
  ProjectNode,
  ProjectNodeType,
  SelectionItem,
  CyberEntityPaletteItem,
  Scenario as ScenarioData,
  ScenarioGeneratorOptions,
  ToolbarButton,
  WorkspaceDefinition,
  RenderBackend,
  RenderResult as RenderResultData,
  RenderingMode,
  SceneGraphNodeData,
} from '@cyre/engine';

import {
  backendIdForMode,
  createEngineRenderBackends,
} from '../rendering/CyreRenderBackends';

type PlayModeState = ReturnType<PlayModeController['getState']>;

export interface DockLayoutSummary {
  id: string;
  name: string;
}

export interface StudioSnapshot {
  projectTitle: string;
  statusMessage: string;
  panels: EditorPanel[];
  menuGroups: MenuGroup[];
  toolbarButtons: ToolbarButton[];
  notifications: EditorNotification[];
  workspaces: WorkspaceDefinition[];
  activeWorkspaceId: string | null;
  projectData: Readonly<ProjectData> | null;
  projectExplorerNodes: ProjectNode[];
  inspectorTarget: InspectorTarget | null;
  networkNodes: NetworkGraphNode[];
  networkEdges: NetworkGraphEdge[];
  playState: PlayModeState;
  isPlaying: boolean;
  isPaused: boolean;
  simulationSpeed: number;
  engineState: string;
  commands: EditorCommand[];
  dockPanels: DockPanel[];
  maximizedPanelId: string | null;
  activePanelId: string | null;
  savedDockLayouts: DockLayoutSummary[];
  selectedItems: SelectionItem[];
  selectionCount: number;
  entityPaletteItems: CyberEntityPaletteItem[];
  entityPaletteCategories: string[];
  attackGraphNodes: EditorAttackGraphNode[];
  attackGraphEdges: EditorAttackGraphEdge[];
  evidenceGraphNodes: EditorEvidenceGraphNode[];
  evidenceGraphEdges: EditorEvidenceGraphEdge[];
  timelineEntries: EditorTimelineEntry[];
  currentScenarioData: ScenarioData | null;
  missionDesign: EditorMissionDesignerDesign;
  objectiveGraphNodes: EditorObjectiveGraphNode[];
  objectiveGraphEdges: EditorObjectiveGraphEdge[];
  eventTriggerRules: EditorEventTriggerRule[];
  liveSimulationSnapshot: LiveSimulationSnapshot | null;
  liveSimulationEvents: LiveSimulationEvent[];
  debugSnapshot: {
    state: string;
    breakpointCount: number;
    entities: Record<string, unknown>;
    states: Record<string, unknown>;
    summary: string;
  } | null;
  replayEvents: ReplayEvent[];
  replayCurrentIndex: number;
  replayBookmarks: ReplayBookmark[];

  uiThemes: UIThemeDefinition[];
  activeThemeId: string;
  motionReduced: boolean;
  motionDurationMs: number;
  accessibilitySettings: Record<string, unknown>;
  uxAuditReport: UxAuditReport | null;
  visualDesignAuditReport: VisualDesignAuditReport | null;
  gameUiRender: Record<string, unknown> | null;
  renderingBackends: Array<{
    id: string;
    name: string;
    capabilities: Record<string, unknown>;
  }>;
  activeRenderingBackendId: string | null;
  renderMode: '2d' | '2.5d' | '3d';
  renderResult: RenderResultData | null;
  assets: Array<Record<string, unknown>>;
  assetBrowserTypes: string[];
  assetBrowserTags: string[];
  assetPreviews: Array<Record<string, unknown>>;
  cyreScripts: Array<Record<string, unknown>>;
  cyrePluginInfos: Array<Record<string, unknown>>;

  buildProfiles: Array<Record<string, unknown>>;
  buildResults: Array<Record<string, unknown>>;
  releaseChannels: string[];
  activeReleaseChannel: string;
  ciCdResult: Record<string, unknown> | null;
  packagingResults: Array<Record<string, unknown>>;
}

interface PanelInit {
  id: string;
  title: string;
  editorDock: EditorPanel['dockPosition'];
  dockArea: 'left' | 'right' | 'top' | 'bottom' | 'center';
  order: number;
}

export class StudioApplication {
  private readonly engine = new Engine({
    appName: 'CYRE Studio',
    version: '1.0.0',
  });

  private readonly projectManager = new ProjectManager();
  private readonly editorShell = new EditorShell();
  private readonly dockManager = new DockManager();
  private readonly workspaceManager = new WorkspaceManager();
  private readonly commandPalette = new CommandPalette();
  private readonly playModeController = new PlayModeController();

  private projectExplorer = new ProjectExplorer();
  private inspector = new Inspector();
  private networkGraphEditor = new NetworkGraphEditor();
  private readonly cyberEntityPalette = new CyberEntityPalette();
  private readonly multiSelectionManager = new MultiSelectionManager();
  private readonly attackGraphEditor = new AttackGraphEditor();
  private readonly evidenceGraphEditor = new EvidenceGraphEditor();
  private readonly timelineEditor = new TimelineEditor();
  private readonly scenarioEditor = new ScenarioEditor();
  private readonly scenarioGenerator = new ScenarioGenerator();
  private missionDesigner = new MissionDesigner('default-mission', 'Default Mission');
  private readonly objectiveGraphEditor = new ObjectiveGraphEditor();
  private readonly eventTriggerSystem = new EventTriggerSystem();
  private currentScenarioData: ScenarioData | null = null;
  private readonly liveSimulationInspector = new LiveSimulationInspector();
  private readonly liveEventStream = new LiveEventStream();
  private readonly cyreDebugger = new CyreDebugger({ name: 'CYRE Studio Debugger' });
  private readonly debugInspector = new DebugInspector();
  private readonly replayStudio = new ReplayStudio();
  private readonly replayRecorder = new ReplayRecorder();
  private readonly uiThemeManager = new UIThemeManager();
  private readonly motionSystem = new MotionSystem();
  private readonly gameUiWorkspace = new GameUIWorkspace();
  private readonly assetManager = new AssetManager();
  private readonly assetBrowser = new AssetBrowser(this.assetManager);
  private readonly assetImportPipeline = new AssetImportPipeline();
  private readonly assetPreviewGenerator = new AssetPreviewGenerator(this.assetManager);
  private readonly cyreScriptRegistry = new CyreScriptRegistry();
  private readonly cyreScriptEngine = new CyreScriptEngine(this.cyreScriptRegistry);
  private readonly cyrePluginManager = new CyrePluginManager();
  private readonly buildPipeline = new BuildPipeline();
  private readonly releaseChannelManager = new ReleaseChannelManager();
  private readonly ciCdPipeline = new CiCdPipeline({
    buildPipeline: this.buildPipeline,
  });
  private readonly webPackager = new WebPackager();
  private readonly desktopPackager = new DesktopPackager();
  private readonly mobilePackager = new MobilePackager();
  private buildResults: Array<Record<string, unknown>> = [];
  private ciCdResult: Record<string, unknown> | null = null;
  private packagingResults: Array<Record<string, unknown>> = [];
  private readonly renderBackendRegistry = new RenderBackendRegistry();
  private readonly simpleRenderBackend = new SimpleSceneGraphBackend();
  private activeRenderingBackendId: string | null = null;
  private renderMode: '2d' | '2.5d' | '3d' = '3d';
  private renderResult: RenderResultData | null = null;
  private gameUiRender: Record<string, unknown> | null = null;
  private readonly accessibilityController = new AccessibilityController({
    motionSystem: this.motionSystem,
  });
  private uxAuditReport: UxAuditReport | null = null;
  private visualDesignAuditReport: VisualDesignAuditReport | null = null;
  private debugSnapshot: {
    state: string;
    breakpointCount: number;
    entities: Record<string, unknown>;
    states: Record<string, unknown>;
    summary: string;
  } | null = null;

  private liveSimulationSnapshot: LiveSimulationSnapshot | null = null;

  private currentProject: ProjectModel | null = null;
  private activeWorkspaceId: string | null = null;
  private lastSerializedProject: string | null = null;

  private readonly defaultDockAreas = new Map<string, DockArea>();
  private dockLayoutStorageKeyFor(workspaceId: string | null): string {
    return `cyre.studio.dockLayouts.${workspaceId ?? 'global'}`;
  }

  private get currentDockLayoutStorageKey(): string {
    return this.dockLayoutStorageKeyFor(this.activeWorkspaceId);
  }

  private getActiveWorkspaceLayout(): DockLayout | null {
    try {
      const key = `${this.currentDockLayoutStorageKey}.active`;
      const raw = window.localStorage.getItem(key);
      if (!raw) {
        return null;
      }
      return JSON.parse(raw) as DockLayout;
    } catch {
      return null;
    }
  }

  private setActiveWorkspaceLayout(layout: DockLayout): void {
    try {
      const key = `${this.currentDockLayoutStorageKey}.active`;
      window.localStorage.setItem(key, JSON.stringify(layout));
    } catch (error) {
      this.editorShell.addNotification(
        'error',
        `Failed to persist active layout: ${this.errorMessage(error)}`,
      );
    }
  }

  private restoreActiveWorkspaceLayout(workspaceId: string): void {
    this.activeWorkspaceId = workspaceId;

    const activeLayout = this.getActiveWorkspaceLayout();
    if (activeLayout) {
      try {
        this.dockManager.restoreLayout(activeLayout);
        this.editorShell.setStatusMessage(
          `Workspace: ${workspaceId} (custom layout)`,
        );
        return;
      } catch (error) {
        this.editorShell.addNotification(
          'error',
          `Restoring saved layout failed: ${this.errorMessage(error)}`,
        );
      }
    }

    this.workspaceManager.activateWorkspace(workspaceId, this.dockManager);
    this.editorShell.setStatusMessage(`Workspace: ${workspaceId}`);
  }

  private readonly listeners = new Set<() => void>();
  private snapshot: StudioSnapshot | null = null;

  constructor() {
    this.initializeStudioShell();
    this.initializeRenderingSystem();
    this.createProject('Untitled CYRE Project', 'soc-game');
    this.seedDefaultStudioScene();
  }

  getState(): StudioSnapshot {
    if (!this.snapshot) {
      this.snapshot = this.computeSnapshot();
    }
    return this.snapshot;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  createProject(
    name = 'Untitled CYRE Project',
    templateId = 'soc-game',
  ): void {
    const projectName =
      name.trim() === '' ? 'Untitled CYRE Project' : name.trim();

    try {
      const projectId = this.generateProjectId(projectName);
      const project = this.projectManager.createProjectFromTemplate(
        projectId,
        projectName,
        templateId,
      );

      this.currentProject = project;
      this.editorShell.setProjectTitle(project.getName());
      this.editorShell.setStatusMessage('Project created.');
      this.syncProjectExplorer(project);
      this.resetNetworkGraph();
      this.loadDefaultMission(project);

      this.editorShell.addNotification(
        'success',
        `Project "${project.getName()}" created.`,
      );
    } catch (error) {
      this.editorShell.addNotification(
        'error',
        `Project creation failed: ${this.errorMessage(error)}`,
      );
      this.editorShell.setStatusMessage('Project creation failed.');
    }

    this.emit();
  }

  saveProject(): void {
    if (!this.currentProject) {
      this.editorShell.addNotification('warning', 'No project is open.');
      this.emit();
      return;
    }

    try {
      this.lastSerializedProject = this.projectManager.serializeProject(
        this.currentProject.getId(),
      );
      this.writeStorage('cyre.studio.savedProject', this.lastSerializedProject);
      this.editorShell.setStatusMessage('Project saved.');
      this.editorShell.addNotification('success', 'Project saved.');
    } catch (error) {
      this.editorShell.addNotification(
        'error',
        `Project save failed: ${this.errorMessage(error)}`,
      );
    }

    this.emit();
  }

  hasSavedProject(): boolean {
    return Boolean(
      this.lastSerializedProject || this.readStorage('cyre.studio.savedProject'),
    );
  }

  loadSavedProject(): boolean {
    const raw =
      this.lastSerializedProject ?? this.readStorage('cyre.studio.savedProject');

    if (!raw) {
      this.editorShell.addNotification('warning', 'No saved project was found.');
      this.emit();
      return false;
    }

    try {
      const project = this.projectManager.deserializeProject(raw);
      this.currentProject = project;
      this.lastSerializedProject = raw;
      this.editorShell.setProjectTitle(project.getName());
      this.editorShell.setStatusMessage('Project loaded.');
      this.syncProjectExplorer(project);
      this.loadDefaultMission(project);
      this.editorShell.addNotification(
        'success',
        `Project "${project.getName()}" loaded.`,
      );
      this.emit();
      return true;
    } catch (error) {
      this.editorShell.addNotification(
        'error',
        `Project load failed: ${this.errorMessage(error)}`,
      );
      this.emit();
      return false;
    }
  }

  setWorkspace(workspaceId: string): void {
    if (!this.workspaceManager.hasWorkspace(workspaceId)) {
      this.editorShell.addNotification(
        'warning',
        'Workspace "' + workspaceId + '" does not exist.',
      );
      this.emit();
      return;
    }

    try {
      this.workspaceManager.activateWorkspace(workspaceId, this.dockManager);
      this.activeWorkspaceId = workspaceId;
      this.editorShell.setStatusMessage('Workspace: ' + workspaceId);
    } catch (error) {
      this.editorShell.addNotification(
        'error',
        'Workspace activation failed: ' + this.errorMessage(error),
      );
    }

    this.emit();
  }

  togglePanel(panelId: string): void {
    try {
      const panel = this.editorShell.getPanel(panelId);
      this.setPanelVisible(panelId, !panel.isVisible);
    } catch (error) {
      this.editorShell.addNotification(
        'error',
        `Panel toggle failed: ${this.errorMessage(error)}`,
      );
    }

    this.emit();
  }

  setPanelVisible(panelId: string, visible: boolean): void {
    try {
      this.editorShell.setPanelVisible(panelId, visible);
      this.dockManager.setPanelVisible(panelId, visible);

      if (visible) {
        const dockPanel = this.dockManager.getPanel(panelId);
        if (dockPanel.floating) {
          const defaultArea = this.defaultDockAreas.get(panelId) ?? 'center';
          this.dockManager.dockPanel(panelId, defaultArea);
        }
      }
    } catch (error) {
      this.editorShell.addNotification(
        'error',
        `Panel visibility change failed: ${this.errorMessage(error)}`,
      );
    }

    this.emit();
  }

  dockPanel(panelId: string, area: DockArea): void {
    try {
      this.dockManager.dockPanel(panelId, area);
      if (this.editorShell.getPanel(panelId)) {
        this.editorShell.setPanelDockPosition(
          panelId,
          this.toEditorDockPosition(area),
        );
      }
    } catch (error) {
      this.editorShell.addNotification(
        'error',
        `Dock panel failed: ${this.errorMessage(error)}`,
      );
    }

    this.emit();
  }

  undockPanel(panelId: string): void {
    try {
      this.dockManager.undockPanel(panelId);
      if (this.editorShell.getPanel(panelId)) {
        this.editorShell.setPanelDockPosition(panelId, 'floating');
      }
    } catch (error) {
      this.editorShell.addNotification(
        'error',
        `Undock panel failed: ${this.errorMessage(error)}`,
      );
    }

    this.emit();
  }

  movePanel(panelId: string, area: DockArea): void {
    try {
      this.dockManager.movePanel(panelId, area);
    } catch (error) {
      this.editorShell.addNotification(
        'error',
        `Move panel failed: ${this.errorMessage(error)}`,
      );
    }

    this.emit();
  }

  resizePanel(panelId: string, size: number): void {
    try {
      this.dockManager.resizePanel(panelId, size);
    } catch (error) {
      this.editorShell.addNotification(
        'error',
        `Resize panel failed: ${this.errorMessage(error)}`,
      );
    }

    this.emit();
  }

  setActivePanel(panelId: string): void {
    try {
      this.dockManager.setActivePanel(panelId);
    } catch (error) {
      this.editorShell.addNotification(
        'error',
        `Activate panel failed: ${this.errorMessage(error)}`,
      );
    }

    this.emit();
  }

  maximizePanel(panelId: string): void {
    try {
      this.dockManager.maximizePanel(panelId);
    } catch (error) {
      this.editorShell.addNotification(
        'error',
        `Maximize panel failed: ${this.errorMessage(error)}`,
      );
    }

    this.emit();
  }

  restorePanel(): void {
    try {
      this.dockManager.restorePanel();
    } catch (error) {
      this.editorShell.addNotification(
        'error',
        `Restore panel failed: ${this.errorMessage(error)}`,
      );
    }

    this.emit();
  }

  tabPanels(panelIds: string[]): void {
    try {
      this.dockManager.tabPanels(panelIds);
    } catch (error) {
      this.editorShell.addNotification(
        'error',
        `Tab panels failed: ${this.errorMessage(error)}`,
      );
    }

    this.emit();
  }

  untabPanels(panelIds: string[]): void {
    try {
      this.dockManager.untabPanels(panelIds);
    } catch (error) {
      this.editorShell.addNotification(
        'error',
        `Untab panels failed: ${this.errorMessage(error)}`,
      );
    }

    this.emit();
  }

  getDockLayout(): DockLayout {
    return this.dockManager.getLayout();
  }

  restoreDockLayout(layout: DockLayout): void {
    try {
      this.dockManager.restoreLayout(layout);
    } catch (error) {
      this.editorShell.addNotification(
        'error',
        `Restore layout failed: ${this.errorMessage(error)}`,
      );
    }

    this.emit();
  }

  addProjectNode(
    parentId: string | undefined,
    type: ProjectNodeType,
    name: string,
  ): void {
    const trimmedName = name.trim();
    if (!trimmedName) throw new Error('Project node name is required.');

    try {
      const nodeId = 'project-node-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
      this.projectExplorer.addNode({
        id: nodeId,
        name: trimmedName,
        type,
        parentId,
      });
      this.editorShell.addNotification('success', 'Created ' + type + ' "' + trimmedName + '".');
    } catch (error) {
      this.editorShell.addNotification('error', 'Create project node failed: ' + this.errorMessage(error));
    }
    this.emit();
  }

  renameProjectNode(nodeId: string, name: string): void {
    const trimmedName = name.trim();
    if (!trimmedName) throw new Error('Project node name is required.');

    try {
      this.projectExplorer.renameNode(nodeId, trimmedName);
      this.editorShell.addNotification('success', 'Renamed project node to "' + trimmedName + '".');
    } catch (error) {
      this.editorShell.addNotification('error', 'Rename project node failed: ' + this.errorMessage(error));
    }
    this.emit();
  }

  deleteProjectNode(nodeId: string): void {
    try {
      this.projectExplorer.removeNode(nodeId);
      this.editorShell.addNotification('success', 'Project node deleted.');
    } catch (error) {
      this.editorShell.addNotification('error', 'Delete project node failed: ' + this.errorMessage(error));
    }
    this.emit();
  }

  duplicateProjectNode(nodeId: string): void {
    try {
      const newId = 'project-node-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
      this.projectExplorer.duplicateNode(nodeId, newId);
      this.editorShell.addNotification('success', 'Project node duplicated.');
    } catch (error) {
      this.editorShell.addNotification('error', 'Duplicate project node failed: ' + this.errorMessage(error));
    }
    this.emit();
  }

  moveProjectNode(nodeId: string, newParentId?: string): void {
    try {
      this.projectExplorer.moveNode(nodeId, newParentId);
      this.editorShell.addNotification('success', 'Project node moved.');
    } catch (error) {
      this.editorShell.addNotification('error', 'Move project node failed: ' + this.errorMessage(error));
    }
    this.emit();
  }

  selectProjectNode(nodeId: string): void {
    try {
      const node = this.projectExplorer.getNode(nodeId);
      const properties: InspectorTarget['properties'] = [
        { key: 'id', label: 'ID', type: 'string', value: node.id },
        { key: 'name', label: 'Name', type: 'string', value: node.name },
        { key: 'type', label: 'Type', type: 'string', value: node.type },
        { key: 'parentId', label: 'Parent', type: 'string', value: node.parentId ?? '' },
      ];
      this.inspector.selectTarget(node.id, node.name, properties);
      this.multiSelectionManager.select({ id: node.id, type: node.type, name: node.name });
      this.editorShell.setStatusMessage('Selected project node: ' + node.name);
    } catch (error) {
      this.editorShell.addNotification('error', 'Select project node failed: ' + this.errorMessage(error));
    }
    this.emit();
  }

  selectNetworkNode(nodeId: string): void {
    try {
      const node = this.networkGraphEditor.getNode(nodeId);
      const properties: InspectorTarget['properties'] = [
        { key: 'id', label: 'ID', type: 'string', value: node.id },
        { key: 'label', label: 'Label', type: 'string', value: node.label },
        { key: 'type', label: 'Type', type: 'string', value: node.type },
        { key: 'subnet', label: 'Subnet', type: 'string', value: node.subnet ?? '' },
        { key: 'zone', label: 'Zone', type: 'string', value: node.zone ?? '' },
        { key: 'group', label: 'Group', type: 'string', value: node.group ?? '' },
      ];
      this.inspector.selectTarget(node.id, node.label, properties);
      this.multiSelectionManager.select({ id: node.id, type: node.type, name: node.label });
      this.editorShell.setStatusMessage('Selected network node: ' + node.label);
    } catch (error) {
      this.editorShell.addNotification('error', 'Select network node failed: ' + this.errorMessage(error));
    }
    this.emit();
  }

  toggleSelection(item: SelectionItem): void {
    try {
      this.multiSelectionManager.toggle(item);
    } catch (error) {
      this.editorShell.addNotification('error', 'Toggle selection failed: ' + this.errorMessage(error));
    }
    this.emit();
  }

  clearMultiSelection(): void {
    try {
      this.multiSelectionManager.clear();
    } catch (error) {
      this.editorShell.addNotification('error', 'Clear selection failed: ' + this.errorMessage(error));
    }
    this.emit();
  }

  setInspectorPropertyValue(key: string, value: unknown): void {
    try {
      const targetId = this.inspector.getSelectedTargetId();
      if (!targetId) throw new Error('No inspector target selected.');

      this.inspector.setPropertyValue(key, value);

      const projectNode = this.projectExplorer.listNodes().find((node) => node.id === targetId);
      if (projectNode) {
        if (key === 'name') {
          this.projectExplorer.renameNode(targetId, String(value));
          this.editorShell.addNotification('success', 'Updated project node ' + key + '.');
        } else {
          this.editorShell.addNotification('warning', 'Project property "' + key + '" is read-only.');
        }
        this.selectProjectNode(targetId);
        return;
      }

      const networkNode = this.networkGraphEditor.listNodes().find((node) => node.id === targetId);
      if (networkNode) {
        if (key === 'label') {
          const edges = this.networkGraphEditor.getConnectedEdges(targetId);
          this.networkGraphEditor.removeNode(targetId);
          this.networkGraphEditor.addNode({ ...networkNode, label: String(value) });
          for (const edge of edges) {
            try { this.networkGraphEditor.addEdge(edge); } catch {}
          }
        } else if (key === 'subnet') {
          this.networkGraphEditor.setSubnet(targetId, String(value));
        } else if (key === 'zone') {
          this.networkGraphEditor.setZone(targetId, String(value));
        } else if (key === 'group') {
          this.networkGraphEditor.setGroup(targetId, String(value));
        } else {
          this.editorShell.addNotification('warning', 'Network property "' + key + '" is read-only.');
        }
        this.selectNetworkNode(targetId);
        return;
      }

      this.editorShell.addNotification('warning', 'Selected target "' + targetId + '" is not editable.');
      this.emit();
    } catch (error) {
      this.editorShell.addNotification('error', 'Update inspector property failed: ' + this.errorMessage(error));
      this.emit();
    }
  }

  resetInspectorProperty(key: string): void {
    try {
      this.inspector.resetProperty(key);
      this.editorShell.addNotification('success', 'Reset inspector property ' + key + '.');
    } catch (error) {
      this.editorShell.addNotification('error', 'Reset inspector property failed: ' + this.errorMessage(error));
    }
    this.emit();
  }

  resetInspectorProperties(): void {
    try {
      this.inspector.resetAllProperties();
      this.editorShell.addNotification('success', 'Reset all inspector properties.');
    } catch (error) {
      this.editorShell.addNotification('error', 'Reset inspector properties failed: ' + this.errorMessage(error));
    }
    this.emit();
  }

  clearInspectorSelection(): void {
    try {
      this.inspector.clearSelection();
      this.multiSelectionManager.clear();
      this.editorShell.addNotification('success', 'Inspector selection cleared.');
    } catch (error) {
      this.editorShell.addNotification('error', 'Clear inspector selection failed: ' + this.errorMessage(error));
    }
    this.emit();
  }

  addNetworkNodeFromPalette(itemId: string, x?: number, y?: number): void {
    try {
      const item = this.cyberEntityPalette.getItem(itemId);
      const entity = this.cyberEntityPalette.createEntityData(itemId);
      const typeMap: Record<string, NetworkGraphNode['type']> = {
        host: 'host',
        server: 'server',
        client: 'client',
        router: 'router',
        firewall: 'firewall',
        network: 'network',
        database: 'database',
        service: 'service',
        user: 'other',
        account: 'other',
        role: 'other',
        vulnerability: 'other',
        'security-control': 'other',
      };
      const node: NetworkGraphNode = {
        id: 'entity-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8),
        label: item.label,
        type: typeMap[itemId] ?? 'other',
        position: x !== undefined && y !== undefined
          ? { x, y }
          : { x: 80 + Math.random() * 600, y: 80 + Math.random() * 400 },
        metadata: entity.properties,
      };
      this.networkGraphEditor.addNode(node);
      this.selectNetworkNode(node.id);
      this.editorShell.addNotification('success', 'Created ' + item.label + '.');
    } catch (error) {
      this.editorShell.addNotification('error', 'Add entity failed: ' + this.errorMessage(error));
    }
    this.emit();
  }

  moveNetworkNode(nodeId: string, x: number, y: number): void {
    try {
      const node = this.networkGraphEditor.getNode(nodeId);
      const edges = this.networkGraphEditor.getConnectedEdges(nodeId);
      this.networkGraphEditor.removeNode(nodeId);
      this.networkGraphEditor.addNode({ ...node, position: { x, y } });
      for (const edge of edges) {
        try { this.networkGraphEditor.addEdge(edge); } catch {}
      }
      this.selectNetworkNode(nodeId);
    } catch (error) {
      this.editorShell.addNotification('error', 'Move network node failed: ' + this.errorMessage(error));
    }
    this.emit();
  }

  connectNetworkNodes(sourceId: string, targetId: string, edgeType?: string): void {
    try {
      this.networkGraphEditor.connect(sourceId, targetId, { type: edgeType });
      this.editorShell.addNotification('success', 'Connected ' + sourceId + ' -> ' + targetId);
    } catch (error) {
      this.editorShell.addNotification('error', 'Connect nodes failed: ' + this.errorMessage(error));
    }
    this.emit();
  }

  removeNetworkNode(nodeId: string): void {
    try {
      this.networkGraphEditor.removeNode(nodeId);
      if (this.inspector.getSelectedTargetId() === nodeId) {
        this.inspector.clearSelection();
      }
      this.editorShell.addNotification('success', 'Network node removed.');
    } catch (error) {
      this.editorShell.addNotification('error', 'Remove network node failed: ' + this.errorMessage(error));
    }
    this.emit();
  }

  removeNetworkEdge(edgeId: string): void {
    try {
      this.networkGraphEditor.removeEdge(edgeId);
      this.editorShell.addNotification('success', 'Network edge removed.');
    } catch (error) {
      this.editorShell.addNotification('error', 'Remove network edge failed: ' + this.errorMessage(error));
    }
    this.emit();
  }

  searchNetworkNodes(query: string): NetworkGraphNode[] {
    try {
      return this.networkGraphEditor.search(query);
    } catch (error) {
      this.editorShell.addNotification('error', 'Search network failed: ' + this.errorMessage(error));
      return [];
    }
  }

  validateNetworkGraph(): void {
    try {
      const nodes = this.networkGraphEditor.listNodes();
      const isolated = nodes.filter((node) => this.networkGraphEditor.getConnectedEdges(node.id).length === 0);
      const message = isolated.length === 0
        ? 'Network validation passed.'
        : 'Network validation: ' + isolated.length + ' isolated node(s).';
      this.editorShell.addNotification(isolated.length === 0 ? 'success' : 'warning', message);
    } catch (error) {
      this.editorShell.addNotification('error', 'Network validation failed: ' + this.errorMessage(error));
    }
    this.emit();
  }

    addAttackGraphNode(label: string, status: string = 'hidden', stage?: string): void {
    try {
      const node: EditorAttackGraphNode = {
        id: 'attack-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8),
        label: label.trim() || 'Attack Node',
        status: status as EditorAttackGraphNode['status'],
        stage: stage || undefined,
      };
      this.attackGraphEditor.addNode(node);
      this.editorShell.addNotification('success', 'Attack node added.');
    } catch (error) { this.editorShell.addNotification('error', 'Add attack node failed: ' + this.errorMessage(error)); }
    this.emit();
  }

  connectAttackGraphNodes(sourceId: string, targetId: string): void {
    try { this.attackGraphEditor.connect(sourceId, targetId); this.editorShell.addNotification('success', 'Attack nodes connected.'); }
    catch (error) { this.editorShell.addNotification('error', 'Connect attack nodes failed: ' + this.errorMessage(error)); }
    this.emit();
  }

  removeAttackGraphNode(nodeId: string): void {
    try { this.attackGraphEditor.removeNode(nodeId); this.editorShell.addNotification('success', 'Attack node removed.'); }
    catch (error) { this.editorShell.addNotification('error', 'Remove attack node failed: ' + this.errorMessage(error)); }
    this.emit();
  }

  addEvidenceGraphNode(label: string, type: string = 'evidence'): void {
    try {
      const node: EditorEvidenceGraphNode = {
        id: 'evidence-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8),
        label: label.trim() || 'Evidence Node',
        type: type as EditorEvidenceGraphNode['type'],
        timestamp: Date.now(),
      };
      this.evidenceGraphEditor.addNode(node);
      this.editorShell.addNotification('success', 'Evidence node added.');
    } catch (error) { this.editorShell.addNotification('error', 'Add evidence node failed: ' + this.errorMessage(error)); }
    this.emit();
  }

  connectEvidenceGraphNodes(sourceId: string, targetId: string, relationType: string = 'references'): void {
    try {
      this.evidenceGraphEditor.connect(sourceId, targetId, relationType as EditorEvidenceGraphEdge['type']);
      this.editorShell.addNotification('success', 'Evidence nodes connected.');
    } catch (error) { this.editorShell.addNotification('error', 'Connect evidence nodes failed: ' + this.errorMessage(error)); }
    this.emit();
  }

  removeEvidenceGraphNode(nodeId: string): void {
    try { this.evidenceGraphEditor.removeNode(nodeId); this.editorShell.addNotification('success', 'Evidence node removed.'); }
    catch (error) { this.editorShell.addNotification('error', 'Remove evidence node failed: ' + this.errorMessage(error)); }
    this.emit();
  }

  addTimelineEntry(timestamp: number, label: string, type: string = 'event'): void {
    try {
      const entry: EditorTimelineEntry = {
        id: 'timeline-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8),
        timestamp,
        label: label.trim() || 'Timeline Entry',
        type: type as EditorTimelineEntry['type'],
      };
      this.timelineEditor.addEntry(entry);
      this.editorShell.addNotification('success', 'Timeline entry added.');
    } catch (error) { this.editorShell.addNotification('error', 'Add timeline entry failed: ' + this.errorMessage(error)); }
    this.emit();
  }

  removeTimelineEntry(entryId: string): void {
    try { this.timelineEditor.removeEntry(entryId); this.editorShell.addNotification('success', 'Timeline entry removed.'); }
    catch (error) { this.editorShell.addNotification('error', 'Remove timeline entry failed: ' + this.errorMessage(error)); }
    this.emit();
  }

    createScenario(name: string, description?: string): void {
    try {
      this.scenarioEditor.setId('scenario-' + Date.now().toString(36));
      this.scenarioEditor.setName(name.trim() || 'Untitled Scenario');
      if (description) this.scenarioEditor.setDescription(description.trim());
      this.scenarioEditor.setOrganization('Default Organization', 'Technology');
      this.currentScenarioData = this.scenarioEditor.getData();
      this.editorShell.addNotification('success', 'Scenario created.');
    } catch (error) { this.editorShell.addNotification('error', 'Create scenario failed: ' + this.errorMessage(error)); }
    this.emit();
  }

  addScenarioNetworkNode(nodeType: string, nodeName?: string): void {
    try {
      this.scenarioEditor.addNetworkNode('node-' + Date.now().toString(36), nodeType, nodeName);
      this.currentScenarioData = this.scenarioEditor.getData();
      this.editorShell.addNotification('success', 'Network node added.');
    } catch (error) { this.editorShell.addNotification('error', 'Add network node failed: ' + this.errorMessage(error)); }
    this.emit();
  }

  addScenarioAsset(name: string, type: string, value: number): void {
    try {
      this.scenarioEditor.addAsset('asset-' + Date.now().toString(36), name.trim() || 'Asset', type, value);
      this.currentScenarioData = this.scenarioEditor.getData();
      this.editorShell.addNotification('success', 'Asset added.');
    } catch (error) { this.editorShell.addNotification('error', 'Add asset failed: ' + this.errorMessage(error)); }
    this.emit();
  }

  addScenarioObjective(description: string): void {
    try {
      this.scenarioEditor.addObjective('objective-' + Date.now().toString(36), description.trim(), 'primary');
      this.currentScenarioData = this.scenarioEditor.getData();
      this.editorShell.addNotification('success', 'Objective added.');
    } catch (error) { this.editorShell.addNotification('error', 'Add objective failed: ' + this.errorMessage(error)); }
    this.emit();
  }

  buildScenario(): void {
    try {
      this.scenarioEditor.build();
      this.currentScenarioData = this.scenarioEditor.getData();
      this.editorShell.addNotification('success', 'Scenario validated and built.');
    } catch (error) { this.editorShell.addNotification('error', 'Scenario build failed: ' + this.errorMessage(error)); }
    this.emit();
  }

  generateScenario(options: ScenarioGeneratorOptions): void {
    try {
      this.currentScenarioData = this.scenarioGenerator.generate(options);
      this.editorShell.addNotification('success', 'Scenario generated.');
    } catch (error) { this.editorShell.addNotification('error', 'Scenario generation failed: ' + this.errorMessage(error)); }
    this.emit();
  }

  createMissionDesign(name: string): void {
    try {
      this.missionDesigner = new MissionDesigner('mission-design-' + Date.now().toString(36), name.trim() || 'New Mission Design');
      this.editorShell.addNotification('success', 'Mission design created.');
    } catch (error) { this.editorShell.addNotification('error', 'Create mission design failed: ' + this.errorMessage(error)); }
    this.emit();
  }

  addMissionObjective(description: string, type: string = 'primary'): void {
    try {
      const objective: EditorMissionDesignerObjective = {
        id: 'objective-' + Date.now().toString(36),
        description: description.trim() || 'New Objective',
        type: type as EditorMissionDesignerObjective['type'],
      };
      this.missionDesigner.addObjective(objective);
      this.editorShell.addNotification('success', 'Mission objective added.');
    } catch (error) { this.editorShell.addNotification('error', 'Add mission objective failed: ' + this.errorMessage(error)); }
    this.emit();
  }

  buildMissionDesign(): void {
    try {
      this.missionDesigner.build();
      this.editorShell.addNotification('success', 'Mission design validated.');
    } catch (error) { this.editorShell.addNotification('error', 'Mission design validation failed: ' + this.errorMessage(error)); }
    this.emit();
  }

  addObjectiveGraphNode(label: string, status: string = 'available'): void {
    try {
      const node: EditorObjectiveGraphNode = {
        id: 'objective-node-' + Date.now().toString(36),
        label: label.trim() || 'Objective Node',
        status: status as EditorObjectiveGraphNodeStatus,
      };
      this.objectiveGraphEditor.addNode(node);
      this.editorShell.addNotification('success', 'Objective node added.');
    } catch (error) { this.editorShell.addNotification('error', 'Add objective node failed: ' + this.errorMessage(error)); }
    this.emit();
  }

  connectObjectiveGraphNodes(sourceId: string, targetId: string, edgeType: string = 'dependency'): void {
    try {
      this.objectiveGraphEditor.connect(sourceId, targetId, edgeType as EditorObjectiveGraphEdgeType);
      this.editorShell.addNotification('success', 'Objective nodes connected.');
    } catch (error) { this.editorShell.addNotification('error', 'Connect objective nodes failed: ' + this.errorMessage(error)); }
    this.emit();
  }

  addEventTriggerRule(name: string, eventType: string, actionType: string): void {
    try {
      const rule: EditorEventTriggerRule = {
        id: 'rule-' + Date.now().toString(36),
        name: name.trim() || 'New Rule',
        condition: { eventType: eventType || 'suspicious-login' },

        actions: [{ actionType: actionType as EditorEventTriggerActionType }],
        enabled: true,
      };
      this.eventTriggerSystem.addRule(rule);
      this.editorShell.addNotification('success', 'Event trigger rule added.');
    } catch (error) { this.editorShell.addNotification('error', 'Add trigger rule failed: ' + this.errorMessage(error)); }
    this.emit();
  }

    captureLiveSimulation(): void {
    try {
      const runner = this.playModeController.getMissionRunner();
      this.liveSimulationSnapshot = this.liveSimulationInspector.capture(runner);
      this.editorShell.addNotification('success', 'Live simulation snapshot captured.');
    } catch (error) {
      this.liveSimulationSnapshot = null;
      this.editorShell.addNotification('warning', 'Live capture unavailable: ' + this.errorMessage(error));
    }
    this.emit();
  }

  recordLiveEvent(type: LiveEventType, source?: string, data?: Record<string, unknown>): void {
    try {
      this.liveEventStream.publish(type, source, data);
      this.editorShell.addNotification('success', 'Live event recorded.');
    } catch (error) { this.editorShell.addNotification('error', 'Record live event failed: ' + this.errorMessage(error)); }
    this.emit();
  }

  clearLiveEvents(): void {
    try {
      this.liveEventStream.clear();
      this.editorShell.addNotification('success', 'Live events cleared.');
    } catch (error) { this.editorShell.addNotification('error', 'Clear live events failed: ' + this.errorMessage(error)); }
    this.emit();
  }

    startDebugger(): void {
    try {
      this.cyreDebugger.start();
      this.captureDebugSnapshot();
      this.editorShell.addNotification('success', 'Debugger started.');
    } catch (error) {
      this.editorShell.addNotification('error', 'Debugger start failed: ' + this.errorMessage(error));
    }
    this.emit();
  }

  pauseDebugger(): void {
    try {
      this.cyreDebugger.pause();
      this.captureDebugSnapshot();
      this.editorShell.addNotification('warning', 'Debugger paused.');
    } catch (error) {
      this.editorShell.addNotification('error', 'Debugger pause failed: ' + this.errorMessage(error));
    }
    this.emit();
  }

  resumeDebugger(): void {
    try {
      this.cyreDebugger.resume();
      this.captureDebugSnapshot();
      this.editorShell.addNotification('success', 'Debugger resumed.');
    } catch (error) {
      this.editorShell.addNotification('error', 'Debugger resume failed: ' + this.errorMessage(error));
    }
    this.emit();
  }

  stopDebugger(): void {
    try {
      this.cyreDebugger.stop();
      this.captureDebugSnapshot();
      this.editorShell.addNotification('warning', 'Debugger stopped.');
    } catch (error) {
      this.editorShell.addNotification('error', 'Debugger stop failed: ' + this.errorMessage(error));
    }
    this.emit();
  }

  refreshDebuggerSnapshot(): void {
    try {
      this.captureDebugSnapshot();
      this.editorShell.addNotification('success', 'Debugger snapshot refreshed.');
    } catch (error) {
      this.editorShell.addNotification('error', 'Debugger snapshot refresh failed: ' + this.errorMessage(error));
    }
    this.emit();
  }

  recordReplayEvent(type: string, data?: unknown): void {
    try {
      this.replayRecorder.record(type, data);
      this.replayStudio.load(this.replayRecorder.getEvents());
      this.editorShell.addNotification('success', 'Replay event recorded.');
    } catch (error) {
      this.editorShell.addNotification('error', 'Record replay event failed: ' + this.errorMessage(error));
    }
    this.emit();
  }

  stepReplay(): void {
    try {
      this.replayStudio.step();
      this.editorShell.addNotification('success', 'Replay stepped.');
    } catch (error) {
      this.editorShell.addNotification('error', 'Replay step failed: ' + this.errorMessage(error));
    }
    this.emit();
  }

  playReplay(): void {
    try {
      this.replayStudio.play();
      this.editorShell.addNotification('success', 'Replay played.');
    } catch (error) {
      this.editorShell.addNotification('error', 'Replay play failed: ' + this.errorMessage(error));
    }
    this.emit();
  }

  stopReplay(): void {
    try {
      this.replayStudio.stop();
      this.editorShell.addNotification('warning', 'Replay stopped.');
    } catch (error) {
      this.editorShell.addNotification('error', 'Replay stop failed: ' + this.errorMessage(error));
    }
    this.emit();
  }

  jumpReplay(index: number): void {
    try {
      this.replayStudio.jumpTo(index);
      this.editorShell.addNotification('success', 'Replay position changed.');
    } catch (error) {
      this.editorShell.addNotification('error', 'Replay jump failed: ' + this.errorMessage(error));
    }
    this.emit();
  }

  addReplayBookmark(label: string): void {
    try {
      this.replayStudio.addBookmark(label);
      this.editorShell.addNotification('success', 'Replay bookmark added.');
    } catch (error) {
      this.editorShell.addNotification('error', 'Add replay bookmark failed: ' + this.errorMessage(error));
    }
    this.emit();
  }

  gotoReplayBookmark(bookmarkId: string): void {
    try {
      this.replayStudio.gotoBookmark(bookmarkId);
      this.editorShell.addNotification('success', 'Replay bookmark jumped.');
    } catch (error) {
      this.editorShell.addNotification('error', 'Goto replay bookmark failed: ' + this.errorMessage(error));
    }
    this.emit();
  }

  private captureDebugSnapshot(): void {
    try {
      this.debugSnapshot = {
        state: this.cyreDebugger.getState(),
        breakpointCount: this.cyreDebugger.listBreakpoints().length,
        entities: this.cyreDebugger.inspectEntities(),
        states: this.cyreDebugger.inspectStates(),
        summary: 'Debugger ' + this.cyreDebugger.getState(),
      };
    } catch {
      this.debugSnapshot = null;
    }
  }

    activateTheme(themeId: string): void {
    try {
      this.uiThemeManager.activateTheme(themeId);
      this.editorShell.addNotification('success', 'Theme activated: ' + themeId);
    } catch (error) {
      this.editorShell.addNotification('error', 'Activate theme failed: ' + this.errorMessage(error));
    }
    this.emit();
  }

  setReduceMotion(enabled: boolean): void {
    try {
      this.motionSystem.setReduceMotion(enabled);
      this.accessibilityController.setReduceMotion(enabled);
      this.editorShell.addNotification('success', 'Motion reduction ' + (enabled ? 'enabled' : 'disabled'));
    } catch (error) {
      this.editorShell.addNotification('error', 'Set reduce motion failed: ' + this.errorMessage(error));
    }
    this.emit();
  }

  setMotionDuration(durationMs: number): void {
    try {
      this.motionSystem.setDuration(durationMs);
      this.editorShell.addNotification('success', 'Motion duration updated.');
    } catch (error) {
      this.editorShell.addNotification('error', 'Set motion duration failed: ' + this.errorMessage(error));
    }
    this.emit();
  }

  setFontSizeScale(scale: number): void {
    try {
      this.accessibilityController.setFontSizeScale(scale);
      this.editorShell.addNotification('success', 'Font size scale updated.');
    } catch (error) {
      this.editorShell.addNotification('error', 'Set font size scale failed: ' + this.errorMessage(error));
    }
    this.emit();
  }

  setHighContrast(enabled: boolean): void {
    try {
      this.accessibilityController.setHighContrast(enabled);
      this.editorShell.addNotification('success', 'High contrast ' + (enabled ? 'enabled' : 'disabled'));
    } catch (error) {
      this.editorShell.addNotification('error', 'Set high contrast failed: ' + this.errorMessage(error));
    }
    this.emit();
  }

  runUxAudit(): void {
    try {
      const audit = new UxAuditSystem({
        motion: this.motionSystem,
      });
      this.uxAuditReport = audit.audit();
      this.editorShell.addNotification('success', 'UX audit completed.');
    } catch (error) {
      this.editorShell.addNotification('error', 'UX audit failed: ' + this.errorMessage(error));
    }
    this.emit();
  }

  runVisualDesignAudit(): void {
    try {
      const audit = new VisualDesignAuditSystem({
        themeManager: this.uiThemeManager,
      });
      this.visualDesignAuditReport = audit.audit();
      this.editorShell.addNotification('success', 'Visual design audit completed.');
    } catch (error) {
      this.editorShell.addNotification('error', 'Visual design audit failed: ' + this.errorMessage(error));
    }
    this.emit();
  }

    refreshGameUI(): void {
    try {
      this.gameUiRender = this.gameUiWorkspace.render() as Record<string, unknown>;
      this.editorShell.addNotification('success', 'Game UI refreshed.');
    } catch (error) {
      this.gameUiRender = null;
      this.editorShell.addNotification('error', 'Refresh game UI failed: ' + this.errorMessage(error));
    }
    this.emit();
  }

  setGameUIEvidence(items: unknown[]): void {
    try {
      this.gameUiWorkspace.setEvidence(items as any);
      this.refreshGameUI();
    } catch (error) {
      this.editorShell.addNotification('error', 'Set game UI evidence failed: ' + this.errorMessage(error));
      this.emit();
    }
  }

  addGameUIEvidence(item: unknown): void {
    try {
      this.gameUiWorkspace.addEvidence(item as any);
      this.refreshGameUI();
    } catch (error) {
      this.editorShell.addNotification('error', 'Add game UI evidence failed: ' + this.errorMessage(error));
      this.emit();
    }
  }

  setGameUIAlerts(items: unknown[]): void {
    try {
      this.gameUiWorkspace.setAlerts(items as any);
      this.refreshGameUI();
    } catch (error) {
      this.editorShell.addNotification('error', 'Set game UI alerts failed: ' + this.errorMessage(error));
      this.emit();
    }
  }

  addGameUIAlert(item: unknown): void {
    try {
      this.gameUiWorkspace.addAlert(item as any);
      this.refreshGameUI();
    } catch (error) {
      this.editorShell.addNotification('error', 'Add game UI alert failed: ' + this.errorMessage(error));
      this.emit();
    }
  }

  setGameUITimeline(events: unknown[]): void {
    try {
      this.gameUiWorkspace.setTimeline(events as any);
      this.refreshGameUI();
    } catch (error) {
      this.editorShell.addNotification('error', 'Set game UI timeline failed: ' + this.errorMessage(error));
      this.emit();
    }
  }

  addGameUITimelineEvent(event: unknown): void {
    try {
      this.gameUiWorkspace.addTimelineEvent(event as any);
      this.refreshGameUI();
    } catch (error) {
      this.editorShell.addNotification('error', 'Add game UI timeline event failed: ' + this.errorMessage(error));
      this.emit();
    }
  }

  setGameUIMission(mission: unknown): void {
    try {
      this.gameUiWorkspace.setMission(mission as any);
      this.refreshGameUI();
    } catch (error) {
      this.editorShell.addNotification('error', 'Set game UI mission failed: ' + this.errorMessage(error));
      this.emit();
    }
  }

  setGameUIActivePanel(panel: string): void {
    try {
      this.gameUiWorkspace.setActivePanel(panel as any);
      this.refreshGameUI();
    } catch (error) {
      this.editorShell.addNotification('error', 'Set game UI active panel failed: ' + this.errorMessage(error));
      this.emit();
    }
  }

    initializeRenderingSystem(): void {
    try {
      this.renderBackendRegistry.register(this.simpleRenderBackend);
      for (const backend of createEngineRenderBackends()) {
        this.renderBackendRegistry.register(backend);
      }
      const defaultId = backendIdForMode(this.renderMode);
      this.renderBackendRegistry.setDefault(defaultId);
      this.activeRenderingBackendId = defaultId;
      this.editorShell.addNotification('success', 'Rendering system initialized.');
    } catch (error) {
      this.editorShell.addNotification('error', 'Rendering system init failed: ' + this.errorMessage(error));
    }
  }

  listRenderingBackends(): Array<{
    id: string;
    name: string;
    capabilities: Record<string, unknown>;
  }> {
    try {
      return this.renderBackendRegistry.list().map((backend) => ({
        id: backend.id,
        name: backend.name,
        capabilities: backend.capabilities.toJSON(),
      }));
    } catch (error) {
      this.editorShell.addNotification('error', 'List render backends failed: ' + this.errorMessage(error));
      return [];
    }
  }

  setActiveRenderingBackend(backendId: string): void {
    try {
      this.renderBackendRegistry.setDefault(backendId);
      this.activeRenderingBackendId = backendId;
      this.editorShell.addNotification('success', 'Active render backend: ' + backendId);
    } catch (error) {
      this.editorShell.addNotification('error', 'Set render backend failed: ' + this.errorMessage(error));
    }
    this.emit();
  }

  renderScene(width: number, height: number, mode: string): void {
    try {
      const requestedId = backendIdForMode(mode);
      const backend =
        this.renderBackendRegistry.get(requestedId) ??
        this.renderBackendRegistry.getDefault();
      if (!backend) {
        throw new Error('No active render backend.');
      }

      const scene = new SceneGraph();
      for (const node of this.networkGraphEditor.listNodes()) {
        scene.addNode({
          id: node.id,
          name: node.label,
          type: node.type,
          metadata: {
            ...(node.metadata ?? {}),
            x: node.position?.x,
            y: node.position?.y,
          },
        });
      }

      const target = new RenderTarget({
        id: 'studio-main-target',
        width,
        height,
        mode: mode as RenderingMode,
      });

      const request = new RenderRequest({
        id: 'studio-render-' + Date.now().toString(36),
        targetId: target.id,
      });

      const result = backend.render(target, request, scene);
      this.renderResult = result;
      this.editorShell.addNotification('success', 'Scene rendered.');
    } catch (error) {
      this.renderResult = null;
      this.editorShell.addNotification('error', 'Render scene failed: ' + this.errorMessage(error));
    }
    this.emit();
  }

    registerAsset(name: string, type: string, path?: string): void {
    try {
      const descriptor = new AssetDescriptor({
        id: 'asset-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8),
        name: name.trim() || 'Unnamed Asset',
        type: type as any,
        path: path || undefined,
        tags: [],
      });
      this.assetManager.register(descriptor);
      this.editorShell.addNotification('success', 'Asset registered: ' + descriptor.name);
    } catch (error) {
      this.editorShell.addNotification('error', 'Register asset failed: ' + this.errorMessage(error));
    }
    this.emit();
  }

  importAssetFromContent(name: string, type: string, content: string): void {
    try {
      const request = new AssetImportRequest({
        id: 'import-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8),
        name: name.trim() || 'Imported Asset',
        type: type as any,
        content,
      });
      const result = this.assetImportPipeline.importAsset(request);
      this.editorShell.addNotification('success', 'Asset import processed: ' + result.status);
    } catch (error) {
      this.editorShell.addNotification('error', 'Import asset failed: ' + this.errorMessage(error));
    }
    this.emit();
  }

  generateAssetPreviews(): void {
    try {
      const previews = this.assetPreviewGenerator.previewAll();
      this.editorShell.addNotification('success', 'Generated ' + previews.length + ' asset preview(s).');
    } catch (error) {
      this.editorShell.addNotification('error', 'Generate asset previews failed: ' + this.errorMessage(error));
    }
    this.emit();
  }

  createSampleCyreScript(): void {
    try {
      const script = new CyreScript({
        id: 'sample-script',
        name: 'Sample CYRE Script',
        description: 'A directly registered sample CYRE script.',
        organizationName: 'Sample Organization',
        industry: 'Technology',
        networkNodes: [
          { id: 'node-a', type: 'host', name: 'Workstation A' },
          { id: 'node-b', type: 'server', name: 'Server B' },
        ],
        networkEdges: [
          { source: 'node-a', target: 'node-b' },
        ],
        assets: [],
        users: [],
        attacker: {
          id: 'attacker-1',
          name: 'Sample Attacker',
          objective: 'Gain access',
          sophistication: 'low',
        },
        defense: {
          controls: ['edr'],
          monitoringLevel: 'basic',
        },
        attackPath: {
          source: 'node-a',
          target: 'node-b',
          path: ['node-a', 'node-b'],
        },
        evidence: [],
        objectives: [
          {
            id: 'objective-1',
            description: 'Investigate the incident',
            type: 'primary',
          },
        ],
        timeline: [],
      });

      this.cyreScriptRegistry.register(script);
      this.editorShell.addNotification('success', 'Sample CYRE script created.');
    } catch (error) {
      this.editorShell.addNotification('error', 'Create sample script failed: ' + this.errorMessage(error));
    }
    this.emit();
  }

  registerCyreScriptFromDefinition(definition: Record<string, unknown>): void {
    try {
      const script = new CyreScriptBuilder()
        .withId(String(definition.id ?? ''))
        .withName(String(definition.name ?? ''))
        .withOrganization(String(definition.organizationName ?? 'Default Organization'))
        .addNetworkNode('node-a', 'host', 'Node A')
        .addNetworkNode('node-b', 'server', 'Node B')
        .addNetworkEdge('node-a', 'node-b')
        .setAttacker({
          id: 'attacker-1',
          name: 'Attacker',
          objective: 'Compromise target',
          sophistication: 'low',
        })
        .setDefense([], 'basic')
        .setAttackPath('node-a', 'node-b', ['node-a', 'node-b'])
        .addObjective('objective-1', 'Investigate the incident', 'primary')
        .buildScript();

      this.cyreScriptRegistry.register(script);
      this.editorShell.addNotification('success', 'CYRE script registered.');
    } catch (error) {
      this.editorShell.addNotification('error', 'Register script failed: ' + this.errorMessage(error));
    }
    this.emit();
  }

  registerSamplePlugin(name?: string): void {
    try {
      const plugin = {
        id: 'plugin-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8),
        name: name?.trim() || 'Sample CYRE Plugin',
        version: '1.0.0',
        description: 'A sample plugin registered from CYRE Studio.',
        async activate() {},
      };

      this.cyrePluginManager.registerPlugin(plugin as any);
      this.editorShell.addNotification('success', 'Sample plugin registered.');
    } catch (error) {
      this.editorShell.addNotification('error', 'Register plugin failed: ' + this.errorMessage(error));
    }
    this.emit();
  }

    registerBuildProfile(
    id: string,
    name: string,
    target: string,
    flavor: string,
  ): void {
    try {
      const profile = new BuildProfile({
        id: id.trim() || 'build-' + Date.now().toString(36),
        name: name.trim() || 'Build Profile',
        target: target as any,
        flavor: flavor as any,
      });

      this.buildPipeline.registerProfile(profile);
      this.editorShell.addNotification('success', 'Build profile registered: ' + profile.name);
    } catch (error) {
      this.editorShell.addNotification('error', 'Register build profile failed: ' + this.errorMessage(error));
    }
    this.emit();
  }

  buildProfile(profileId: string): void {
    try {
      const result = this.buildPipeline.build(profileId);
      this.buildResults = [result as unknown as Record<string, unknown>];
      this.editorShell.addNotification('success', 'Build completed for ' + profileId);
    } catch (error) {
      this.editorShell.addNotification('error', 'Build profile failed: ' + this.errorMessage(error));
    }
    this.emit();
  }

  setReleaseChannel(channel: string): void {
    try {
      this.releaseChannelManager.setActive(channel);
      this.editorShell.addNotification('success', 'Release channel set to ' + channel);
    } catch (error) {
      this.editorShell.addNotification('error', 'Set release channel failed: ' + this.errorMessage(error));
    }
    this.emit();
  }

  runCiCdPipeline(): void {
    try {
      const result = this.ciCdPipeline.run();
      this.ciCdResult = result as unknown as Record<string, unknown>;
      this.editorShell.addNotification('success', 'CI/CD pipeline completed.');
    } catch (error) {
      this.ciCdResult = null;
      this.editorShell.addNotification('error', 'CI/CD pipeline failed: ' + this.errorMessage(error));
    }
    this.emit();
  }

  packageWebGame(name: string): void {
    try {
      const result = this.webPackager.package({
        id: 'web-' + Date.now().toString(36),
        name: name.trim() || 'CYRE Web Game',
        version: '1.0.0',
        entryPoint: 'index.html',
      });

      this.packagingResults = [
        ...this.packagingResults,
        result.package.toJSON(),
      ];
      this.editorShell.addNotification('success', 'Web package created.');
    } catch (error) {
      this.editorShell.addNotification('error', 'Web packaging failed: ' + this.errorMessage(error));
    }
    this.emit();
  }

  packageDesktopGame(name: string): void {
    try {
      const result = this.desktopPackager.package({
        id: 'desktop-' + Date.now().toString(36),
        name: name.trim() || 'CYRE Desktop Game',
        version: '1.0.0',
        executableName: 'cyre-game',
      });

      this.packagingResults = [
        ...this.packagingResults,
        result.package.toJSON(),
      ];
      this.editorShell.addNotification('success', 'Desktop package created.');
    } catch (error) {
      this.editorShell.addNotification('error', 'Desktop packaging failed: ' + this.errorMessage(error));
    }
    this.emit();
  }

  packageMobileGame(name: string): void {
    try {
      const result = this.mobilePackager.package({
        id: 'mobile-' + Date.now().toString(36),
        name: name.trim() || 'CYRE Mobile Game',
        version: '1.0.0',
        bundleId: 'com.cyre.game',
      });

      this.packagingResults = [
        ...this.packagingResults,
        result.package.toJSON(),
      ];
      this.editorShell.addNotification('success', 'Mobile package created.');
    } catch (error) {
      this.editorShell.addNotification('error', 'Mobile packaging failed: ' + this.errorMessage(error));
    }
    this.emit();
  }

    setRenderMode(mode: string): void {
    if (!['2d', '2.5d', '3d'].includes(mode)) {
      throw new Error('Invalid render mode: ' + mode);
    }

    this.renderMode = mode as '2d' | '2.5d' | '3d';
    const backendId = backendIdForMode(mode);
    if (this.renderBackendRegistry.has(backendId)) {
      this.renderBackendRegistry.setDefault(backendId);
      this.activeRenderingBackendId = backendId;
    }
    this.editorShell.addNotification('success', 'Render mode set to ' + mode.toUpperCase());
    this.emit();
  }

    play(): void {
    try {
      this.playModeController.start();
      this.editorShell.setStatusMessage('Simulation running.');
    } catch (error) {
      this.editorShell.addNotification(
        'error',
        `Simulation start failed: ${this.errorMessage(error)}`,
      );
    }

    this.emit();
  }

  pause(): void {
    try {
      this.playModeController.pause();
      this.editorShell.setStatusMessage('Simulation paused.');
    } catch (error) {
      this.editorShell.addNotification(
        'error',
        `Simulation pause failed: ${this.errorMessage(error)}`,
      );
    }

    this.emit();
  }

  resume(): void {
    try {
      this.playModeController.resume();
      this.editorShell.setStatusMessage('Simulation running.');
    } catch (error) {
      this.editorShell.addNotification(
        'error',
        `Simulation resume failed: ${this.errorMessage(error)}`,
      );
    }

    this.emit();
  }

  stop(): void {
    try {
      this.playModeController.stop();
      this.editorShell.setStatusMessage('Simulation stopped.');
    } catch (error) {
      this.editorShell.addNotification(
        'error',
        `Simulation stop failed: ${this.errorMessage(error)}`,
      );
    }

    this.emit();
  }

  restart(): void {
    try {
      if (this.playModeController.getState() !== 'stopped') {
        this.playModeController.stop();
      }
      this.playModeController.start();
      this.editorShell.setStatusMessage('Simulation restarted.');
    } catch (error) {
      this.editorShell.addNotification(
        'error',
        `Simulation restart failed: ${this.errorMessage(error)}`,
      );
    }

    this.emit();
  }

  setSimulationSpeed(speed: number): void {
    try {
      this.playModeController.setSpeed(speed);
    } catch (error) {
      this.editorShell.addNotification(
        'error',
        `Speed change failed: ${this.errorMessage(error)}`,
      );
      throw error;
    }

    this.emit();
  }

  executeCommand(commandId: string): void {
    try {
      const executed = this.commandPalette.execute(commandId);

      if (!executed) {
        this.editorShell.addNotification(
          'warning',
          `Command "${commandId}" has no action.`,
        );
        this.emit();
      }
    } catch (error) {
      this.editorShell.addNotification(
        'error',
        `Command execution failed: ${this.errorMessage(error)}`,
      );
      this.emit();
    }
  }

  notify(
    level: EditorNotification['type'],
    message: string,
  ): void {
    if (!message.trim()) {
      throw new Error('Notification message is required.');
    }

    this.editorShell.addNotification(level, message.trim());
    this.emit();
  }

  clearNotifications(): void {
    this.editorShell.clearNotifications();
    this.emit();
  }

  private seedDefaultStudioScene(): void {
    const defaults: Array<[string, number, number]> = [
      ['server', 140, 140],
      ['server', 310, 180],
      ['client', 110, 250],
      ['client', 380, 90],
      ['router', 240, 210],
      ['firewall', 80, 180],
      ['database', 410, 240],
    ];

    const created: string[] = [];
    for (const [itemId, x, y] of defaults) {
      try {
        this.addNetworkNodeFromPalette(itemId, x, y);
        const nodes = this.networkGraphEditor.listNodes();
        const last = nodes[nodes.length - 1];
        if (last) created.push(last.id);
      } catch (error) {
        this.editorShell.addNotification(
          'error',
          'Seed default scene failed for ' + itemId + ': ' + this.errorMessage(error),
        );
      }
    }

    const links: Array<[number, number]> = [
      [5, 4],
      [4, 0],
      [4, 1],
      [2, 4],
      [3, 4],
      [0, 6],
      [1, 6],
    ];
    for (const [sourceIndex, targetIndex] of links) {
      const source = created[sourceIndex];
      const target = created[targetIndex];
      if (!source || !target) continue;
      try {
        this.networkGraphEditor.connect(source, target);
      } catch {
        // Graph validation may reject a duplicate seed link.
      }
    }
  }

    private initializeStudioShell(): void {
    const panels: PanelInit[] = [
      {
        id: 'project-explorer',
        title: 'Project Explorer',
        editorDock: 'left',
        dockArea: 'left',
        order: 1,
      },
      {
        id: 'network-viewport',
        title: 'Network Viewport',
        editorDock: 'center',
        dockArea: 'center',
        order: 2,
      },
      {
        id: 'inspector',
        title: 'Inspector',
        editorDock: 'right',
        dockArea: 'right',
        order: 3,
      },
      {
        id: 'console',
        title: 'Console',
        editorDock: 'bottom',
        dockArea: 'bottom',
        order: 4,
      },
      {
        id: 'entity-palette',
        title: 'Entity Palette',
        editorDock: 'left',
        dockArea: 'left',
        order: 5,
      },
      {
        id: 'attack-graph',
        title: 'Attack Graph',
        editorDock: 'center',
        dockArea: 'center',
        order: 6,
      },
      {
        id: 'evidence-graph',
        title: 'Evidence Graph',
        editorDock: 'center',
        dockArea: 'center',
        order: 7,
      },
      {
        id: 'timeline-editor',
        title: 'Timeline',
        editorDock: 'bottom',
        dockArea: 'bottom',
        order: 8,
      },
      {
        id: 'scenario-designer',
        title: 'Scenario Designer',
        editorDock: 'center',
        dockArea: 'center',
        order: 9,
      },
      {
        id: 'mission-designer',
        title: 'Mission Designer',
        editorDock: 'center',
        dockArea: 'center',
        order: 10,
      },
      {
        id: 'objective-graph',
        title: 'Objective Graph',
        editorDock: 'center',
        dockArea: 'center',
        order: 11,
      },
      {
        id: 'event-trigger-system',
        title: 'Event Triggers',
        editorDock: 'center',
        dockArea: 'center',
        order: 12,
      },
      {
        id: 'scenario-generator',
        title: 'Scenario Generator',
        editorDock: 'center',
        dockArea: 'center',
        order: 13,
      },
      {
        id: 'live-inspector',
        title: 'Live Inspector',
        editorDock: 'right',
        dockArea: 'right',
        order: 14,
      },
      {
        id: 'live-events',
        title: 'Live Events',
        editorDock: 'bottom',
        dockArea: 'bottom',
        order: 15,
      },
      {
        id: 'debugger-panel',
        title: 'Debugger',
        editorDock: 'right',
        dockArea: 'right',
        order: 16,
      },
      {
        id: 'replay-panel',
        title: 'Replay',
        editorDock: 'bottom',
        dockArea: 'bottom',
        order: 17,
      },
      {
        id: 'presentation-panel',
        title: 'Presentation',
        editorDock: 'right',
        dockArea: 'right',
        order: 18,
      },
      {
        id: 'game-ui-panel',
        title: 'Game UI',
        editorDock: 'center',
        dockArea: 'center',
        order: 19,
      },
      {
        id: 'rendering-panel',
        title: 'Rendering',
        editorDock: 'center',
        dockArea: 'center',
        order: 20,
      },
      {
        id: 'asset-pipeline',
        title: 'Asset Pipeline',
        editorDock: 'center',
        dockArea: 'center',
        order: 21,
      },
      {
        id: 'scripting-panel',
        title: 'Scripting & Plugins',
        editorDock: 'center',
        dockArea: 'center',
        order: 22,
      },
      {
        id: 'build-deployment',
        title: 'Build & Deploy',
        editorDock: 'center',
        dockArea: 'center',
        order: 23,
      },
      {
        id: 'asset-files',
        title: 'Import / Export',
        editorDock: 'center',
        dockArea: 'center',
        order: 25,
      },
    ];

    for (const panel of panels) {
      this.editorShell.addPanel({
        id: panel.id,
        title: panel.title,
        dockPosition: panel.editorDock,
        isVisible: true,
        order: panel.order,
      });

      this.dockManager.addPanel({
        id: panel.id,
        title: panel.title,
        area: panel.dockArea,
        order: panel.order,
        visible: true,
      });

      this.defaultDockAreas.set(panel.id, panel.dockArea);
    }

    // Add a stable default editor workspace so the user can always return
    this.workspaceManager.addCustomWorkspace({
      id: 'editor',
      name: 'Main',
      panelLayouts: [
        { id: 'project-explorer', title: 'Project Explorer', area: 'left', order: 1, visible: true },
        { id: 'network-viewport', title: 'Network Viewport', area: 'center', order: 2, visible: true },
        { id: 'inspector', title: 'Inspector', area: 'right', order: 3, visible: true },
        { id: 'console', title: 'Console', area: 'bottom', order: 4, visible: true },
      ],
    });

    this.activeWorkspaceId = 'editor';
    this.workspaceManager.activateWorkspace('editor', this.dockManager);

        this.dockManager.tabPanels(['project-explorer', 'entity-palette']);

        this.registerMenuGroups();
    this.registerToolbarButtons();
    this.registerCommands();

  }

  private registerMenuGroups(): void {
    const viewItems: MenuItem[] = this.editorShell.listPanels().map((panel) => ({
      id: 'view.toggle-' + panel.id,
      label: 'Toggle ' + panel.title,
      action: 'view.toggle-' + panel.id,
      enabled: true,
    }));

    const groups: MenuGroup[] = [
      {
        id: 'file', label: 'File', items: [
          { id: 'project.new', label: 'New Project', action: 'project.new', shortcut: 'Cmd+N', enabled: true },
          { id: 'project.save', label: 'Save Project', action: 'project.save', shortcut: 'Cmd+S', enabled: true },
        ],
      },
      { id: 'view', label: 'View', items: viewItems },
      {
        id: 'simulation', label: 'Simulation', items: [
          { id: 'simulation.play', label: 'Play', action: 'simulation.play', shortcut: 'F6', enabled: true },
          { id: 'simulation.pause', label: 'Pause', action: 'simulation.pause', shortcut: 'F7', enabled: true },
          { id: 'simulation.stop', label: 'Stop', action: 'simulation.stop', enabled: true },
          { id: 'simulation.restart', label: 'Restart', action: 'simulation.restart', enabled: true },
        ],
      },
    ];

    for (const group of groups) {
      this.editorShell.addMenuGroup(group);
    }
  }

  private registerToolbarButtons(): void {
    const buttons: ToolbarButton[] = [
      {
        id: 'simulation.play',
        label: 'Play',
        icon: '▶',
        action: 'simulation.play',
        tooltip: 'Play simulation',
      },
      {
        id: 'simulation.pause',
        label: 'Pause',
        icon: 'Ⅱ',
        action: 'simulation.pause',
        tooltip: 'Pause simulation',
      },
      {
        id: 'simulation.stop',
        label: 'Stop',
        icon: '■',
        action: 'simulation.stop',
        tooltip: 'Stop simulation',
      },
      {
        id: 'simulation.restart',
        label: 'Restart',
        icon: '↻',
        action: 'simulation.restart',
        tooltip: 'Restart simulation',
      },
    ];

    for (const button of buttons) {
      this.editorShell.addToolbarButton(button);
    }
  }

  private registerCommands(): void {
    const commands: EditorCommand[] = [
      { id: 'project.new', label: 'New Project', category: 'Project', shortcut: 'Cmd+N', action: () => this.createProject() },
      { id: 'project.save', label: 'Save Project', category: 'Project', shortcut: 'Cmd+S', action: () => this.saveProject() },
      { id: 'simulation.play', label: 'Play Simulation', category: 'Simulation', shortcut: 'F6', action: () => this.play() },
      { id: 'simulation.pause', label: 'Pause Simulation', category: 'Simulation', shortcut: 'F7', action: () => this.pause() },
      { id: 'simulation.stop', label: 'Stop Simulation', category: 'Simulation', shortcut: 'F8', action: () => this.stop() },
      { id: 'simulation.restart', label: 'Restart Simulation', category: 'Simulation', action: () => this.restart() },
      { id: 'project.open-saved', label: 'Open Last Project', category: 'Project', action: () => { this.loadSavedProject(); } },
      { id: 'view.mode-2d', label: 'Switch to 2D Engine', category: 'View', shortcut: '1', action: () => this.setRenderMode('2d') },
      { id: 'view.mode-2.5d', label: 'Switch to 2.5D Engine', category: 'View', shortcut: '2', action: () => this.setRenderMode('2.5d') },
      { id: 'view.mode-3d', label: 'Switch to 3D Engine', category: 'View', shortcut: '3', action: () => this.setRenderMode('3d') },
    ];

    for (const panel of this.editorShell.listPanels()) {
      commands.push({
        id: 'view.toggle-' + panel.id,
        label: 'Toggle ' + panel.title,
        category: 'View',
        action: () => this.togglePanel(panel.id),
      });
    }

    for (const command of commands) {
      this.commandPalette.addCommand(command);
    }
  }

  private syncProjectExplorer(project: ProjectModel): void {
    const explorer = new ProjectExplorer();
    const rootId = `project:${project.getId()}`;

    explorer.addNode({
      id: rootId,
      name: project.getName(),
      type: 'folder',
    });

    const missionFolderId = `${rootId}:missions`;
    explorer.addNode({
      id: missionFolderId,
      name: 'Missions',
      type: 'folder',
      parentId: rootId,
    });

    for (const missionId of project.getData().missionIds) {
      explorer.addNode({
        id: `${rootId}:mission:${missionId}`,
        name: missionId,
        type: 'mission',
        parentId: missionFolderId,
      });
    }

    const sceneFolderId = `${rootId}:scenes`;
    explorer.addNode({
      id: sceneFolderId,
      name: 'Scenes',
      type: 'folder',
      parentId: rootId,
    });

    for (const scene of project.getData().scenes ?? []) {
      explorer.addNode({
        id: `${rootId}:scene:${scene.id}`,
        name: scene.name,
        type: 'scene',
        parentId: sceneFolderId,
      });
    }

    this.projectExplorer = explorer;
  }

  private resetNetworkGraph(): void {
    this.networkGraphEditor = new NetworkGraphEditor();
  }

  private loadDefaultMission(project: ProjectModel): void {
    const missionId = project.getData().missionIds[0];

    if (!missionId) {
      return;
    }

    try {
      this.playModeController.loadMission(missionId);
    } catch (error) {
      this.editorShell.addNotification(
        'error',
        `Mission load failed: ${this.errorMessage(error)}`,
      );
    }
  }

  private generateProjectId(name: string): string {
    const slug =
      name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'cyre-project';

    return `${slug}-${Date.now().toString(36)}`;
  }

  saveDockLayout(name: string): void {
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error('Layout name is required.');
    }

    try {
      const namedKey = `${this.currentDockLayoutStorageKey}.named`;
      const raw = window.localStorage.getItem(namedKey);
      const layouts = raw
        ? (JSON.parse(raw) as Record<string, DockLayout>)
        : {};

      const layout = this.dockManager.getLayout();
      layouts[trimmedName] = layout;

      window.localStorage.setItem(
        namedKey,
        JSON.stringify(layouts),
      );

      this.setActiveWorkspaceLayout(layout);

      this.editorShell.addNotification(
        'success',
        `Layout "${trimmedName}" saved.`,
      );
    } catch (error) {
      this.editorShell.addNotification(
        'error',
        `Save layout failed: ${this.errorMessage(error)}`,
      );
    }

    this.emit();
  }

  listDockLayouts(): DockLayoutSummary[] {
    try {
      const namedKey = `${this.currentDockLayoutStorageKey}.named`;
      const raw = window.localStorage.getItem(namedKey);
      if (!raw) {
        return [];
      }

      const layouts = JSON.parse(raw) as Record<string, DockLayout>;
      return Object.entries(layouts).map(([name]) => ({
        id: name,
        name,
      }));
    } catch {
      return [];
    }
  }

  loadDockLayout(name: string): void {
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error('Layout name is required.');
    }

    try {
      const namedKey = `${this.currentDockLayoutStorageKey}.named`;
      const raw = window.localStorage.getItem(namedKey);
      if (!raw) {
        throw new Error('No saved layouts found.');
      }

      const layouts = JSON.parse(raw) as Record<string, DockLayout>;
      const layout = layouts[trimmedName];

      if (!layout) {
        throw new Error(
          `Layout "${trimmedName}" does not exist.`,
        );
      }

      this.dockManager.restoreLayout(layout);
      this.setActiveWorkspaceLayout(layout);

      this.editorShell.addNotification(
        'success',
        `Layout "${trimmedName}" loaded.`,
      );
    } catch (error) {
      this.editorShell.addNotification(
        'error',
        `Load layout failed: ${this.errorMessage(error)}`,
      );
    }

    this.emit();
  }

  deleteDockLayout(name: string): void {
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error('Layout name is required.');
    }

    try {
      const namedKey = `${this.currentDockLayoutStorageKey}.named`;
      const raw = window.localStorage.getItem(namedKey);
      if (!raw) {
        throw new Error('No saved layouts found.');
      }

      const layouts = JSON.parse(raw) as Record<string, DockLayout>;
      if (!layouts[trimmedName]) {
        throw new Error(
          `Layout "${trimmedName}" does not exist.`,
        );
      }

      delete layouts[trimmedName];
      window.localStorage.setItem(namedKey, JSON.stringify(layouts));

      const activeLayout = this.getActiveWorkspaceLayout();
      if (
        activeLayout &&
        JSON.stringify(activeLayout) === JSON.stringify(layouts[trimmedName])
      ) {
        window.localStorage.removeItem(
          `${this.currentDockLayoutStorageKey}.active`,
        );
      }

      this.editorShell.addNotification(
        'success',
        `Layout "${trimmedName}" deleted.`,
      );
    } catch (error) {
      this.editorShell.addNotification(
        'error',
        `Delete layout failed: ${this.errorMessage(error)}`,
      );
    }

    this.emit();
  }

  private toEditorDockPosition(
    area: DockArea,
  ): EditorPanel['dockPosition'] {
    switch (area) {
      case 'left':
      case 'right':
      case 'top':
      case 'bottom':
      case 'center':
        return area;
      default:
        return 'center';
    }
  }

  private tryCaptureLiveSimulation(): LiveSimulationSnapshot | null {
    try {
      const runner = this.playModeController.getMissionRunner();
      return this.liveSimulationInspector.capture(runner);
    } catch {
      return null;
    }
  }

    private computeSnapshot(): StudioSnapshot {
    const playState = this.playModeController.getState();

    return {
      projectTitle: this.editorShell.getProjectTitle(),
      statusMessage: this.editorShell.getStatusMessage(),
      panels: this.editorShell.listPanels(),
      menuGroups: this.editorShell.listMenuGroups(),
      toolbarButtons: this.editorShell.listToolbarButtons(),
      notifications: this.editorShell.listNotifications(),
      workspaces: this.workspaceManager.listWorkspaces().sort((a, b) => {
      if (a.id === 'editor') return -1;
      if (b.id === 'editor') return 1;
      return a.name.localeCompare(b.name);
    }),
      activeWorkspaceId: this.activeWorkspaceId,
      projectData: this.currentProject
        ? this.currentProject.getData()
        : null,
      projectExplorerNodes: this.projectExplorer.listNodes(),
      inspectorTarget: this.inspector.getSelectedTarget() ?? null,
      networkNodes: this.networkGraphEditor.listNodes(),
      networkEdges: this.networkGraphEditor.listEdges(),
      playState,
      isPlaying: playState === 'running',
      isPaused: playState === 'paused',
      simulationSpeed: this.playModeController.getSpeed(),
      engineState: this.engine.getState(),
      commands: this.commandPalette.listCommands(),
      dockPanels: this.dockManager.listPanels(),
      maximizedPanelId:
        this.dockManager.getMaximizedPanelId() ?? null,
      activePanelId:
        this.dockManager.getActivePanelId() ?? null,
      savedDockLayouts: this.listDockLayouts(),
      selectedItems: this.multiSelectionManager.getSelectedItems(),
      selectionCount: this.multiSelectionManager.getSelectionCount(),
      entityPaletteItems: this.cyberEntityPalette.listItems(),
      entityPaletteCategories: this.cyberEntityPalette.listCategories(),
      attackGraphNodes: this.attackGraphEditor.listNodes(),
      attackGraphEdges: this.attackGraphEditor.listEdges(),
      evidenceGraphNodes: this.evidenceGraphEditor.listNodes(),
      evidenceGraphEdges: this.evidenceGraphEditor.listEdges(),
      timelineEntries: this.timelineEditor.listEntries(),
      currentScenarioData: this.currentScenarioData,
      missionDesign: this.missionDesigner.getDesign(),
      objectiveGraphNodes: this.objectiveGraphEditor.listNodes(),
      objectiveGraphEdges: this.objectiveGraphEditor.listEdges(),
      eventTriggerRules: this.eventTriggerSystem.listRules(),
      liveSimulationSnapshot: this.tryCaptureLiveSimulation(),
      liveSimulationEvents: this.liveEventStream.listHistory(),
      debugSnapshot: this.debugSnapshot,
      replayEvents: this.replayStudio.listEvents(),
      replayCurrentIndex: this.replayStudio.getCurrentIndex(),
      replayBookmarks: this.replayStudio.listBookmarks(),
      uiThemes: this.uiThemeManager.listThemes(),
      activeThemeId: this.uiThemeManager.getActiveThemeId(),
      motionReduced: this.motionSystem.isMotionReduced(),
      motionDurationMs: this.motionSystem.getDurationMs(),
      accessibilitySettings: this.accessibilityController.getSettings(),
      uxAuditReport: this.uxAuditReport,
      visualDesignAuditReport: this.visualDesignAuditReport,
      gameUiRender: this.gameUiRender,
      renderingBackends: this.listRenderingBackends(),
      activeRenderingBackendId: this.activeRenderingBackendId,
      renderMode: this.renderMode,
      renderResult: this.renderResult,
      assets: this.assetManager.list().map((asset) => asset.toJSON()),
      assetBrowserTypes: this.assetBrowser.listAvailableTypes() as string[],
      assetBrowserTags: this.assetBrowser.listAvailableTags(),
      assetPreviews: this.assetPreviewGenerator.previewAll().map((preview) => preview.toJSON()),
      cyreScripts: this.cyreScriptRegistry.list().map((script) => script.toJSON() as unknown as Record<string, unknown>),
      cyrePluginInfos: this.cyrePluginManager.listPluginInfos().map((info) => ({ ...info })),
      buildProfiles: this.buildPipeline.listProfiles().map((profile) => profile.toJSON()),
      buildResults: this.buildResults,
      releaseChannels: this.releaseChannelManager.list(),
      activeReleaseChannel: this.releaseChannelManager.getActive(),
      ciCdResult: this.ciCdResult,
      packagingResults: this.packagingResults,
    };
  }

  private emit(): void {
    this.snapshot = this.computeSnapshot();

    for (const listener of this.listeners) {
      listener();
    }
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  private readStorage(key: string): string | null {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return null;
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private writeStorage(key: string, value: string): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      window.localStorage.setItem(key, value);
    } catch {
      // Storage can be unavailable in private mode or tests.
    }
  }
}
