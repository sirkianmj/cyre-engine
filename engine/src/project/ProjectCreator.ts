import type { ProjectData } from './ProjectTypes.js';
import { PROJECT_TEMPLATES, type ProjectTemplate } from './ProjectTemplates.js';

export class ProjectCreator {
  static getTemplates(): ProjectTemplate[] {
    return PROJECT_TEMPLATES.map((template) => ({ ...template }));
  }

  static hasTemplate(templateId: string): boolean {
    return PROJECT_TEMPLATES.some((template) => template.id === templateId);
  }

  static createProject(
    projectId: string,
    projectName: string,
    templateId: string,
    overrides: Partial<ProjectData> = {},
  ): ProjectData {
    if (!projectId || projectId.trim() === '') {
      throw new Error('Project id is required.');
    }
    if (!projectName || projectName.trim() === '') {
      throw new Error('Project name is required.');
    }

    const template = PROJECT_TEMPLATES.find((entry) => entry.id === templateId);
    if (!template) {
      throw new Error(`Unknown project template "${templateId}".`);
    }

    const projectData: ProjectData = {
      id: projectId,
      name: projectName,
      description: overrides.description ?? template.description,
      scenarioIds: overrides.scenarioIds ? [...overrides.scenarioIds] : [...template.defaultScenarioIds],
      missionIds: overrides.missionIds ? [...overrides.missionIds] : [...template.defaultMissionIds],
      settings: {
        ...template.defaultSettings,
        ...(overrides.settings ?? {}),
      },
    };

    if (overrides.sceneIds) {
      projectData.sceneIds = [...overrides.sceneIds];
    }

    if (overrides.assetIds) {
      projectData.assetIds = [...overrides.assetIds];
    }

    if (overrides.scenes) {
      projectData.scenes = overrides.scenes.map((scene) => ({
        ...scene,
        scenarioIds: [...scene.scenarioIds],
      }));
    }

    if (overrides.assets) {
      projectData.assets = overrides.assets.map((asset) => ({ ...asset }));
    }

    if (overrides.buildProfiles) {
      projectData.buildProfiles = overrides.buildProfiles.map((profile) => ({
        ...profile,
        settings: { ...profile.settings },
      }));
    }

    if (overrides.research) {
      projectData.research = { ...overrides.research };
    }

    return projectData;
  }
}
