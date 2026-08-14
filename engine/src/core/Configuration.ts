import type { EngineConfig, LogLevel } from './types.js';

const DEFAULT_CONFIG: EngineConfig = {
  appName: 'CYRE',
  version: '0.1.0',
  logLevel: 'info',
};

export class Configuration {
  private config: EngineConfig;

  constructor(initialConfig: Partial<EngineConfig> = {}) {
    const merged = { ...DEFAULT_CONFIG, ...initialConfig };
    this.validate(merged);
    this.config = Object.freeze({ ...merged });
  }

  getConfig(): Readonly<EngineConfig> {
    return this.config;
  }

  get<K extends keyof EngineConfig>(key: K): EngineConfig[K] {
    return this.config[key];
  }

  private validate(config: EngineConfig): void {
    if (typeof config.appName !== 'string' || config.appName.trim() === '') {
      throw new Error('Configuration validation failed: "appName" must be a non-empty string.');
    }
    if (typeof config.version !== 'string' || config.version.trim() === '') {
      throw new Error('Configuration validation failed: "version" must be a non-empty string.');
    }
    const validLogLevels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    if (!validLogLevels.includes(config.logLevel)) {
      throw new Error(
        `Configuration validation failed: "logLevel" must be one of ${validLogLevels.join(', ')}.`,
      );
    }
  }
}
