export type DockArea = 'left' | 'right' | 'top' | 'bottom' | 'center';

export interface DockPanel {
  id: string;
  title: string;
  area: DockArea;
  order: number;
  size?: number;
  visible: boolean;
  floating?: boolean;
  tabGroupId?: string;
}

export interface DockLayout {
  panels: DockPanel[];
  maximizedPanelId?: string;
  activePanelId?: string;
}

interface StoredPanel {
  panel: DockPanel;
}

export class DockManager {
  private readonly panels = new Map<string, StoredPanel>();
  private maximizedPanelId?: string;
  private activePanelId?: string;

  addPanel(panel: DockPanel): void {
    this.validatePanel(panel);
    if (this.panels.has(panel.id)) {
      throw new Error(`Panel "${panel.id}" already exists.`);
    }
    this.panels.set(panel.id, {
      panel: {
        ...panel,
        floating: panel.floating ?? false,
        size: panel.size,
      },
    });
    if (!this.activePanelId) {
      this.activePanelId = panel.id;
    }
  }

  getPanel(panelId: string): DockPanel {
    const stored = this.panels.get(panelId);
    if (!stored) {
      throw new Error(`Panel "${panelId}" does not exist.`);
    }
    return { ...stored.panel };
  }

  listPanels(): DockPanel[] {
    return [...this.panels.values()]
      .map((entry) => ({ ...entry.panel }))
      .sort((a, b) => a.order - b.order);
  }

  removePanel(panelId: string): void {
    if (!this.panels.has(panelId)) {
      throw new Error(`Panel "${panelId}" does not exist.`);
    }
    this.panels.delete(panelId);
    if (this.maximizedPanelId === panelId) {
      this.maximizedPanelId = undefined;
    }
    if (this.activePanelId === panelId) {
      this.activePanelId = undefined;
    }
  }

  dockPanel(panelId: string, area: DockArea): void {
    const stored = this.getStored(panelId);
    stored.panel.area = area;
    stored.panel.floating = false;
  }

  undockPanel(panelId: string): void {
    const stored = this.getStored(panelId);
    stored.panel.floating = true;
    if (this.maximizedPanelId === panelId) {
      this.maximizedPanelId = undefined;
    }
  }

  movePanel(panelId: string, area: DockArea): void {
    const stored = this.getStored(panelId);
    stored.panel.area = area;
  }

  resizePanel(panelId: string, size: number): void {
    if (!Number.isFinite(size) || size < 0) {
      throw new Error('Panel size must be a non-negative finite number.');
    }
    const stored = this.getStored(panelId);
    stored.panel.size = size;
  }

  setPanelVisible(panelId: string, visible: boolean): void {
    const stored = this.getStored(panelId);
    stored.panel.visible = visible;
  }

  setActivePanel(panelId: string): void {
    if (!this.panels.has(panelId)) {
      throw new Error(`Panel "${panelId}" does not exist.`);
    }
    this.activePanelId = panelId;
  }

  getActivePanelId(): string | undefined {
    return this.activePanelId;
  }

  tabPanels(panelIds: string[]): void {
    const normalizedIds = [...new Set(panelIds)];
    if (normalizedIds.length === 0) {
      throw new Error('At least one panel id is required for tab grouping.');
    }
    const groupId = `tab-group-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    for (const panelId of normalizedIds) {
      const stored = this.getStored(panelId);
      stored.panel.tabGroupId = groupId;
    }
  }

  untabPanels(panelIds: string[]): void {
    for (const panelId of panelIds) {
      const stored = this.getStored(panelId);
      stored.panel.tabGroupId = undefined;
    }
  }

  maximizePanel(panelId: string): void {
    if (!this.panels.has(panelId)) {
      throw new Error(`Panel "${panelId}" does not exist.`);
    }
    this.maximizedPanelId = panelId;
  }

  restorePanel(): void {
    this.maximizedPanelId = undefined;
  }

  getMaximizedPanelId(): string | undefined {
    return this.maximizedPanelId;
  }

  getLayout(): DockLayout {
    return {
      panels: this.listPanels(),
      maximizedPanelId: this.maximizedPanelId,
      activePanelId: this.activePanelId,
    };
  }

  restoreLayout(layout: DockLayout): void {
    if (!layout || !Array.isArray(layout.panels)) {
      throw new Error('Dock layout panels must be an array.');
    }

    this.panels.clear();
    this.maximizedPanelId = undefined;
    this.activePanelId = undefined;

    for (const panel of layout.panels) {
      this.addPanel(panel);
    }

    if (layout.maximizedPanelId && this.panels.has(layout.maximizedPanelId)) {
      this.maximizedPanelId = layout.maximizedPanelId;
    }

    if (layout.activePanelId && this.panels.has(layout.activePanelId)) {
      this.activePanelId = layout.activePanelId;
    }
  }

  getPanelsInArea(area: DockArea): DockPanel[] {
    return this.listPanels().filter((panel) => panel.area === area && !panel.floating);
  }

  getFloatingPanels(): DockPanel[] {
    return this.listPanels().filter((panel) => panel.floating === true);
  }

  private getStored(panelId: string): StoredPanel {
    const stored = this.panels.get(panelId);
    if (!stored) {
      throw new Error(`Panel "${panelId}" does not exist.`);
    }
    return stored;
  }

  private validatePanel(panel: DockPanel): void {
    if (!panel.id || panel.id.trim() === '') {
      throw new Error('Panel id is required.');
    }
    if (!panel.title || panel.title.trim() === '') {
      throw new Error('Panel title is required.');
    }
    if (!['left', 'right', 'top', 'bottom', 'center'].includes(panel.area)) {
      throw new Error(`Invalid dock area "${panel.area}".`);
    }
  }
}
