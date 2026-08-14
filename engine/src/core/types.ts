export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface EngineConfig {
  appName: string;
  version: string;
  logLevel: LogLevel;
}

export interface ILogger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, error?: Error | unknown, context?: Record<string, unknown>): void;
  setLevel(level: LogLevel): void;
  getLevel(): LogLevel;
}

import type { ModuleManager } from './ModuleManager.js';

export interface EngineContext {
  config: EngineConfig;
  logger: ILogger;
  modules: ModuleManager;
  emitError(error: Error): void;
}

export interface CyreModule {
  readonly name: string;
  initialize(ctx: EngineContext): Promise<void> | void;
  start?(): Promise<void> | void;
  stop?(): Promise<void> | void;
  shutdown?(): Promise<void> | void;
}
