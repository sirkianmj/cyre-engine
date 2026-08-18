export type PanelDockPosition = 'left' | 'right' | 'top' | 'bottom' | 'center' | 'floating';

export interface EditorPanel {
  id: string;
  title: string;
  dockPosition: PanelDockPosition;
  isVisible: boolean;
  order: number;
  content?: unknown;
}

export interface EditorNotification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  timestamp: string;
}

export interface MenuItem {
  id: string;
  label: string;
  action?: string;
  shortcut?: string;
  enabled: boolean;
}

export interface MenuGroup {
  id: string;
  label: string;
  items: MenuItem[];
}

export interface ToolbarButton {
  id: string;
  label: string;
  icon?: string;
  action?: string;
  tooltip?: string;
}

export interface EditorShellState {
  projectTitle: string;
  statusMessage: string;
  panels: EditorPanel[];
  menuGroups: MenuGroup[];
  toolbarButtons: ToolbarButton[];
  notifications: EditorNotification[];
}

export class EditorShell {
  private projectTitle: string;
  private statusMessage: string;
  private readonly panels = new Map<string, EditorPanel>();
  private readonly menuGroups = new Map<string, MenuGroup>();
  private readonly toolbarButtons = new Map<string, ToolbarButton>();
  private readonly notifications: EditorNotification[] = [];
  private notificationSequence = 0;

  constructor(projectTitle = 'Untitled CYRE Project') {
    this.projectTitle = projectTitle;
    this.statusMessage = 'Ready';
  }

  getProjectTitle(): string {
    return this.projectTitle;
  }

  setProjectTitle(title: string): void {
    if (!title || title.trim() === '') {
      throw new Error('Project title is required.');
    }
    this.projectTitle = title;
  }

  getStatusMessage(): string {
    return this.statusMessage;
  }

  setStatusMessage(message: string): void {
    if (!message || message.trim() === '') {
      throw new Error('Status message is required.');
    }
    this.statusMessage = message;
  }

  addPanel(panel: EditorPanel): void {
    this.validatePanel(panel);
    if (this.panels.has(panel.id)) {
      throw new Error(`Panel "${panel.id}" already exists.`);
    }
    this.panels.set(panel.id, { ...panel });
  }

  removePanel(panelId: string): void {
    if (!this.panels.has(panelId)) {
      throw new Error(`Panel "${panelId}" does not exist.`);
    }
    this.panels.delete(panelId);
  }

  getPanel(panelId: string): EditorPanel {
    const panel = this.panels.get(panelId);
    if (!panel) {
      throw new Error(`Panel "${panelId}" does not exist.`);
    }
    return { ...panel };
  }

  listPanels(): EditorPanel[] {
    return [...this.panels.values()].sort((a, b) => a.order - b.order);
  }

  setPanelVisible(panelId: string, visible: boolean): void {
    const panel = this.getPanel(panelId);
    this.panels.set(panelId, { ...panel, isVisible: visible });
  }

  setPanelDockPosition(panelId: string, dockPosition: PanelDockPosition): void {
    const panel = this.getPanel(panelId);
    this.panels.set(panelId, { ...panel, dockPosition });
  }

  addMenuGroup(group: MenuGroup): void {
    if (!group.id || group.id.trim() === '') {
      throw new Error('Menu group id is required.');
    }
    if (!group.label || group.label.trim() === '') {
      throw new Error('Menu group label is required.');
    }
    if (this.menuGroups.has(group.id)) {
      throw new Error(`Menu group "${group.id}" already exists.`);
    }
    this.menuGroups.set(group.id, {
      ...group,
      items: group.items.map((item) => ({ ...item })),
    });
  }

  addMenuItem(groupId: string, item: MenuItem): void {
    const group = this.menuGroups.get(groupId);
    if (!group) {
      throw new Error(`Menu group "${groupId}" does not exist.`);
    }
    if (group.items.some((existing) => existing.id === item.id)) {
      throw new Error(`Menu item "${item.id}" already exists.`);
    }
    group.items.push({ ...item });
  }

  listMenuGroups(): MenuGroup[] {
    return [...this.menuGroups.values()].map((group) => ({
      ...group,
      items: group.items.map((item) => ({ ...item })),
    }));
  }

  addToolbarButton(button: ToolbarButton): void {
    if (!button.id || button.id.trim() === '') {
      throw new Error('Toolbar button id is required.');
    }
    if (!button.label || button.label.trim() === '') {
      throw new Error('Toolbar button label is required.');
    }
    if (this.toolbarButtons.has(button.id)) {
      throw new Error(`Toolbar button "${button.id}" already exists.`);
    }
    this.toolbarButtons.set(button.id, { ...button });
  }

  listToolbarButtons(): ToolbarButton[] {
    return [...this.toolbarButtons.values()];
  }

  addNotification(type: EditorNotification['type'], message: string): EditorNotification {
    if (!message || message.trim() === '') {
      throw new Error('Notification message is required.');
    }
    const notification: EditorNotification = {
      id: `notification-${++this.notificationSequence}`,
      type,
      message,
      timestamp: new Date().toISOString(),
    };
    this.notifications.push(notification);
    return notification;
  }

  listNotifications(): EditorNotification[] {
    return [...this.notifications];
  }

  clearNotifications(): void {
    this.notifications.length = 0;
  }

  getState(): EditorShellState {
    return {
      projectTitle: this.projectTitle,
      statusMessage: this.statusMessage,
      panels: this.listPanels(),
      menuGroups: this.listMenuGroups(),
      toolbarButtons: this.listToolbarButtons(),
      notifications: this.listNotifications(),
    };
  }

  private validatePanel(panel: EditorPanel): void {
    if (!panel.id || panel.id.trim() === '') {
      throw new Error('Panel id is required.');
    }
    if (!panel.title || panel.title.trim() === '') {
      throw new Error('Panel title is required.');
    }
  }
}
