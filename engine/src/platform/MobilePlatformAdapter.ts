/**
 * MobilePlatformAdapter
 * ---------------------
 * Basic platform adapter for iOS/Android.
 * Uses in-memory storage and simple lifecycle callbacks.
 */

import type { PlatformAdapter, LifecycleAdapter, StorageAdapter } from './PlatformAdapter.js';
import { MemoryStorageAdapter } from './MemoryStorageAdapter.js';

export class MobilePlatformAdapter implements PlatformAdapter {
  readonly name: string = 'mobile';
  readonly storage: StorageAdapter;
  readonly lifecycle: LifecycleAdapter;

  constructor() {
    this.storage = new MemoryStorageAdapter();
    this.lifecycle = {
      onPause(callback: () => void): void {
        // In a real mobile environment, this would hook into AppState
        // For this adapter, we just store the callback.
        (this as unknown as { pauseCallback?: () => void }).pauseCallback = callback;
      },
      onResume(callback: () => void): void {
        (this as unknown as { resumeCallback?: () => void }).resumeCallback = callback;
      },
    };
  }

  /**
   * Simulate a pause event (for tests).
   */
  simulatePause(): void {
    const callback = (this.lifecycle as unknown as { pauseCallback?: () => void }).pauseCallback;
    if (callback) callback();
  }

  /**
   * Simulate a resume event (for tests).
   */
  simulateResume(): void {
    const callback = (this.lifecycle as unknown as { resumeCallback?: () => void }).resumeCallback;
    if (callback) callback();
  }
}
