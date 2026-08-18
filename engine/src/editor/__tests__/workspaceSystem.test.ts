import { describe, it, expect } from 'vitest';
import { WorkspaceManager, PREDEFINED_WORKSPACES } from '../WorkspaceSystem.js';
import { DockManager } from '../DockingSystem.js';

describe('WorkspaceManager', () => {
  it('lists predefined workspaces', () => {
    const manager = new WorkspaceManager();
    expect(manager.listWorkspaces().length).toBeGreaterThanOrEqual(7);
  });

  it('retrieves a predefined workspace', () => {
    const manager = new WorkspaceManager();
    const workspace = manager.getWorkspace('investigation');
    expect(workspace.name).toBe('Investigation');
    expect(workspace.panelLayouts.length).toBeGreaterThanOrEqual(4);
  });

  it('rejects unknown workspace ids', () => {
    const manager = new WorkspaceManager();
    expect(() => manager.getWorkspace('missing')).toThrow(/does not exist/);
  });

  it('adds a custom workspace', () => {
    const manager = new WorkspaceManager();
    manager.addCustomWorkspace({
      id: 'custom-soc',
      name: 'Custom SOC',
      panelLayouts: [
        { id: 'soc-map', title: 'SOC Map', area: 'center', order: 1, visible: true },
      ],
    });
    expect(manager.hasWorkspace('custom-soc')).toBe(true);
  });

  it('rejects duplicate custom workspace ids', () => {
    const manager = new WorkspaceManager();
    expect(() =>
      manager.addCustomWorkspace({
        id: 'investigation',
        name: 'Duplicate',
        panelLayouts: [],
      }),
    ).toThrow(/already exists/);
  });

  it('activates a workspace by applying layouts to a dock manager', () => {
    const dockManager = new DockManager();
    dockManager.addPanel({ id: 'evidence', title: 'Evidence', area: 'left', order: 1, visible: true });
    dockManager.addPanel({ id: 'timeline', title: 'Timeline', area: 'bottom', order: 2, visible: false });
    dockManager.addPanel({ id: 'unrelated', title: 'Unrelated', area: 'right', order: 3, visible: true });

    const workspaceManager = new WorkspaceManager();
    workspaceManager.activateWorkspace('investigation', dockManager);

    expect(dockManager.getPanel('evidence').visible).toBe(true);
    expect(dockManager.getPanel('timeline').visible).toBe(true);
    expect(dockManager.getPanel('unrelated').visible).toBe(false);
    expect(workspaceManager.getActiveWorkspaceId()).toBe('investigation');
  });
});
