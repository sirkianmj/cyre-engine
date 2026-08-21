/**
 * CYRE Platform Module Exports
 * -----------------------------
 * Public API for platform adapters, input, performance, resolution,
 * build pipeline tooling, web packaging, desktop packaging, mobile packaging,
 * and console architecture.
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

export {
  DESKTOP_PLATFORMS,
  isDesktopPlatform,
} from './DesktopPackageTypes.js';
export type {
  DesktopPlatform,
  DesktopPackageOptions,
  DesktopPackageManifest,
} from './DesktopPackageTypes.js';
export { DesktopPackage } from './DesktopPackage.js';
export { DesktopPackager } from './DesktopPackager.js';
export type {
  DesktopPackagerOptions,
  DesktopPackageBuildInput,
  DesktopPackageBuildResult,
} from './DesktopPackager.js';

export {
  MOBILE_PLATFORMS,
  isMobilePlatform,
} from './MobilePackageTypes.js';
export type {
  MobilePlatform,
  MobilePackageOptions,
  MobilePackageManifest,
} from './MobilePackageTypes.js';
export { MobilePackage } from './MobilePackage.js';
export { MobilePackager } from './MobilePackager.js';
export type {
  MobilePackagerOptions,
  MobilePackageBuildInput,
  MobilePackageBuildResult,
} from './MobilePackager.js';

export {
  CONSOLE_FAMILIES,
  CONSOLE_RENDERING_ABSTRACTIONS,
  CONSOLE_INPUT_ABSTRACTIONS,
  CONSOLE_SAVE_SYSTEMS,
  CONSOLE_SERVICES,
  isConsoleFamily,
  isConsoleRenderingAbstraction,
  isConsoleInputAbstraction,
  isConsoleSaveSystem,
  isConsoleService,
} from './ConsoleArchitectureTypes.js';
export type {
  ConsoleFamily,
  ConsoleRenderingAbstraction,
  ConsoleInputAbstraction,
  ConsoleSaveSystem,
  ConsoleService,
} from './ConsoleArchitectureTypes.js';
export {
  ConsoleArchitectureProfile,
} from './ConsoleArchitectureProfile.js';
export type {
  ConsoleArchitectureProfileOptions,
} from './ConsoleArchitectureProfile.js';
export {
  ConsoleArchitecture,
} from './ConsoleArchitecture.js';
export type {
  ConsoleArchitectureOptions,
  ConsoleArchitectureSnapshot,
} from './ConsoleArchitecture.js';

export {
  AUDIO_CHANNELS,
  AUDIO_CLIP_KINDS,
  AUDIO_PLAYBACK_STATES,
  AUDIO_EVENT_TYPES,
  isAudioChannel,
  isAudioClipKind,
  isAudioPlaybackState,
  isAudioEventType,
} from './AudioTypes.js';
export type {
  AudioChannel,
  AudioClipKind,
  AudioPlaybackState,
  AudioEventType,
  AudioEvent,
} from './AudioTypes.js';
export { AudioClipDescriptor } from './AudioClipDescriptor.js';
export type { AudioClipDescriptorOptions } from './AudioClipDescriptor.js';
export { AudioMixer } from './AudioMixer.js';
export type { AudioMixerSnapshot } from './AudioMixer.js';
export { AudioSystem } from './AudioSystem.js';
export type {
  AudioSystemOptions,
  AudioSystemSnapshot,
} from './AudioSystem.js';

export {
  COMPATIBILITY_AUDIT_SEVERITIES,
  COMPATIBILITY_AUDIT_CATEGORIES,
  isCompatibilityAuditSeverity,
  isCompatibilityAuditCategory,
} from './CompatibilityTypes.js';
export type {
  CompatibilityAuditSeverity,
  CompatibilityAuditCategory,
  CompatibilityAuditIssue,
  CompatibilityAuditReport,
  CompatibilityAuditSystemOptions,
} from './CompatibilityTypes.js';
export { CompatibilityAuditSystem } from './CompatibilityAuditSystem.js';

export {
  CI_CD_STAGES,
} from './CiCdTypes.js';
export type {
  CiCdStage,
  CiCdStageStatus,
  CiCdStageResult,
  CiCdPipelineResult,
} from './CiCdTypes.js';
export {
  CiCdPipeline,
} from './CiCdPipeline.js';
export type {
  CiCdPipelineOptions,
  CiCdPackageInput,
} from './CiCdPipeline.js';

export {
  RELEASE_CHANNELS,
  isReleaseChannel,
} from './ReleaseChannelTypes.js';
export type {
  ReleaseChannel,
  ReleaseChannelManagerOptions,
  ReleaseChannelManagerSnapshot,
} from './ReleaseChannelTypes.js';
export {
  ReleaseChannelManager,
} from './ReleaseChannelManager.js';

export {
  FlagshipGameReleaseCandidate,
} from './FlagshipGameReleaseCandidate.js';
export type {
  FlagshipGameReleaseCandidateOptions,
  FlagshipGameReleaseCandidateSnapshot,
} from './FlagshipGameReleaseCandidate.js';

export {
  CyreReleaseCandidate,
} from './CyreReleaseCandidate.js';
export type {
  CyreReleaseCandidateOptions,
  CyreReleaseCandidateReport,
} from './CyreReleaseCandidate.js';
