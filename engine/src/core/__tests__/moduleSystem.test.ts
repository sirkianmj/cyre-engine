import { describe, it, expect, vi } from 'vitest';
import { ModuleManager } from '../ModuleManager.js';
import { BaseModule } from '../BaseModule.js';
import type { CyreModule, EngineContext } from '../types.js';
import { Logger } from '../Logger.js';

function createContext(manager: ModuleManager): EngineContext {
  return {
    config: { appName: 'test', version: '1.0.0', logLevel: 'info' },
    logger: new Logger('error'),
    modules: manager,
    emitError: () => {},
  };
}

describe('ModuleManager with dependencies', () => {
  it('initializes modules in topological order', async () => {
    const manager = new ModuleManager();
    const order: string[] = [];

    const moduleA: CyreModule = {
      name: 'A',
      dependencies: ['B'],
      initialize: () => { order.push('A'); },
    };
    const moduleB: CyreModule = {
      name: 'B',
      initialize: () => { order.push('B'); },
    };

    manager.register(moduleA);
    manager.register(moduleB);
    await manager.initializeAll(createContext(manager));

    expect(order).toEqual(['B', 'A']);
  });

  it('throws on missing dependency', async () => {
    const manager = new ModuleManager();
    const moduleA: CyreModule = {
      name: 'A',
      dependencies: ['C'],
      initialize: () => {},
    };
    manager.register(moduleA);
    await expect(manager.initializeAll(createContext(manager))).rejects.toThrow(
      /depends on missing module/,
    );
  });

  it('detects circular dependencies', async () => {
    const manager = new ModuleManager();
    const moduleA: CyreModule = {
      name: 'A',
      dependencies: ['B'],
      initialize: () => {},
    };
    const moduleB: CyreModule = {
      name: 'B',
      dependencies: ['A'],
      initialize: () => {},
    };
    manager.register(moduleA);
    manager.register(moduleB);
    await expect(manager.initializeAll(createContext(manager))).rejects.toThrow(
      /Circular module dependency/,
    );
  });

  it('starts in topological order and stops in reverse', async () => {
    const manager = new ModuleManager();
    const events: string[] = [];

    const moduleA: CyreModule = {
      name: 'A',
      dependencies: ['B'],
      initialize: () => {},
      start: () => { events.push('startA'); },
      stop: () => { events.push('stopA'); },
    };
    const moduleB: CyreModule = {
      name: 'B',
      initialize: () => {},
      start: () => { events.push('startB'); },
      stop: () => { events.push('stopB'); },
    };

    manager.register(moduleA);
    manager.register(moduleB);
    await manager.initializeAll(createContext(manager));
    await manager.startAll();
    await manager.stopAll();

    expect(events).toEqual(['startB', 'startA', 'stopA', 'stopB']);
  });
});

describe('BaseModule', () => {
  it('can be extended and uses default lifecycle hooks', async () => {
    const manager = new ModuleManager();
    const ctx = createContext(manager);
    let initCalled = false;
    let startCalled = false;
    let stopCalled = false;
    let shutdownCalled = false;

    class TestModule extends BaseModule {
      constructor() {
        super('TestModule');
      }
      async initialize(context: EngineContext): Promise<void> {
        initCalled = true;
        this.ctx = context;
      }
      async start(): Promise<void> {
        startCalled = true;
      }
      async stop(): Promise<void> {
        stopCalled = true;
      }
      async shutdown(): Promise<void> {
        shutdownCalled = true;
      }
    }

    const module = new TestModule();
    manager.register(module);
    await manager.initializeAll(ctx);
    expect(initCalled).toBe(true);
    await manager.startAll();
    expect(startCalled).toBe(true);
    await manager.stopAll();
    expect(stopCalled).toBe(true);
    await manager.shutdownAll();
    expect(shutdownCalled).toBe(true);
  });

  it('throws when name is empty', () => {
    expect(() => new (class extends BaseModule {
      constructor() { super(''); }
      initialize() {}
    })()).toThrow(/non-empty string/);
  });
});
