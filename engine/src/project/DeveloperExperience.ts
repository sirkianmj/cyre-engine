import { ProjectCreator } from './ProjectCreator.js';
import {
  SampleProjects,
  type SampleProjectDefinition,
} from './SampleProjects.js';
import {
  ProjectTemplateRegistry,
  type ProjectTemplateSummary,
} from './ProjectTemplateRegistry.js';

export interface DeveloperQuickStartResult {
  projectId: string;
  projectName: string;
  templateId: string;
  sampleProjectId?: string;
  scenarioIds: string[];
  missionIds: string[];
  sceneIds: string[];
  assetIds: string[];
}

export interface DeveloperExperienceReport {
  templateCount: number;
  sampleProjectCount: number;
  validTemplates: boolean;
  validSampleProjects: boolean;
  quickStartSampleIds: string[];
}

export class DeveloperExperience {
  private constructor() {}

  static listTemplates(): ProjectTemplateSummary[] {
    return ProjectTemplateRegistry.default().summaries();
  }

  static listSampleProjects(): SampleProjectDefinition[] {
    return SampleProjects.list();
  }

  static createProjectFromTemplate(
    templateId: string,
    projectId: string,
    projectName: string,
  ): DeveloperQuickStartResult {
    if (!ProjectCreator.hasTemplate(templateId)) {
      throw new Error(`Unknown project template: ${templateId}`);
    }

    const data = ProjectCreator.createProject(projectId, projectName, templateId);

    return {
      projectId: data.id,
      projectName: data.name,
      templateId,
      scenarioIds: data.scenarioIds,
      missionIds: data.missionIds,
      sceneIds: data.sceneIds ?? [],
      assetIds: data.assetIds ?? [],
    };
  }

  static createProjectFromSample(
    sampleProjectId: string,
    projectId: string,
    projectName?: string,
  ): DeveloperQuickStartResult {
    const sample = SampleProjects.get(sampleProjectId);
    const resolvedName = projectName?.trim() || sample.name;

    const data = ProjectCreator.createProject(
      projectId,
      resolvedName,
      sample.templateId,
      {
        description: sample.description,
        scenarioIds: [...sample.scenarioIds],
        missionIds: [...sample.missionIds],
        sceneIds: [...sample.sceneIds],
        assetIds: [...sample.assetIds],
      },
    );

    return {
      projectId: data.id,
      projectName: data.name,
      templateId: sample.templateId,
      sampleProjectId: sample.id,
      scenarioIds: data.scenarioIds,
      missionIds: data.missionIds,
      sceneIds: data.sceneIds ?? [],
      assetIds: data.assetIds ?? [],
    };
  }

  static report(): DeveloperExperienceReport {
    let validTemplates = true;
    let templateCount = 0;

    try {
      const registry = ProjectTemplateRegistry.default();
      templateCount = registry.count();
    } catch {
      validTemplates = false;
      templateCount = 0;
    }

    let validSampleProjects = true;
    let sampleProjectCount = 0;
    let quickStartSampleIds: string[] = [];

    try {
      const samples = SampleProjects.list();
      sampleProjectCount = samples.length;
      quickStartSampleIds = samples.map((sample) => sample.id);
      SampleProjects.validate();
    } catch {
      validSampleProjects = false;
      sampleProjectCount = 0;
      quickStartSampleIds = [];
    }

    return {
      templateCount,
      sampleProjectCount,
      validTemplates,
      validSampleProjects,
      quickStartSampleIds,
    };
  }
}
