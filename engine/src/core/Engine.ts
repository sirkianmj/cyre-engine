import { Configuration } from './Configuration.js';
import { Logger } from './Logger.js';
import { ErrorHandler } from './ErrorHandler.js';
import { ModuleManager } from './ModuleManager.js';
import type { CyreModule, EngineConfig, EngineContext, ILogger } from './types.js';

export class Engine {
  private config: Configuration;
  private logger: ILogger;
  private errorHandler: ErrorHandler;
  private moduleManager: ModuleManager;
  private state: 'idle' | 'initialized' | 'started' | 'stopped' | 'shutdown' = 'idle';

  constructor(initialConfig: Partial<EngineConfig> = {}) {
    this.config = new Configuration(initialConfig);
    this.logger = new Logger(this.config.get('logLevel'));
    this.errorHandler = new ErrorHandler(this.logger, false);
    this.moduleManager = new ModuleManager();
  }

  getLogger(): ILogger {
    return this.logger;
  }

  getConfig(): Readonly<EngineConfig> {
    return this.config.getConfig();
  }

  getModuleManager(): ModuleManager {
    return this.moduleManager;
  }

  registerModule(module: CyreModule): void {
    if (this.state !== 'idle') {
      throw new Error('Cannot register modules after engine has been initialized.');
    }
    this.moduleManager.register(module);
  }

  private buildContext(): EngineContext {
    return {
      config: this.config.getConfig(),
      logger: this.logger,
      modules: this.moduleManager,
      emitError: (error: Error) => this.errorHandler.handle(error),
    };
  }

  async initialize(): Promise<void> {
    if (this.state !== 'idle') {
      throw new Error(`Cannot initialize engine in state "${this.state}".`);
    }
    const ctx = this.buildContext();
    try {
      await this.moduleManager.initializeAll(ctx);
      this.state = 'initialized';
      this.logger.info(`Engine initialized (${this.config.get('appName')} v${this.config.get('version')})`);
    } catch (error) {
      this.errorHandler.handle(error);
      throw error;
    }
  }

  async start(): Promise<void> {
    if (this.state !== 'initialized') {
      throw new Error('Engine must be initialized before start.');
    }
    try {
      await this.moduleManager.startAll();
      this.state = 'started';
      this.logger.info('Engine started');
    } catch (error) {
      this.errorHandler.handle(error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (this.state !== 'started') {
      throw new Error('Engine must be started before stop.');
    }
    try {
      await this.moduleManager.stopAll();
      this.state = 'stopped';
      this.logger.info('Engine stopped');
    } catch (error) {
      this.errorHandler.handle(error);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    try {
      await this.moduleManager.shutdownAll();
      this.state = 'shutdown';
      this.logger.info('Engine shutdown complete');
    } catch (error) {
      this.errorHandler.handle(error);
      throw error;
    }
  }

  getState(): string {
    return this.state;
  }
}
