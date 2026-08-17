/**
 * DesktopApp
 * -----------
 * Bootstraps a CYRE engine instance for desktop use.
 * Uses a desktop platform adapter and file storage.
 */

import { Engine } from '../core/Engine.js';
import { DesktopPlatformAdapter } from './DesktopPlatformAdapter.js';

export class DesktopApp {
  readonly engine: Engine;
  readonly platform: DesktopPlatformAdapter;

  constructor(options: { storageFilePath: string; appName?: string }) {
    this.platform = new DesktopPlatformAdapter(options.storageFilePath);
    this.engine = new Engine({
      appName: options.appName ?? 'CYRE Desktop',
      version: '0.1.0',
      logLevel: 'info',
    });
  }

  async initialize(): Promise<void> {
    await this.engine.initialize();
  }

  async start(): Promise<void> {
    await this.engine.start();
  }

  async stop(): Promise<void> {
    await this.engine.stop();
  }

  async shutdown(): Promise<void> {
    await this.engine.shutdown();
  }
}
