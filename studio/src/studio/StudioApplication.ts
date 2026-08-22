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
  ToolbarButton,
  WorkspaceDefinition,
} from '@cyre/engine';

type PlayModeState = ReturnType<PlayModeController['getState']>;

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

    try {
      this.workspaceManager.activateWorkspace(workspaceId, this.dockManager);
      this.activeWorkspaceId = workspaceId;
      this.editorShell.setStatusMessage(`Workspace: ${workspaceId}`);
    } catch (error) {
      this.editorShell.addNotification(
        'error',
        `Workspace activation failed: ${this.errorMessage(error)}`,
      );
    }

    this.emit();
  }

  togglePanel(panelId: string): void {
    try {
      const panel = this.editorShell.getPanel(panelId);
      this.editorShell.setPanelVisible(panelId, !panel.isVisible);
    } catch (error) {
      this.editorShell.addNotification(
        'error',
        `Panel toggle failed: ${this.errorMessage(error)}`,
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
    }

    this.registerMenuGroups();
    this.registerToolbarButtons();
    this.registerCommands();

    const firstWorkspace = this.workspaceManager.listWorkspaces()[0];
    if (firstWorkspace) {
      this.activeWorkspaceId = firstWorkspace.id;
      this.workspaceManager.activateWorkspace(
        firstWorkspace.id,
        this.dockManager,
      );
    }
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
    ];

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

  private computeSnapshot(): StudioSnapshot {
    const playState = this.playModeController.getState();

    return {
      projectTitle: this.editorShell.getProjectTitle(),
      statusMessage: this.editorShell.getStatusMessage(),
      panels: this.editorShell.listPanels(),
      menuGroups: this.editorShell.listMenuGroups(),
      toolbarButtons: this.editorShell.listToolbarButtons(),
      notifications: this.editorShell.listNotifications(),
      workspaces: this.workspaceManager.listWorkspaces(),
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
