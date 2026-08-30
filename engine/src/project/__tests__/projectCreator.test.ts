import { describe, it, expect } from 'vitest';
import { ProjectCreator } from '../ProjectCreator.js';
import { ProjectModel } from '../ProjectModel.js';
import { PROJECT_TEMPLATES } from '../ProjectTemplates.js';
import type { ProjectData } from '../ProjectTypes.js';

describe('ProjectCreator', () => {
  it('lists available project templates', () => {
    const templates = ProjectCreator.getTemplates();
    expect(templates.length).toBeGreaterThanOrEqual(5);
    expect(templates.some((template) => template.id === 'soc-game')).toBe(true);
  });

  it('creates a project from the SOC game template', () => {
    const data = ProjectCreator.createProject(
      'project-soc',
      'SOC Training Game',
      'soc-game',
    );

    expect(data.id).toBe('project-soc');
    expect(data.name).toBe('SOC Training Game');
    expect(data.scenarioIds).toContain('mission-001');
    expect(data.missionIds).toContain('mission-001');
    expect(data.settings.genre).toBe('soc');
  });

  it('creates a valid ProjectModel from generated data', () => {
    const data = ProjectCreator.createProject(
      'project-validated',
      'Validated Project',
      'investigation-game',
    );
    const model = new ProjectModel(data);
    expect(model.getId()).toBe('project-validated');
    expect(model.getData().scenarioIds).toContain('mission-002');
  });

  it('throws for an unknown template', () => {
    expect(() =>
      ProjectCreator.createProject('project-x', 'Bad Project', 'unknown-template'),
    ).toThrow(/Unknown project template/);
  });

  it('throws when project id is missing', () => {
    expect(() =>
      ProjectCreator.createProject('', 'Missing ID', 'soc-game'),
    ).toThrow(/Project id is required/);
  });

  it('throws when project name is missing', () => {
    expect(() =>
      ProjectCreator.createProject('project-x', '   ', 'soc-game'),
    ).toThrow(/Project name is required/);
  });

  it('merges custom settings with template defaults', () => {
    const data = ProjectCreator.createProject(
      'project-custom',
      'Custom Project',
      'research-experiment',
      {
        settings: {
          renderScale: 1.5,
          research: { enabled: false },
        },
      },
    );

    expect(data.settings.genre).toBe('research');
    expect(data.settings.renderScale).toBe(1.5);
    expect((data.settings.research as { enabled: boolean }).enabled).toBe(false);
  });

  it('uses custom scenario and mission ids when provided', () => {
    const data = ProjectCreator.createProject(
      'project-custom-lists',
      'Custom Lists',
      'red-team-game',
      {
        scenarioIds: ['custom-scenario-1'],
        missionIds: ['custom-mission-1'],
      },
    );

    expect(data.scenarioIds).toEqual(['custom-scenario-1']);
    expect(data.missionIds).toEqual(['custom-mission-1']);
  });

  it('copies template defaults without mutating the original template', () => {
    const originalTemplate = PROJECT_TEMPLATES.find((template) => template.id === 'training-simulation')!;
    const originalScenarioCount = originalTemplate.defaultScenarioIds.length;

    const data = ProjectCreator.createProject('project-mutate', 'Mutation Test', 'training-simulation');
    data.scenarioIds.push('mutated-scenario');

    expect(originalTemplate.defaultScenarioIds).toHaveLength(originalScenarioCount);
  });
});
