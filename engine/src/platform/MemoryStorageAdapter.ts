/**
 * MemoryStorageAdapter
 * ---------------------
 * In-memory storage adapter for mobile and tests.
 */

import type { StorageAdapter } from './PlatformAdapter.js';

export class MemoryStorageAdapter implements StorageAdapter {
  private store: Map<string, string> = new Map();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (!key) throw new Error('Storage key must be a non-empty string.');
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}
