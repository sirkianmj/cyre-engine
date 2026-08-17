import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { FileStorageAdapter } from '../FileStorageAdapter.js';
import { DesktopPlatformAdapter } from '../DesktopPlatformAdapter.js';
import { DesktopApp } from '../DesktopApp.js';

describe('FileStorageAdapter', () => {
  let tempDir: string;
  let storageFile: string;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cyre-test-'));
    storageFile = path.join(tempDir, 'storage.json');
  });

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('stores and retrieves values', () => {
    const storage = new FileStorageAdapter(storageFile);
    storage.setItem('key1', 'value1');
    storage.setItem('key2', 'value2');
    expect(storage.getItem('key1')).toBe('value1');
    expect(storage.getItem('key2')).toBe('value2');
  });

  it('removes values', () => {
    const storage = new FileStorageAdapter(storageFile);
    storage.removeItem('key1');
    expect(storage.getItem('key1')).toBeNull();
  });

  it('persists data across instances', () => {
    const storage1 = new FileStorageAdapter(storageFile);
    storage1.setItem('persist', 'yes');
    const storage2 = new FileStorageAdapter(storageFile);
    expect(storage2.getItem('persist')).toBe('yes');
  });

  it('clears all data', () => {
    const storage = new FileStorageAdapter(storageFile);
    storage.clear();
    expect(storage.getItem('key2')).toBeNull();
  });
});

describe('DesktopPlatformAdapter', () => {
  let tempDir: string;
  let storageFile: string;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cyre-desktop-test-'));
    storageFile = path.join(tempDir, 'storage.json');
  });

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('has name desktop and file storage', () => {
    const adapter = new DesktopPlatformAdapter(storageFile);
    expect(adapter.name).toBe('desktop');
    expect(adapter.storage).toBeInstanceOf(FileStorageAdapter);
  });

  it('handles lifecycle pause/resume', () => {
    const adapter = new DesktopPlatformAdapter(storageFile);
    let paused = false;
    let resumed = false;
    adapter.lifecycle.onPause(() => { paused = true; });
    adapter.lifecycle.onResume(() => { resumed = true; });
    adapter.simulatePause();
    adapter.simulateResume();
    expect(paused).toBe(true);
    expect(resumed).toBe(true);
  });
});

describe('DesktopApp', () => {
  it('creates engine and platform', async () => {
    const app = new DesktopApp({ storageFilePath: path.join(os.tmpdir(), 'app-test.json') });
    expect(app.engine).toBeDefined();
    expect(app.platform.name).toBe('desktop');
    await app.initialize();
    await app.start();
    expect(app.engine.getState()).toBe('started');
    await app.stop();
    await app.shutdown();
  });
});
