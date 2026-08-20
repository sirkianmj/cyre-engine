import {
  PROJECT_TEMPLATES,
  type ProjectTemplate,
  type ProjectTemplateCategory,
} from './ProjectTemplates.js';

export interface ProjectTemplateSummary {
  id: string;
  name: string;
  description: string;
  category: ProjectTemplateCategory;
  scenarioCount: number;
  missionCount: number;
  tags: string[];
}

const INFERRED_CATEGORIES: Record<string, ProjectTemplateCategory> = {
  'soc-game': 'game',
  'investigation-game': 'game',
  'red-team-game': 'game',
  'training-simulation': 'training',
  'research-experiment': 'research',
};

export class ProjectTemplateRegistry {
  private readonly templates: readonly ProjectTemplate[];

  constructor(templates: readonly ProjectTemplate[] = PROJECT_TEMPLATES) {
    this.templates = templates.map(cloneTemplate);
    this.validate();
  }

  static default(): ProjectTemplateRegistry {
    return new ProjectTemplateRegistry();
  }

  list(): ProjectTemplate[] {
    return this.templates.map(cloneTemplate);
  }

  get(id: string): ProjectTemplate {
    const template = this.templates.find((item) => item.id === id);
    if (!template) {
      throw new Error(`Project template not found: ${id}`);
    }

    return cloneTemplate(template);
  }

  has(id: string): boolean {
    return this.templates.some((item) => item.id === id);
  }

  count(): number {
    return this.templates.length;
  }

  summaries(): ProjectTemplateSummary[] {
    return this.templates.map((template) => ({
      id: template.id,
      name: template.name,
      description: template.description,
      category: resolveCategory(template),
      scenarioCount: template.defaultScenarioIds.length,
      missionCount: template.defaultMissionIds.length,
      tags: [...(template.tags ?? [])],
    }));
  }

  validate(): void {
    const ids = new Set<string>();

    for (const template of this.templates) {
      if (ids.has(template.id)) {
        throw new Error(`Duplicate project template id: ${template.id}`);
      }

      ids.add(template.id);

      if (template.name.trim().length === 0) {
        throw new Error(`Project template ${template.id} is missing a name.`);
      }

      if (template.description.trim().length === 0) {
        throw new Error(`Project template ${template.id} is missing a description.`);
      }

      resolveCategory(template);
    }
  }
}

function resolveCategory(template: ProjectTemplate): ProjectTemplateCategory {
  if (
    template.category &&
    ['game', 'training', 'research'].includes(template.category)
  ) {
    return template.category;
  }

  const inferred = INFERRED_CATEGORIES[template.id];
  if (inferred) {
    return inferred;
  }

  throw new Error(`Project template ${template.id} requires a valid category.`);
}

function cloneTemplate(template: ProjectTemplate): ProjectTemplate {
  return {
    ...template,
    tags: [...(template.tags ?? [])],
    defaultSettings: { ...template.defaultSettings },
    defaultScenarioIds: [...template.defaultScenarioIds],
    defaultMissionIds: [...template.defaultMissionIds],
  };
}
