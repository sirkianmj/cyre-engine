/**
 * BaseModule
 * ----------
 * Abstract base class for CYRE modules.
 * Provides default no-op lifecycle hooks and stores module metadata.
 * Subclasses must implement `initialize`.
 */

import type { CyreModule, EngineContext } from './types.js';

export abstract class BaseModule implements CyreModule {
  readonly name: string;
  readonly dependencies?: string[];

  /**
   * The engine context assigned during initialization.
   * Available after `initialize` is called.
   */
  protected ctx?: EngineContext;

  constructor(name: string, dependencies?: string[]) {
    if (!name || name.trim() === '') {
      throw new Error('Module name must be a non-empty string.');
    }
    this.name = name;
    if (dependencies && dependencies.length > 0) {
      this.dependencies = [...dependencies];
    }
  }

  abstract initialize(ctx: EngineContext): Promise<void> | void;

  async start(): Promise<void> {
    // Default: do nothing
  }

  async stop(): Promise<void> {
    // Default: do nothing
  }

  async shutdown(): Promise<void> {
    // Default: do nothing
  }

  /**
   * Returns the engine context if available, otherwise throws.
   */
  protected getContext(): EngineContext {
    if (!this.ctx) {
      throw new Error(`Module "${this.name}" has not been initialized yet.`);
    }
    return this.ctx;
  }
}
