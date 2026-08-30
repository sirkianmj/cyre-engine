export type ProjectTarget = 'web' | 'mobile' | 'desktop' | 'console';

export interface ProjectScene {
  id: string;
  name: string;
  scenarioIds: string[];
}

export interface ProjectAsset {
  id: string;
  name: string;
  type: string;
  path?: string;
}

export interface ProjectBuildProfile {
  id: string;
  name: string;
  target: ProjectTarget;
  settings: Record<string, unknown>;
}

export interface ProjectResearchConfig {
  enabled: boolean;
  experimentId?: string;
  seed?: number;
}

export interface ProjectData {
  id: string;
  name: string;
  description?: string;
  sceneIds?: string[];
  scenes?: ProjectScene[];
  scenarioIds: string[];
  missionIds: string[];
  assetIds?: string[];
  assets?: ProjectAsset[];
  buildProfiles?: ProjectBuildProfile[];
  research?: ProjectResearchConfig;
  settings: Record<string, unknown>;
}
