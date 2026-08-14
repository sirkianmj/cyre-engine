import type { CyreModule, EngineContext } from './types.js';

export class ModuleManager {
  private modules: Map<string, CyreModule> = new Map();
  private initialized = false;
  private started = false;
  private stopped = false;

  register(module: CyreModule): void {
    if (this.modules.has(module.name)) {
      throw new Error(`Module with name "${module.name}" is already registered.`);
    }
    if (typeof module.initialize !== 'function') {
      throw new Error(`Module "${module.name}" must implement initialize(ctx).`);
    }
    this.modules.set(module.name, module);
  }

  async initializeAll(ctx: EngineContext): Promise<void> {
    if (this.initialized) {
      throw new Error('Modules have already been initialized.');
    }
    for (const module of this.modules.values()) {
      await module.initialize(ctx);
    }
    this.initialized = true;
  }

  async startAll(): Promise<void> {
    if (!this.initialized) {
      throw new Error('Cannot start modules before initialization.');
    }
    if (this.started) {
      throw new Error('Modules have already been started.');
    }
    for (const module of this.modules.values()) {
      if (module.start) {
        await module.start();
      }
    }
    this.started = true;
  }

  async stopAll(): Promise<void> {
    if (!this.started) {
      throw new Error('Cannot stop modules before start.');
    }
    if (this.stopped) {
      throw new Error('Modules have already been stopped.');
    }
    const modules = Array.from(this.modules.values()).reverse();
    for (const module of modules) {
      if (module.stop) {
        await module.stop();
      }
    }
    this.stopped = true;
  }

  async shutdownAll(): Promise<void> {
    const modules = Array.from(this.modules.values()).reverse();
    for (const module of modules) {
      if (module.shutdown) {
        await module.shutdown();
      }
    }
    this.modules.clear();
    this.initialized = false;
    this.started = false;
    this.stopped = false;
  }

  get(name: string): CyreModule | undefined {
    return this.modules.get(name);
  }

  has(name: string): boolean {
    return this.modules.has(name);
  }

  getModuleNames(): string[] {
    return Array.from(this.modules.keys());
  }
}
