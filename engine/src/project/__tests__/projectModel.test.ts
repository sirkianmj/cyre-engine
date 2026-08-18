import { describe, it, expect } from 'vitest';
import { ProjectModel } from '../ProjectModel.js';
import type { ProjectData } from '../ProjectTypes.js';

function createProjectData(): ProjectData {
  return {
    id: 'cyre-project-001',
    name: 'SOC Investigation Game',
    description: 'A flagship CYRE investigation game project.',
    scenarioIds: ['mission-001'],
    missionIds: ['mission-001'],
    settings: {
      theme: 'dark',
      defaultDifficulty: 'medium',
    },
  };
}

describe('ProjectModel', () => {
  it('creates a valid project model', () => {
    const project = new ProjectModel(createProjectData());
    expect(project.getId()).toBe('cyre-project-001');
    expect(project.getName()).toBe('SOC Investigation Game');
    expect(project.getData().scenarioIds).toEqual(['mission-001']);
  });

  it('throws if project id is missing', () => {
    const data = createProjectData();
    data.id = '';
    expect(() => new ProjectModel(data)).toThrow(/Project id is required/);
  });

  it('throws if project name is missing', () => {
    const data = createProjectData();
    data.name = '   ';
    expect(() => new ProjectModel(data)).toThrow(/Project name is required/);
  });

  it('adds a new scenario with duplicate detection', () => {
    const project = new ProjectModel(createProjectData());
    project.addScenario('mission-002');
    expect(project.getData().scenarioIds).toContain('mission-002');
    expect(() => project.addScenario('mission-002')).toThrow(/already exists/);
  });

  it('removes a scenario', () => {
    const project = new ProjectModel(createProjectData());
    project.removeScenario('mission-001');
    expect(project.getData().scenarioIds).not.toContain('mission-001');
  });

  it('adds a scene and updates scene ids', () => {
    const project = new ProjectModel(createProjectData());
    project.addScene({
      id: 'scene-soc',
      name: 'SOC Room',
      scenarioIds: ['mission-001'],
    });
    expect(project.getData().sceneIds).toContain('scene-soc');
    expect(project.getData().scenes?.length).toBe(1);
  });

  it('stores and reads project settings', () => {
    const project = new ProjectModel(createProjectData());
    project.setSetting('renderScale', 1.25);
    expect(project.getSetting('renderScale')).toBe(1.25);
  });

  it('adds a build profile with copied settings', () => {
    const project = new ProjectModel(createProjectData());
    project.addBuildProfile({
      id: 'build-web',
      name: 'Web Production',
      target: 'web',
      settings: { minify: true },
    });
    expect(project.getData().buildProfiles).toHaveLength(1);
    expect(project.getData().buildProfiles?.[0].settings).toEqual({ minify: true });
  });

  it('exports independent JSON data', () => {
    const project = new ProjectModel(createProjectData());
    const json = project.toJSON();
    json.scenarioIds.push('external-mutation');
    expect(project.getData().scenarioIds).not.toContain('external-mutation');
  });
});
