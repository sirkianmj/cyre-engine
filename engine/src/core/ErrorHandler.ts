import type { ILogger } from './types.js';

export class CyreError extends Error {
  readonly code: string;
  readonly context?: Record<string, unknown>;

  constructor(message: string, code = 'CYRE_ERROR', context?: Record<string, unknown>) {
    super(message);
    this.name = 'CyreError';
    this.code = code;
    this.context = context;
    Object.setPrototypeOf(this, CyreError.prototype);
  }
}

export class ErrorHandler {
  private logger: ILogger;
  private rethrow: boolean;

  constructor(logger: ILogger, rethrow = false) {
    this.logger = logger;
    this.rethrow = rethrow;
  }

  handle(error: Error | unknown): void {
    if (error instanceof CyreError) {
      this.logger.error(error.message, error, error.context);
    } else if (error instanceof Error) {
      this.logger.error(error.message, error);
    } else {
      this.logger.error('Unknown error occurred', error);
    }

    if (this.rethrow) {
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error(String(error));
      }
    }
  }

  setRethrow(rethrow: boolean): void {
    this.rethrow = rethrow;
  }
}
