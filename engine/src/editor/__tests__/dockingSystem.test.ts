import { describe, it, expect } from 'vitest';
import { DockManager, type DockPanel } from '../DockingSystem.js';

function createDockManager(): DockManager {
  const manager = new DockManager();
  manager.addPanel({ id: 'project', title: 'Project', area: 'left', order: 1 });
  manager.addPanel({ id: 'inspector', title: 'Inspector', area: 'right', order: 2 });
  manager.addPanel({ id: 'workspace', title: 'Workspace', area: 'center', order: 3 });
  return manager;
}

describe('DockManager', () => {
  it('adds panels and lists them in order', () => {
    const manager = createDockManager();
    expect(manager.listPanels().map((panel) => panel.id)).toEqual([
      'project',
      'inspector',
      'workspace',
    ]);
  });

  it('rejects duplicate panels', () => {
    const manager = createDockManager();
    expect(() =>
      manager.addPanel({ id: 'project', title: 'Duplicate', area: 'center', order: 9 }),
    ).toThrow(/already exists/);
  });

  it('rejects invalid dock areas', () => {
    const manager = new DockManager();
    expect(() =>
      manager.addPanel({ id: 'bad', title: 'Bad Panel', area: 'invalid' as DockPanel['area'], order: 1 }),
    ).toThrow(/Invalid dock area/);
  });

  it('docks and undocks panels', () => {
    const manager = createDockManager();
    manager.dockPanel('workspace', 'left');
    expect(manager.getPanel('workspace').area).toBe('left');

    manager.undockPanel('workspace');
    expect(manager.getPanel('workspace').floating).toBe(true);
    expect(manager.getFloatingPanels().map((panel) => panel.id)).toEqual(['workspace']);
  });

  it('moves a panel between areas', () => {
    const manager = createDockManager();
    manager.movePanel('inspector', 'bottom');
    expect(manager.getPanel('inspector').area).toBe('bottom');
  });

  it('resizes panels and rejects invalid sizes', () => {
    const manager = createDockManager();
    manager.resizePanel('project', 320);
    expect(manager.getPanel('project').size).toBe(320);
    expect(() => manager.resizePanel('project', -1)).toThrow(/non-negative finite number/);
  });

  it('tracks active panel', () => {
    const manager = createDockManager();
    expect(manager.getActivePanelId()).toBe('project');
    manager.setActivePanel('inspector');
    expect(manager.getActivePanelId()).toBe('inspector');
  });

  it('groups panels into tabs', () => {
    const manager = createDockManager();
    manager.tabPanels(['project', 'inspector']);
    expect(manager.getPanel('project').tabGroupId).toBeDefined();
    expect(manager.getPanel('project').tabGroupId).toBe(manager.getPanel('inspector').tabGroupId);
  });

  it('maximizes and restores a panel', () => {
    const manager = createDockManager();
    manager.maximizePanel('workspace');
    expect(manager.getMaximizedPanelId()).toBe('workspace');
    manager.restorePanel();
    expect(manager.getMaximizedPanelId()).toBeUndefined();
  });

  it('exports and restores a layout', () => {
    const manager = createDockManager();
    manager.resizePanel('project', 290);
    manager.maximizePanel('inspector');
    const layout = manager.getLayout();

    const restoredManager = new DockManager();
    restoredManager.restoreLayout(layout);

    expect(restoredManager.getPanel('project').size).toBe(290);
    expect(restoredManager.getMaximizedPanelId()).toBe('inspector');
    expect(restoredManager.getActivePanelId()).toBe('project');
  });

  it('removes a panel and clears its maximized state if needed', () => {
    const manager = createDockManager();
    manager.maximizePanel('workspace');
    manager.removePanel('workspace');
    expect(manager.listPanels().some((panel) => panel.id === 'workspace')).toBe(false);
    expect(manager.getMaximizedPanelId()).toBeUndefined();
  });
});
