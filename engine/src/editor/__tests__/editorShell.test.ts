import { describe, it, expect } from 'vitest';
import { EditorShell } from '../EditorShell.js';

function createShell(): EditorShell {
  const shell = new EditorShell('SOC Investigation Game');
  shell.addMenuGroup({ id: 'file', label: 'File', items: [] });
  shell.addMenuGroup({ id: 'edit', label: 'Edit', items: [] });
  shell.addMenuItem('file', { id: 'new-project', label: 'New Project', enabled: true });
  shell.addMenuItem('file', { id: 'open-project', label: 'Open Project', enabled: true });
  shell.addToolbarButton({ id: 'play', label: 'Play', action: 'play' });
  shell.addPanel({ id: 'project', title: 'Project', dockPosition: 'left', isVisible: true, order: 1 });
  shell.addPanel({ id: 'inspector', title: 'Inspector', dockPosition: 'right', isVisible: true, order: 2 });
  return shell;
}

describe('EditorShell', () => {
  it('creates an editor shell with project title and default status', () => {
    const shell = new EditorShell('Test Project');
    expect(shell.getProjectTitle()).toBe('Test Project');
    expect(shell.getStatusMessage()).toBe('Ready');
  });

  it('updates project title and status message', () => {
    const shell = new EditorShell();
    shell.setProjectTitle('Cyber Game');
    shell.setStatusMessage('Loaded scenario');
    expect(shell.getProjectTitle()).toBe('Cyber Game');
    expect(shell.getStatusMessage()).toBe('Loaded scenario');
  });

  it('throws on invalid project title and status message', () => {
    const shell = new EditorShell();
    expect(() => shell.setProjectTitle('   ')).toThrow(/Project title is required/);
    expect(() => shell.setStatusMessage('')).toThrow(/Status message is required/);
  });

  it('adds and lists menus and menu items', () => {
    const shell = createShell();
    const groups = shell.listMenuGroups();
    expect(groups).toHaveLength(2);
    const fileGroup = groups.find((group) => group.id === 'file');
    expect(fileGroup).toBeDefined();
    expect(fileGroup!.items).toHaveLength(2);
    expect(fileGroup!.items[0].id).toBe('new-project');
  });

  it('adds toolbar buttons', () => {
    const shell = createShell();
    expect(shell.listToolbarButtons()).toHaveLength(1);
    expect(shell.listToolbarButtons()[0].id).toBe('play');
  });

  it('adds panels and sorts them by order', () => {
    const shell = createShell();
    const panels = shell.listPanels();
    expect(panels.map((panel) => panel.id)).toEqual(['project', 'inspector']);
  });

  it('updates panel visibility and dock position', () => {
    const shell = createShell();
    shell.setPanelVisible('project', false);
    expect(shell.getPanel('project').isVisible).toBe(false);

    shell.setPanelDockPosition('project', 'floating');
    expect(shell.getPanel('project').dockPosition).toBe('floating');
  });

  it('adds notifications and clears them', () => {
    const shell = createShell();
    shell.addNotification('info', 'Project loaded');
    shell.addNotification('error', 'Missing scenario');
    expect(shell.listNotifications()).toHaveLength(2);
    expect(shell.listNotifications()[0].type).toBe('info');

    shell.clearNotifications();
    expect(shell.listNotifications()).toHaveLength(0);
  });

  it('removes a panel', () => {
    const shell = createShell();
    shell.removePanel('project');
    expect(shell.listPanels().map((panel) => panel.id)).toEqual(['inspector']);
    expect(() => shell.getPanel('project')).toThrow(/does not exist/);
  });

  it('returns complete editor shell state', () => {
    const shell = createShell();
    const state = shell.getState();
    expect(state.projectTitle).toBe('SOC Investigation Game');
    expect(state.panels).toHaveLength(2);
    expect(state.menuGroups).toHaveLength(2);
    expect(state.toolbarButtons).toHaveLength(1);
    expect(state.notifications).toHaveLength(0);
  });

  it('rejects duplicate panels and duplicate menu groups', () => {
    const shell = createShell();
    expect(() =>
      shell.addPanel({ id: 'project', title: 'Duplicate', dockPosition: 'left', isVisible: true, order: 3 }),
    ).toThrow(/already exists/);
    expect(() => shell.addMenuGroup({ id: 'file', label: 'Duplicate', items: [] })).toThrow(/already exists/);
  });
});
