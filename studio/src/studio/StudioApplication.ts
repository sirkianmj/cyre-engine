import {
  CommandPalette,
  DockManager,
  EditorShell,
  Engine,
  Inspector,
  NetworkGraphEditor,
  PlayModeController,
  ProjectExplorer,
  ProjectManager,
  WorkspaceManager,
} from '@cyre/engine';

import type {
  DockArea,
  DockLayout,
  DockPanel,
  EditorCommand,
  EditorNotification,
  EditorPanel,
  InspectorTarget,
  MenuGroup,
  MenuItem,
  NetworkGraphEdge,
  NetworkGraphNode,
  ProjectData,
  ProjectModel,
  ProjectNode,
  ProjectNodeType,
  ToolbarButton,
  WorkspaceDefinition,
} from '@cyre/engine';

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
    this.createProject('Untitled CYRE Project', 'soc-game');
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

  setWorkspace(workspaceId: string): void {
    if (!this.workspaceManager.hasWorkspace(workspaceId)) {
      this.editorShell.addNotification(
        'warning',
        `Workspace "${workspaceId}" does not exist.`,
      );
      this.emit();
      return;
    }

    this.restoreActiveWorkspaceLayout(workspaceId);
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

        this.registerMenuGroups();
    this.registerToolbarButtons();
    this.registerCommands();

  }

  private registerMenuGroups(): void {
    const groups: MenuGroup[] = [
      {
        id: 'file',
        label: 'File',
        items: [
          {
            id: 'project.new',
            label: 'New Project',
            action: 'project.new',
            shortcut: 'Cmd+N',
            enabled: true,
          },
          {
            id: 'project.save',
            label: 'Save Project',
            action: 'project.save',
            shortcut: 'Cmd+S',
            enabled: true,
          },
        ],
      },
      {
        id: 'view',
        label: 'View',
        items: [
          {
            id: 'view.toggle-project-explorer',
            label: 'Toggle Project Explorer',
            action: 'view.toggle-project-explorer',
            enabled: true,
          },
          {
            id: 'view.toggle-inspector',
            label: 'Toggle Inspector',
            action: 'view.toggle-inspector',
            enabled: true,
          },
          {
            id: 'view.toggle-console',
            label: 'Toggle Console',
            action: 'view.toggle-console',
            enabled: true,
          },
          {
            id: 'view.toggle-network-viewport',
            label: 'Toggle Network Viewport',
            action: 'view.toggle-network-viewport',
            enabled: true,
          },
        ],
      },
      {
        id: 'simulation',
        label: 'Simulation',
        items: [
          {
            id: 'simulation.play',
            label: 'Play',
            action: 'simulation.play',
            shortcut: 'F6',
            enabled: true,
          },
          {
            id: 'simulation.pause',
            label: 'Pause',
            action: 'simulation.pause',
            shortcut: 'F7',
            enabled: true,
          },
          {
            id: 'simulation.stop',
            label: 'Stop',
            action: 'simulation.stop',
            enabled: true,
          },
          {
            id: 'simulation.restart',
            label: 'Restart',
            action: 'simulation.restart',
            enabled: true,
          },
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
      {
        id: 'project.new',
        label: 'New Project',
        category: 'Project',
        shortcut: 'Cmd+N',
        action: () => this.createProject(),
      },
      {
        id: 'project.save',
        label: 'Save Project',
        category: 'Project',
        shortcut: 'Cmd+S',
        action: () => this.saveProject(),
      },
      {
        id: 'simulation.play',
        label: 'Play Simulation',
        category: 'Simulation',
        shortcut: 'F6',
        action: () => this.play(),
      },
      {
        id: 'simulation.pause',
        label: 'Pause Simulation',
        category: 'Simulation',
        shortcut: 'F7',
        action: () => this.pause(),
      },
      {
        id: 'simulation.stop',
        label: 'Stop Simulation',
        category: 'Simulation',
        shortcut: 'F8',
        action: () => this.stop(),
      },
      {
        id: 'simulation.restart',
        label: 'Restart Simulation',
        category: 'Simulation',
        action: () => this.restart(),
      },
      {
        id: 'view.toggle-project-explorer',
        label: 'Toggle Project Explorer',
        category: 'View',
        action: () => this.togglePanel('project-explorer'),
      },
      {
        id: 'view.toggle-inspector',
        label: 'Toggle Inspector',
        category: 'View',
        action: () => this.togglePanel('inspector'),
      },
      {
        id: 'view.toggle-console',
        label: 'Toggle Console',
        category: 'View',
        action: () => this.togglePanel('console'),
      },
      {
        id: 'view.toggle-network-viewport',
        label: 'Toggle Network Viewport',
        category: 'View',
        action: () => this.togglePanel('network-viewport'),
      },
    ];

    for (const command of commands) {
      this.commandPalette.addCommand(command);
    }
  }

  addProjectNode(
    parentId: string | undefined,
    type: ProjectNodeType,
    name: string,
  ): void {
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error('Project node name is required.');
    }

    try {
      const nodeId = `project-node-${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;

      this.projectExplorer.addNode({
        id: nodeId,
        name: trimmedName,
        type,
        parentId,
      });

      this.editorShell.addNotification(
        'success',
        `Created ${type} "${trimmedName}".`,
      );
    } catch (error) {
      this.editorShell.addNotification(
        'error',
        `Create project node failed: ${this.errorMessage(error)}`,
      );
    }

    this.emit();
  }

  renameProjectNode(nodeId: string, name: string): void {
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error('Project node name is required.');
    }

    try {
      this.projectExplorer.renameNode(nodeId, trimmedName);
      this.editorShell.addNotification(
        'success',
        `Renamed project node to "${trimmedName}".`,
      );
    } catch (error) {
      this.editorShell.addNotification(
        'error',
        `Rename project node failed: ${this.errorMessage(error)}`,
      );
    }

    this.emit();
  }

  deleteProjectNode(nodeId: string): void {
    try {
      this.projectExplorer.removeNode(nodeId);
      this.editorShell.addNotification(
        'success',
        'Project node deleted.',
      );
    } catch (error) {
      this.editorShell.addNotification(
        'error',
        `Delete project node failed: ${this.errorMessage(error)}`,
      );
    }

    this.emit();
  }

  duplicateProjectNode(nodeId: string): void {
    try {
      const newId = `project-node-${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;
      this.projectExplorer.duplicateNode(nodeId, newId);
      this.editorShell.addNotification(
        'success',
        'Project node duplicated.',
      );
    } catch (error) {
      this.editorShell.addNotification(
        'error',
        `Duplicate project node failed: ${this.errorMessage(error)}`,
      );
    }

    this.emit();
  }

  moveProjectNode(nodeId: string, newParentId?: string): void {
    try {
      this.projectExplorer.moveNode(nodeId, newParentId);
      this.editorShell.addNotification(
        'success',
        'Project node moved.',
      );
    } catch (error) {
      this.editorShell.addNotification(
        'error',
        `Move project node failed: ${this.errorMessage(error)}`,
      );
    }

    this.emit();
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
}
