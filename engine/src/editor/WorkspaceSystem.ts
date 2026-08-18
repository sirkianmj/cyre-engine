import type { DockArea, DockPanel } from './DockingSystem.js';
import { DockManager } from './DockingSystem.js';

export interface WorkspaceDefinition {
  id: string;
  name: string;
  panelLayouts: Array<{
    id: string;
    title: string;
    area: DockArea;
    order: number;
    visible: boolean;
  }>;
}

export const PREDEFINED_WORKSPACES: WorkspaceDefinition[] = [
  {
    id: 'investigation',
    name: 'Investigation',
    panelLayouts: [
      { id: 'evidence', title: 'Evidence', area: 'left', order: 1, visible: true },
      { id: 'timeline', title: 'Timeline', area: 'bottom', order: 2, visible: true },
      { id: 'inspector', title: 'Inspector', area: 'right', order: 3, visible: true },
      { id: 'workspace', title: 'Workspace', area: 'center', order: 4, visible: true },
    ],
  },
  {
    id: 'scenario',
    name: 'Scenario',
    panelLayouts: [
      { id: 'scenario-graph', title: 'Scenario Graph', area: 'center', order: 1, visible: true },
      { id: 'scenario-inspector', title: 'Scenario Inspector', area: 'right', order: 2, visible: true },
      { id: 'validation', title: 'Validation', area: 'bottom', order: 3, visible: true },
    ],
  },
  {
    id: 'network',
    name: 'Network',
    panelLayouts: [
      { id: 'network-editor', title: 'Network Editor', area: 'center', order: 1, visible: true },
      { id: 'entity-palette', title: 'Entity Palette', area: 'left', order: 2, visible: true },
      { id: 'network-inspector', title: 'Network Inspector', area: 'right', order: 3, visible: true },
    ],
  },
  {
    id: 'gameplay',
    name: 'Gameplay',
    panelLayouts: [
      { id: 'mission-graph', title: 'Mission Graph', area: 'center', order: 1, visible: true },
      { id: 'objective-editor', title: 'Objectives', area: 'left', order: 2, visible: true },
      { id: 'trigger-editor', title: 'Triggers', area: 'bottom', order: 3, visible: true },
    ],
  },
  {
    id: 'research',
    name: 'Research',
    panelLayouts: [
      { id: 'experiment-panel', title: 'Experiments', area: 'left', order: 1, visible: true },
      { id: 'telemetry-panel', title: 'Telemetry', area: 'center', order: 2, visible: true },
      { id: 'dataset-panel', title: 'Dataset Export', area: 'right', order: 3, visible: true },
    ],
  },
  {
    id: 'debug',
    name: 'Debug',
    panelLayouts: [
      { id: 'cyber-inspector', title: 'Cyber State Inspector', area: 'left', order: 1, visible: true },
      { id: 'event-timeline', title: 'Event Timeline', area: 'center', order: 2, visible: true },
      { id: 'attack-timeline', title: 'Attack Timeline', area: 'right', order: 3, visible: true },
    ],
  },
  {
    id: 'rendering',
    name: 'Rendering',
    panelLayouts: [
      { id: 'viewport', title: 'Viewport', area: 'center', order: 1, visible: true },
      { id: 'scene-hierarchy', title: 'Scene Hierarchy', area: 'left', order: 2, visible: true },
      { id: 'material-editor', title: 'Material Editor', area: 'right', order: 3, visible: true },
    ],
  },
];

export class WorkspaceManager {
  private readonly workspaceDefinitions = new Map<string, WorkspaceDefinition>();
  private activeWorkspaceId?: string;

  constructor() {
    for (const workspace of PREDEFINED_WORKSPACES) {
      this.workspaceDefinitions.set(workspace.id, { ...workspace });
    }
  }

  listWorkspaces(): WorkspaceDefinition[] {
    return [...this.workspaceDefinitions.values()];
  }

  getWorkspace(workspaceId: string): WorkspaceDefinition {
    const workspace = this.workspaceDefinitions.get(workspaceId);
    if (!workspace) {
      throw new Error(`Workspace "${workspaceId}" does not exist.`);
    }
    return workspace;
  }

  hasWorkspace(workspaceId: string): boolean {
    return this.workspaceDefinitions.has(workspaceId);
  }

  addCustomWorkspace(definition: WorkspaceDefinition): void {
    if (!definition.id || definition.id.trim() === '') {
      throw new Error('Workspace id is required.');
    }
    if (!definition.name || definition.name.trim() === '') {
      throw new Error('Workspace name is required.');
    }
    if (this.workspaceDefinitions.has(definition.id)) {
      throw new Error(`Workspace "${definition.id}" already exists.`);
    }
    if (!Array.isArray(definition.panelLayouts) || definition.panelLayouts.length === 0) {
      throw new Error('Workspace panelLayouts must be a non-empty array.');
    }
    this.workspaceDefinitions.set(definition.id, { ...definition });
  }

  activateWorkspace(workspaceId: string, dockManager: DockManager): void {
    const workspace = this.getWorkspace(workspaceId);
    const existingIds = new Set(dockManager.listPanels().map((panel) => panel.id));

    for (const panel of workspace.panelLayouts) {
      if (!existingIds.has(panel.id)) {
        dockManager.addPanel({
          id: panel.id,
          title: panel.title,
          area: panel.area,
          order: panel.order,
          visible: panel.visible,
        });
      }
    }

    for (const panel of dockManager.listPanels()) {
      const layout = workspace.panelLayouts.find((entry) => entry.id === panel.id);
      if (layout) {
        dockManager.setPanelVisible(panel.id, layout.visible);
        dockManager.dockPanel(panel.id, layout.area);
      } else {
        dockManager.setPanelVisible(panel.id, false);
      }
    }

    this.activeWorkspaceId = workspaceId;
  }

  getActiveWorkspaceId(): string | undefined {
    return this.activeWorkspaceId;
  }
}
