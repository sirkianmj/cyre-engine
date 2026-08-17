/**
 * PerformanceProfile
 * -------------------
 * Defines rendering/performance profiles for different platforms.
 */

export enum PerformanceProfile {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
  Ultra = 'ultra',
}

export interface PerformanceSettings {
  label: string;
  maxFPS: number;
  renderScale: number;
  shadowsEnabled: boolean;
  postProcessingEnabled: boolean;
}

export const PERFORMANCE_SETTINGS: Record<PerformanceProfile, PerformanceSettings> = {
  [PerformanceProfile.Low]: {
    label: 'Low',
    maxFPS: 30,
    renderScale: 0.75,
    shadowsEnabled: false,
    postProcessingEnabled: false,
  },
  [PerformanceProfile.Medium]: {
    label: 'Medium',
    maxFPS: 60,
    renderScale: 1.0,
    shadowsEnabled: false,
    postProcessingEnabled: false,
  },
  [PerformanceProfile.High]: {
    label: 'High',
    maxFPS: 120,
    renderScale: 1.0,
    shadowsEnabled: true,
    postProcessingEnabled: true,
  },
  [PerformanceProfile.Ultra]: {
    label: 'Ultra',
    maxFPS: 240,
    renderScale: 1.5,
    shadowsEnabled: true,
    postProcessingEnabled: true,
  },
};
