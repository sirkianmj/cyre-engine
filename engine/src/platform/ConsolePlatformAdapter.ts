/**
 * ConsolePlatformAdapter
 * -----------------------
 * Platform adapter for console builds.
 * Uses in-memory storage (or can be extended) and lifecycle hooks.
 */

import type { PlatformAdapter, StorageAdapter, LifecycleAdapter } from './PlatformAdapter.js';
import { MemoryStorageAdapter } from './MemoryStorageAdapter.js';
import { PerformanceProfile, PERFORMANCE_SETTINGS } from './PerformanceProfile.js';

export class ConsolePlatformAdapter implements PlatformAdapter {
  readonly name: string = 'console';
  readonly storage: StorageAdapter;
  readonly lifecycle: LifecycleAdapter;
  readonly performanceProfile: PerformanceProfile;

  constructor(performanceProfile: PerformanceProfile = PerformanceProfile.Medium) {
    this.storage = new MemoryStorageAdapter();
    this.performanceProfile = performanceProfile;
    this.lifecycle = {
      onPause(callback: () => void): void {
        (this as unknown as { pauseCallback?: () => void }).pauseCallback = callback;
      },
      onResume(callback: () => void): void {
        (this as unknown as { resumeCallback?: () => void }).resumeCallback = callback;
      },
    };
  }

  getPerformanceSettings() {
    return PERFORMANCE_SETTINGS[this.performanceProfile];
  }

  simulatePause(): void {
    const callback = (this.lifecycle as unknown as { pauseCallback?: () => void }).pauseCallback;
    if (callback) callback();
  }

  simulateResume(): void {
    const callback = (this.lifecycle as unknown as { resumeCallback?: () => void }).resumeCallback;
    if (callback) callback();
  }
}
