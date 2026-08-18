import type { ProjectData, ProjectTarget } from './ProjectTypes.js';
import { ProjectModel } from './ProjectModel.js';
import { ProjectCreator } from './ProjectCreator.js';
import { ProjectSerializer } from '../serialization/index.js';

export interface ProjectSummary {
  id: string;
  name: string;
  description?: string;
  scenarioCount: number;
  missionCount: number;
  lastOpenedAt?: string;
}

export interface ProjectManagerOptions {
  maxRecent?: number;
}

export class ProjectManager {
  private readonly projects = new Map<string, ProjectModel>();
  private readonly recentIds: string[] = [];
  private readonly serializer: ProjectSerializer;
  private readonly maxRecent: number;

  constructor(options: ProjectManagerOptions = {}) {
    this.serializer = new ProjectSerializer();
    this.maxRecent = options.maxRecent ?? 10;
  }

  createProjectFromTemplate(
    projectId: string,
    projectName: string,
    templateId: string,
    overrides: Partial<ProjectData> = {},
  ): ProjectModel {
    const data = ProjectCreator.createProject(projectId, projectName, templateId, overrides);
    return this.importProject(data);
  }

  importProject(data: ProjectData): ProjectModel {
    const model = new ProjectModel(data);
    this.store(model);
    return model;
  }

  deserializeProject(json: string): ProjectModel {
    const data = this.serializer.deserialize(json);
    const projectData: ProjectData = {
      id: data.id,
      name: data.name,
      description: data.description,
      scenarioIds: data.scenarioIds,
      missionIds: data.missionIds ?? [],
      settings: data.settings ?? {},
    };
    if (data.engineVersion) {
      projectData.settings = {
        ...projectData.settings,
        engineVersion: data.engineVersion,
      };
    }
    return this.importProject(projectData);
  }

  serializeProject(projectId: string): string {
    const project = this.get(projectId);
    const data = project.toJSON();
    return this.serializer.serialize(data as any);
  }

  get(projectId: string): ProjectModel {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project "${projectId}" is not open.`);
    }
    return project;
  }

  has(projectId: string): boolean {
    return this.projects.has(projectId);
  }

  openProject(projectId: string): ProjectModel {
    const project = this.get(projectId);
    this.touchRecent(projectId);
    return project;
  }

  listProjects(): ProjectSummary[] {
    return [...this.projects.values()].map((project) => this.toSummary(project));
  }

  listRecentProjects(): ProjectSummary[] {
    return this.recentIds
      .map((id) => this.projects.get(id))
      .filter((project): project is ProjectModel => Boolean(project))
      .map((project) => this.toSummary(project));
  }

  duplicateProject(sourceProjectId: string, newProjectId: string, newProjectName?: string): ProjectModel {
    const source = this.get(sourceProjectId);
    const sourceData = source.toJSON();
    const duplicateData: ProjectData = {
      ...sourceData,
      id: newProjectId,
      name: newProjectName ?? `${sourceData.name} Copy`,
      scenarioIds: [...sourceData.scenarioIds],
      missionIds: [...sourceData.missionIds],
      settings: { ...sourceData.settings },
    };
    if (sourceData.scenes) {
      duplicateData.scenes = sourceData.scenes.map((scene) => ({
        ...scene,
        scenarioIds: [...scene.scenarioIds],
      }));
    }
    if (sourceData.assets) {
      duplicateData.assets = sourceData.assets.map((asset) => ({ ...asset }));
    }
    if (sourceData.buildProfiles) {
      duplicateData.buildProfiles = sourceData.buildProfiles.map((profile) => ({
        ...profile,
        settings: { ...profile.settings },
      }));
    }
    if (sourceData.research) {
      duplicateData.research = { ...sourceData.research };
    }
    return this.importProject(duplicateData);
  }

  removeProject(projectId: string): boolean {
    const removed = this.projects.delete(projectId);
    if (removed) {
      const recentIndex = this.recentIds.indexOf(projectId);
      if (recentIndex >= 0) {
        this.recentIds.splice(recentIndex, 1);
      }
    }
    return removed;
  }

  private store(project: ProjectModel): void {
    const id = project.getId();
    this.projects.set(id, project);
    this.touchRecent(id);
  }

  private touchRecent(projectId: string): void {
    const existingIndex = this.recentIds.indexOf(projectId);
    if (existingIndex >= 0) {
      this.recentIds.splice(existingIndex, 1);
    }
    this.recentIds.unshift(projectId);
    if (this.recentIds.length > this.maxRecent) {
      this.recentIds.length = this.maxRecent;
    }
  }

  private toSummary(project: ProjectModel): ProjectSummary {
    const data = project.getData();
    const recentIndex = this.recentIds.indexOf(data.id);
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      scenarioCount: data.scenarioIds.length,
      missionCount: data.missionIds.length,
      lastOpenedAt: recentIndex >= 0 ? new Date().toISOString() : undefined,
    };
  }
}
