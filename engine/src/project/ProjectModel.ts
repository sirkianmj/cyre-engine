import type {
  ProjectAsset,
  ProjectBuildProfile,
  ProjectData,
  ProjectResearchConfig,
  ProjectScene,
} from './ProjectTypes.js';

export class ProjectModel {
  private data: ProjectData;

  constructor(data: ProjectData) {
    this.validate(data);
    this.data = {
      ...data,
      scenarioIds: [...data.scenarioIds],
      missionIds: [...data.missionIds],
      scenes: data.scenes ? [...data.scenes] : [],
      assets: data.assets ? [...data.assets] : [],
      buildProfiles: data.buildProfiles ? [...data.buildProfiles] : [],
      settings: data.settings ? { ...data.settings } : {},
    };
  }

  getId(): string {
    return this.data.id;
  }

  getName(): string {
    return this.data.name;
  }

  getDescription(): string | undefined {
    return this.data.description;
  }

  getData(): Readonly<ProjectData> {
    return this.data;
  }

  toJSON(): ProjectData {
    return {
      ...this.data,
      scenarioIds: [...this.data.scenarioIds],
      missionIds: [...this.data.missionIds],
      scenes: this.data.scenes ? [...this.data.scenes] : [],
      assets: this.data.assets ? [...this.data.assets] : [],
      buildProfiles: this.data.buildProfiles ? [...this.data.buildProfiles] : [],
      settings: { ...this.data.settings },
    };
  }

  addScenario(scenarioId: string): void {
    if (!scenarioId || scenarioId.trim() === '') {
      throw new Error('Scenario id is required.');
    }
    if (this.data.scenarioIds.includes(scenarioId)) {
      throw new Error(`Scenario "${scenarioId}" already exists in project.`);
    }
    this.data.scenarioIds.push(scenarioId);
  }

  removeScenario(scenarioId: string): void {
    const index = this.data.scenarioIds.indexOf(scenarioId);
    if (index >= 0) {
      this.data.scenarioIds.splice(index, 1);
    }
  }

  addMission(missionId: string): void {
    if (!missionId || missionId.trim() === '') {
      throw new Error('Mission id is required.');
    }
    if (this.data.missionIds.includes(missionId)) {
      throw new Error(`Mission "${missionId}" already exists in project.`);
    }
    this.data.missionIds.push(missionId);
  }

  removeMission(missionId: string): void {
    const index = this.data.missionIds.indexOf(missionId);
    if (index >= 0) {
      this.data.missionIds.splice(index, 1);
    }
  }

  addScene(scene: ProjectScene): void {
    if (!scene.id || scene.id.trim() === '') {
      throw new Error('Scene id is required.');
    }
    const scenes = this.data.scenes ?? [];
    if (scenes.some((entry) => entry.id === scene.id)) {
      throw new Error(`Scene "${scene.id}" already exists in project.`);
    }
    this.data.scenes = [...scenes, { ...scene, scenarioIds: [...scene.scenarioIds] }];
    this.data.sceneIds = this.data.scenes.map((entry) => entry.id);
  }

  addAsset(asset: ProjectAsset): void {
    if (!asset.id || asset.id.trim() === '') {
      throw new Error('Asset id is required.');
    }
    const assets = this.data.assets ?? [];
    if (assets.some((entry) => entry.id === asset.id)) {
      throw new Error(`Asset "${asset.id}" already exists in project.`);
    }
    this.data.assets = [...assets, { ...asset }];
    this.data.assetIds = this.data.assets.map((entry) => entry.id);
  }

  setSetting(key: string, value: unknown): void {
    if (!key || key.trim() === '') {
      throw new Error('Setting key is required.');
    }
    this.data.settings[key] = value;
  }

  getSetting(key: string): unknown {
    return this.data.settings[key];
  }

  addBuildProfile(profile: ProjectBuildProfile): void {
    if (!profile.id || profile.id.trim() === '') {
      throw new Error('Build profile id is required.');
    }
    if (!profile.name || profile.name.trim() === '') {
      throw new Error('Build profile name is required.');
    }
    const profiles = this.data.buildProfiles ?? [];
    if (profiles.some((entry) => entry.id === profile.id)) {
      throw new Error(`Build profile "${profile.id}" already exists in project.`);
    }
    this.data.buildProfiles = [...profiles, { ...profile, settings: { ...profile.settings } }];
  }

  setResearch(config: ProjectResearchConfig): void {
    this.data.research = { ...config };
  }

  private validate(data: ProjectData): void {
    if (!data.id || data.id.trim() === '') {
      throw new Error('Project id is required.');
    }
    if (!data.name || data.name.trim() === '') {
      throw new Error('Project name is required.');
    }
    if (!Array.isArray(data.scenarioIds)) {
      throw new Error('Project scenarioIds must be an array.');
    }
    if (!Array.isArray(data.missionIds)) {
      throw new Error('Project missionIds must be an array.');
    }
  }
}
