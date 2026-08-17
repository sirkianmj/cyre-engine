/**
 * CYRE Platform Module Exports
 * -----------------------------
 * Public API for platform adapters.
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
