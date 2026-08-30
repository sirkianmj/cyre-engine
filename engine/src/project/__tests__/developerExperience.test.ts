import { describe, expect, it } from 'vitest';
import { DeveloperExperience } from '../DeveloperExperience.js';

describe('DeveloperExperience', () => {
  it('lists project templates', () => {
    const templates = DeveloperExperience.listTemplates();

    expect(templates.length).toBeGreaterThanOrEqual(5);
    expect(templates.map((template) => template.id)).toContain('soc-game');
  });

  it('lists sample projects', () => {
    const samples = DeveloperExperience.listSampleProjects();

    expect(samples.length).toBeGreaterThanOrEqual(5);
    expect(samples.map((sample) => sample.id)).toContain('soc-investigation-game');
  });

  it('creates a project from a template', () => {
    const result = DeveloperExperience.createProjectFromTemplate(
      'soc-game',
      'quick-soc',
      'Quick SOC Project',
    );

    expect(result.projectId).toBe('quick-soc');
    expect(result.projectName).toBe('Quick SOC Project');
    expect(result.templateId).toBe('soc-game');
    expect(result.scenarioIds).toContain('mission-001');
    expect(result.missionIds).toContain('mission-001');
  });

  it('creates a project from a sample project', () => {
    const result = DeveloperExperience.createProjectFromSample(
      'soc-investigation-game',
      'quick-sample',
    );

    expect(result.projectId).toBe('quick-sample');
    expect(result.projectName).toBe('SOC Investigation Game');
    expect(result.templateId).toBe('soc-game');
    expect(result.sampleProjectId).toBe('soc-investigation-game');
    expect(result.sceneIds).toEqual([
      'organization',
      'network',
      'office',
    ]);
    expect(result.assetIds).toEqual([
      'dashboard',
      'terminal',
      'network-map',
    ]);
  });

  it('throws for an unknown template', () => {
    expect(() =>
      DeveloperExperience.createProjectFromTemplate(
        'missing-template',
        'bad',
        'Bad Project',
      ),
    ).toThrow(/Unknown project template/);
  });

  it('throws for an unknown sample project', () => {
    expect(() =>
      DeveloperExperience.createProjectFromSample(
        'missing-sample',
        'bad',
      ),
    ).toThrow(/Sample project not found/);
  });

  it('produces a valid developer experience report', () => {
    const report = DeveloperExperience.report();

    expect(report.validTemplates).toBe(true);
    expect(report.validSampleProjects).toBe(true);
    expect(report.templateCount).toBeGreaterThanOrEqual(5);
    expect(report.sampleProjectCount).toBeGreaterThanOrEqual(5);
    expect(report.quickStartSampleIds).toContain('soc-investigation-game');
  });
});
