import { describe, expect, it } from 'vitest';
import { SampleProjects } from '../SampleProjects.js';
import { PROJECT_TEMPLATES } from '../ProjectTemplates.js';

describe('SampleProjects', () => {
  it('provides official sample projects', () => {
    const projects = SampleProjects.list();

    expect(projects.length).toBeGreaterThanOrEqual(5);
    expect(projects.map((project) => project.id)).toContain(
      'soc-investigation-game',
    );
  });

  it('only references real ProjectTemplates ids', () => {
    const templateIds = new Set(PROJECT_TEMPLATES.map((template) => template.id));

    for (const project of SampleProjects.list()) {
      expect(templateIds.has(project.templateId)).toBe(true);
    }
  });

  it('validates successfully', () => {
    expect(() => SampleProjects.validate()).not.toThrow();
  });

  it('retrieves a sample project by id', () => {
    const project = SampleProjects.get('cyre-research-experiment');

    expect(project.name).toBe('CYRE Research Experiment');
    expect(project.category).toBe('research');
    expect(project.templateId).toBe('research-experiment');
  });

  it('throws for a missing sample project', () => {
    expect(() => SampleProjects.get('missing')).toThrow(
      /Sample project not found/,
    );
  });

  it('returns known categories', () => {
    expect(SampleProjects.categories()).toEqual(
      expect.arrayContaining(['game', 'training', 'research']),
    );
  });
});
