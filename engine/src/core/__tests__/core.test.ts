import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Engine } from '../Engine.js';
import { Configuration } from '../Configuration.js';
import { Logger } from '../Logger.js';
import { ErrorHandler, CyreError } from '../ErrorHandler.js';
import { ModuleManager } from '../ModuleManager.js';
import type { CyreModule, EngineContext } from '../types.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Configuration', () => {
  it('merges defaults with provided config', () => {
    const config = new Configuration({ appName: 'TestApp' });
    expect(config.get('appName')).toBe('TestApp');
    expect(config.get('version')).toBe('0.1.0');
    expect(config.get('logLevel')).toBe('info');
  });

  it('throws on invalid logLevel', () => {
    expect(() => new Configuration({ logLevel: 'verbose' as any })).toThrow(/logLevel/);
  });

  it('throws on empty appName', () => {
    expect(() => new Configuration({ appName: '' })).toThrow(/appName/);
  });
});

describe('Logger', () => {
  it('respects log level priority', () => {
    const logger = new Logger('warn');
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    logger.debug('debug msg');
    logger.info('info msg');
    logger.warn('warn msg');
    logger.error('error msg');

    expect(debugSpy).not.toHaveBeenCalled();
    expect(infoSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it('includes error stack when logging an Error', () => {
    const logger = new Logger('error');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = new Error('test error');
    logger.error('error msg', error);
    expect(errorSpy).toHaveBeenCalled();
    const output = errorSpy.mock.calls[0][0];
    expect(output).toContain('test error');
    expect(output).toContain('Stack:');
  });
});

describe('ErrorHandler', () => {
  it('logs CyreError with context', () => {
    const logger = new Logger('error');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const handler = new ErrorHandler(logger);
    const cyreError = new CyreError('custom error', 'TEST_CODE', { foo: 'bar' });
    handler.handle(cyreError);
    expect(errorSpy).toHaveBeenCalled();
    const output = errorSpy.mock.calls[0][0];
    expect(output).toContain('custom error');
    expect(output).toContain('foo');
  });

  it('rethrows if configured', () => {
    const logger = new Logger('error');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const handler = new ErrorHandler(logger, true);
    expect(() => handler.handle(new Error('boom'))).toThrow('boom');
  });
});

describe('ModuleManager', () => {
  let manager: ModuleManager;
  let ctx: EngineContext;

  beforeEach(() => {
    manager = new ModuleManager();
    ctx = {
      config: { appName: 'test', version: '1.0.0', logLevel: 'info' },
      logger: new Logger('info'),
      modules: manager,
      emitError: () => {},
    };
  });

  it('registers and initializes modules in order', async () => {
    const order: string[] = [];
    const moduleA: CyreModule = { name: 'A', async initialize() { order.push('A'); } };
    const moduleB: CyreModule = { name: 'B', async initialize() { order.push('B'); } };
    manager.register(moduleA);
    manager.register(moduleB);
    await manager.initializeAll(ctx);
    expect(order).toEqual(['A', 'B']);
  });

  it('rejects duplicate module names', () => {
    const moduleA: CyreModule = { name: 'A', initialize: () => {} };
    manager.register(moduleA);
    expect(() => manager.register(moduleA)).toThrow(/already registered/);
  });

  it('calls start and stop in correct order', async () => {
    const events: string[] = [];
    const moduleA: CyreModule = {
      name: 'A',
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
    await manager.initializeAll(ctx);
    await manager.startAll();
    await manager.stopAll();
    expect(events).toEqual(['startA', 'startB', 'stopB', 'stopA']);
  });
});

describe('Engine', () => {
  it('manages lifecycle correctly', async () => {
    const engine = new Engine({ appName: 'TestEngine', logLevel: 'error' });
    expect(engine.getState()).toBe('idle');
    await engine.initialize();
    expect(engine.getState()).toBe('initialized');
    await engine.start();
    expect(engine.getState()).toBe('started');
    await engine.stop();
    expect(engine.getState()).toBe('stopped');
    await engine.shutdown();
    expect(engine.getState()).toBe('shutdown');
  });

  it('throws if start before initialize', async () => {
    const engine = new Engine({ logLevel: 'error' });
    await expect(engine.start()).rejects.toThrow(/must be initialized/);
  });

  it('registers a module and calls lifecycle hooks', async () => {
    const engine = new Engine({ logLevel: 'error' });
    let initCalled = false;
    let startCalled = false;
    const module: CyreModule = {
      name: 'TestModule',
      initialize: () => { initCalled = true; },
      start: () => { startCalled = true; },
    };
    engine.registerModule(module);
    await engine.initialize();
    expect(initCalled).toBe(true);
    await engine.start();
    expect(startCalled).toBe(true);
    await engine.stop();
    await engine.shutdown();
  });
});
