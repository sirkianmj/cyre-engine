/**
 * FileStorageAdapter
 * -------------------
 * A simple file-based key-value storage adapter.
 * Data is stored as a JSON object in a single file.
 * Suitable for desktop builds (Windows, macOS, Linux).
 */

import fs from 'node:fs';
import path from 'node:path';
import type { StorageAdapter } from './PlatformAdapter.js';

export class FileStorageAdapter implements StorageAdapter {
  private filePath: string;
  private data: Record<string, string>;

  constructor(filePath: string) {
    if (!filePath || filePath.trim() === '') {
      throw new Error('Storage file path must be a non-empty string.');
    }
    this.filePath = filePath;
    this.data = this.load();
  }

  getItem(key: string): string | null {
    return Object.prototype.hasOwnProperty.call(this.data, key) ? this.data[key] : null;
  }

  setItem(key: string, value: string): void {
    if (!key || key.trim() === '') {
      throw new Error('Storage key must be a non-empty string.');
    }
    this.data[key] = value;
    this.save();
  }

  removeItem(key: string): void {
    delete this.data[key];
    this.save();
  }

  clear(): void {
    this.data = {};
    this.save();
  }

  private load(): Record<string, string> {
    if (fs.existsSync(this.filePath)) {
      const raw = fs.readFileSync(this.filePath, 'utf-8');
      try {
        const parsed = JSON.parse(raw);
        if (typeof parsed === 'object' && parsed !== null) {
          return parsed as Record<string, string>;
        }
      } catch (error) {
        // If file is corrupt, start with empty data.
      }
    }
    return {};
  }

  private save(): void {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
  }
}
