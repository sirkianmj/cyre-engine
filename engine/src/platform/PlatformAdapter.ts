/**
 * PlatformAdapter
 * ----------------
 * Interface for platform-specific functionality.
 * Mobile/desktop/web adapters should implement this.
 */

export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
}

export interface LifecycleAdapter {
  onPause(callback: () => void): void;
  onResume(callback: () => void): void;
}

export interface PlatformAdapter {
  readonly name: string;
  readonly storage: StorageAdapter;
  readonly lifecycle: LifecycleAdapter;
}
