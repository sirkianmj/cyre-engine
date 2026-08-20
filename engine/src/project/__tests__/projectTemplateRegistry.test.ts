import { describe, expect, it } from 'vitest';
import {
  PROJECT_TEMPLATES,
  type ProjectTemplate,
} from '../ProjectTemplates.js';
import { ProjectTemplateRegistry } from '../ProjectTemplateRegistry.js';

describe('ProjectTemplateRegistry', () => {
  it('provides the official templates by default', () => {
    const registry = ProjectTemplateRegistry.default();

    expect(registry.count()).toBeGreaterThanOrEqual(5);
    expect(registry.list().map((template) => template.id)).toContain('soc-game');
    expect(registry.list().map((template) => template.id)).toContain(
      'research-experiment',
    );
  });

  it('retrieves a template by id', () => {
    const registry = ProjectTemplateRegistry.default();
    const template = registry.get('red-team-game');

    expect(template.name).toBe('Red Team Operations Game');
    expect(template.category).toBe('game');
  });

  it('returns whether a template exists', () => {
    const registry = ProjectTemplateRegistry.default();

    expect(registry.has('training-simulation')).toBe(true);
    expect(registry.has('missing-template')).toBe(false);
  });

  it('throws for a missing template', () => {
    const registry = ProjectTemplateRegistry.default();

    expect(() => registry.get('missing-template')).toThrow(
      /Project template not found/,
    );
  });

  it('validates successfully for official templates', () => {
    const registry = ProjectTemplateRegistry.default();

    expect(() => registry.validate()).not.toThrow();
  });

  it('rejects duplicate template ids', () => {
    const duplicate: ProjectTemplate[] = [
      { ...PROJECT_TEMPLATES[0] },
      { ...PROJECT_TEMPLATES[0] },
    ];

    expect(() => new ProjectTemplateRegistry(duplicate)).toThrow(
      /Duplicate project template id/,
    );
  });

  it('produces summaries with categories and counts', () => {
    const summaries = ProjectTemplateRegistry.default().summaries();

    expect(summaries).toHaveLength(PROJECT_TEMPLATES.length);
    expect(summaries.map((summary) => summary.id)).toContain('soc-game');

    const research = summaries.find(
      (summary) => summary.id === 'research-experiment',
    );
    expect(research?.category).toBe('research');
    expect(research?.scenarioCount).toBe(0);
    expect(research?.missionCount).toBe(0);
  });
});
