/**
 * CYRE Platform Module Exports
 * -----------------------------
 * Public API for platform adapters, input, performance, and resolution.
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
