import { describe, it, expect } from 'vitest';
import { ProjectManager } from '../ProjectManager.js';
import type { ProjectData } from '../ProjectTypes.js';

describe('ProjectManager', () => {
  it('creates a project from a template', () => {
    const manager = new ProjectManager();
    const project = manager.createProjectFromTemplate('proj-soc', 'SOC Game', 'soc-game');
    expect(project.getId()).toBe('proj-soc');
    expect(manager.has('proj-soc')).toBe(true);
  });

  it('imports a project data object', () => {
    const manager = new ProjectManager();
    const data: ProjectData = {
      id: 'proj-import',
      name: 'Imported Project',
      scenarioIds: ['mission-001'],
      missionIds: ['mission-001'],
      settings: {},
    };
    manager.importProject(data);
    expect(manager.listProjects()).toHaveLength(1);
    expect(manager.get('proj-import').getName()).toBe('Imported Project');
  });

  it('throws when opening an unknown project', () => {
    const manager = new ProjectManager();
    expect(() => manager.get('missing')).toThrow(/is not open/);
  });

  it('tracks recent projects in most-recent-first order', () => {
    const manager = new ProjectManager({ maxRecent: 3 });
    manager.createProjectFromTemplate('p1', 'Project One', 'soc-game');
    manager.createProjectFromTemplate('p2', 'Project Two', 'investigation-game');
    manager.openProject('p1');
    manager.createProjectFromTemplate('p3', 'Project Three', 'red-team-game');

    const recent = manager.listRecentProjects();
    expect(recent.map((project) => project.id)).toEqual(['p3', 'p1', 'p2']);
    expect(recent).toHaveLength(3);
  });

  it('duplicates a project with independent scenario and mission lists', () => {
    const manager = new ProjectManager();
    const original = manager.createProjectFromTemplate('original', 'Original', 'soc-game');
    original.addScenario('mission-002');

    const duplicate = manager.duplicateProject('original', 'copy', 'Original Copy');
    expect(duplicate.getId()).toBe('copy');
    expect(duplicate.getName()).toBe('Original Copy');
    expect(duplicate.getData().scenarioIds).toEqual(['mission-001', 'mission-002']);

    duplicate.addScenario('mission-003');
    expect(original.getData().scenarioIds).not.toContain('mission-003');
  });

  it('removes a project and clears it from recent projects', () => {
    const manager = new ProjectManager();
    manager.createProjectFromTemplate('remove-me', 'Remove Me', 'soc-game');
    expect(manager.removeProject('remove-me')).toBe(true);
    expect(manager.has('remove-me')).toBe(false);
    expect(manager.listRecentProjects().some((project) => project.id === 'remove-me')).toBe(false);
  });

  it('serializes and restores a project', () => {
    const manager = new ProjectManager();
    manager.createProjectFromTemplate('serialize-me', 'Serialize Me', 'training-simulation');
    const json = manager.serializeProject('serialize-me');

    const restoredManager = new ProjectManager();
    const restored = restoredManager.deserializeProject(json);

    expect(restored.getId()).toBe('serialize-me');
    expect(restored.getName()).toBe('Serialize Me');
    expect(restored.getData().scenarioIds).toEqual([]);
  });

  it('limits recent projects to the configured maximum', () => {
    const manager = new ProjectManager({ maxRecent: 2 });
    manager.createProjectFromTemplate('a', 'Project A', 'soc-game');
    manager.createProjectFromTemplate('b', 'Project B', 'soc-game');
    manager.createProjectFromTemplate('c', 'Project C', 'soc-game');

    expect(manager.listRecentProjects()).toHaveLength(2);
    expect(manager.listRecentProjects()[0].id).toBe('c');
    expect(manager.listRecentProjects()[1].id).toBe('b');
  });
});
