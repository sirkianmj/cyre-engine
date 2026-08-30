/**
 * DesktopPlatformAdapter
 * -----------------------
 * Platform adapter for desktop builds.
 * Uses file-based storage and simple lifecycle callbacks.
 */

import type { PlatformAdapter, StorageAdapter, LifecycleAdapter } from './PlatformAdapter.js';
import { FileStorageAdapter } from './FileStorageAdapter.js';

export class DesktopPlatformAdapter implements PlatformAdapter {
  readonly name: string = 'desktop';
  readonly storage: StorageAdapter;
  readonly lifecycle: LifecycleAdapter;

  constructor(storageFilePath: string) {
    this.storage = new FileStorageAdapter(storageFilePath);
    this.lifecycle = {
      onPause(callback: () => void): void {
        (this as unknown as { pauseCallback?: () => void }).pauseCallback = callback;
      },
      onResume(callback: () => void): void {
        (this as unknown as { resumeCallback?: () => void }).resumeCallback = callback;
      },
    };
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
