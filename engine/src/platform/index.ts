/**
 * CYRE Platform Module Exports
 * -----------------------------
 * Public API for platform adapters, input, performance, resolution,
 * build pipeline tooling, and web packaging.
 */

export type {
  PlatformAdapter,
  StorageAdapter,
  LifecycleAdapter,
} from './PlatformAdapter.js';
export { MemoryStorageAdapter } from './MemoryStorageAdapter.js';
export { MobilePlatformAdapter } from './MobilePlatformAdapter.js';
export {
  TouchInputAdapter,
  type TouchPoint,
  type TouchCommand,
} from './TouchInputAdapter.js';
export { FileStorageAdapter } from './FileStorageAdapter.js';
export { DesktopPlatformAdapter } from './DesktopPlatformAdapter.js';
export { DesktopApp } from './DesktopApp.js';
export type { InputAdapter, InputCommand } from './InputDevice.js';
export { GamepadInputAdapter } from './GamepadInputAdapter.js';
export {
  PerformanceProfile,
  PERFORMANCE_SETTINGS,
  type PerformanceSettings,
} from './PerformanceProfile.js';
export {
  ResolutionSettings,
  type ResolutionInfo,
} from './ResolutionSettings.js';
export { ConsolePlatformAdapter } from './ConsolePlatformAdapter.js';

export { BUILD_TARGETS, BUILD_FLAVORS, isBuildTarget, isBuildFlavor } from './BuildTypes.js';
export type { BuildTarget, BuildFlavor } from './BuildTypes.js';
export { BuildProfile } from './BuildProfile.js';
export type { BuildProfileOptions } from './BuildProfile.js';
export { BuildArtifact } from './BuildArtifact.js';
export type { BuildArtifactOptions } from './BuildArtifact.js';
export { BuildPipeline } from './BuildPipeline.js';
export type {
  BuildPipelineOptions,
  BuildStage,
  BuildLogEntry,
  BuildResult,
} from './BuildPipeline.js';

export { WebPackage } from './WebPackage.js';
export type {
  WebPackageOptions,
  WebPackageManifest,
} from './WebPackageTypes.js';
export { WebPackager } from './WebPackager.js';
export type {
  WebPackagerOptions,
  WebPackageBuildInput,
  WebPackageBuildResult,
} from './WebPackager.js';
