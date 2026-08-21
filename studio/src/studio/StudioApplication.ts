export type StudioPanelId =
  | 'project'
  | 'inspector'
  | 'console'
  | 'workspace';

export type StudioWorkspace =
  | 'default'
  | 'network'
  | 'mission'
  | 'investigation';

export interface StudioApplicationState {
  projectName: string;
  projectPath: string | null;
  workspace: StudioWorkspace;
  activePanel: StudioPanelId;
  visiblePanels: Record<StudioPanelId, boolean>;
  isPlaying: boolean;
  isPaused: boolean;
  simulationSpeed: number;
  notifications: number;
}

export interface StudioCommand {
  id: string;
  label: string;
  shortcut?: string;
  action: () => void;
}

const DEFAULT_STATE: StudioApplicationState = {
  projectName: 'Untitled CYRE Project',
  projectPath: null,
  workspace: 'default',
  activePanel: 'workspace',
  visiblePanels: {
    project: true,
    inspector: true,
    console: true,
    workspace: true,
  },
  isPlaying: false,
  isPaused: false,
  simulationSpeed: 1,
  notifications: 0,
};

export class StudioApplication {
  private state: StudioApplicationState = structuredClone(DEFAULT_STATE);
  private readonly listeners = new Set<(state: StudioApplicationState) => void>();

  getState(): StudioApplicationState {
    return structuredClone(this.state);
  }

  subscribe(listener: (state: StudioApplicationState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());

    return () => {
      this.listeners.delete(listener);
    };
  }

  createProject(name = 'Untitled CYRE Project'): void {
    this.state = {
      ...this.state,
      projectName: name,
      projectPath: null,
      workspace: 'default',
      isPlaying: false,
      isPaused: false,
    };

    this.emit();
  }

  openProject(name: string, path: string): void {
    this.state = {
      ...this.state,
      projectName: name,
      projectPath: path,
      isPlaying: false,
      isPaused: false,
    };

    this.emit();
  }

  saveProject(): void {
    this.emit();
  }

  setWorkspace(workspace: StudioWorkspace): void {
    this.state = {
      ...this.state,
      workspace,
    };

    this.emit();
  }

  setActivePanel(panel: StudioPanelId): void {
    this.state = {
      ...this.state,
      activePanel: panel,
    };

    this.emit();
  }

  togglePanel(panel: StudioPanelId): void {
    this.state = {
      ...this.state,
      visiblePanels: {
        ...this.state.visiblePanels,
        [panel]: !this.state.visiblePanels[panel],
      },
    };

    this.emit();
  }

  play(): void {
    this.state = {
      ...this.state,
      isPlaying: true,
      isPaused: false,
    };

    this.emit();
  }

  pause(): void {
    if (!this.state.isPlaying) {
      return;
    }

    this.state = {
      ...this.state,
      isPaused: true,
    };

    this.emit();
  }

  resume(): void {
    if (!this.state.isPlaying) {
      return;
    }

    this.state = {
      ...this.state,
      isPaused: false,
    };

    this.emit();
  }

  stop(): void {
    this.state = {
      ...this.state,
      isPlaying: false,
      isPaused: false,
    };

    this.emit();
  }

  restart(): void {
    this.state = {
      ...this.state,
      isPlaying: true,
      isPaused: false,
    };

    this.emit();
  }

  setSimulationSpeed(speed: number): void {
    if (!Number.isFinite(speed) || speed <= 0) {
      throw new Error('Simulation speed must be a positive finite number.');
    }

    this.state = {
      ...this.state,
      simulationSpeed: speed,
    };

    this.emit();
  }

  incrementNotifications(): void {
    this.state = {
      ...this.state,
      notifications: this.state.notifications + 1,
    };

    this.emit();
  }

  clearNotifications(): void {
    this.state = {
      ...this.state,
      notifications: 0,
    };

    this.emit();
  }

  private emit(): void {
    const snapshot = this.getState();

    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }
}
