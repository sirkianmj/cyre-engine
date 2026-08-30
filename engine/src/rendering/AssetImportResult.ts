import { AssetDescriptor } from './AssetDescriptor.js';

export type AssetImportStatus = 'imported' | 'cached';

export interface AssetImportResultOptions {
  id: string;
  status: AssetImportStatus;
  descriptor: AssetDescriptor;
  checksum?: string;
  importedAt?: number;
  warnings?: string[];
  diagnostics?: Record<string, unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateWarnings(warnings: string[] | undefined): void {
  if (warnings === undefined) return;
  if (!Array.isArray(warnings)) {
    throw new Error('AssetImportResult warnings must be an array.');
  }
  for (const warning of warnings) {
    if (typeof warning !== 'string' || warning.trim() === '') {
      throw new Error('AssetImportResult warnings must be non-empty strings.');
    }
  }
}

export class AssetImportResult {
  readonly id: string;
  readonly status: AssetImportStatus;
  readonly descriptor: AssetDescriptor;
  readonly checksum?: string;
  readonly importedAt: number;
  readonly warnings: readonly string[];
  readonly diagnostics?: Record<string, unknown>;

  constructor(options: AssetImportResultOptions) {
    if (!options.id || options.id.trim() === '') {
      throw new Error('AssetImportResult id is required.');
    }
    if (!['imported', 'cached'].includes(options.status)) {
      throw new Error(`Invalid asset import status "${options.status}".`);
    }
    options.descriptor.validate();
    validateWarnings(options.warnings);
    if (options.checksum !== undefined && options.checksum.trim() === '') {
      throw new Error('AssetImportResult checksum cannot be empty if provided.');
    }
    if (options.importedAt !== undefined && !Number.isFinite(options.importedAt)) {
      throw new Error('AssetImportResult importedAt must be a finite number if provided.');
    }
    if (options.diagnostics !== undefined && !isRecord(options.diagnostics)) {
      throw new Error('AssetImportResult diagnostics must be an object if provided.');
    }

    this.id = options.id;
    this.status = options.status;
    this.descriptor = options.descriptor.clone();
    this.checksum = options.checksum;
    this.importedAt = options.importedAt ?? Date.now();
    this.warnings = Object.freeze([...(options.warnings ?? [])]);
    this.diagnostics = options.diagnostics !== undefined
      ? JSON.parse(JSON.stringify(options.diagnostics))
      : undefined;
  }

  validate(): void {
    if (!this.id || this.id.trim() === '') {
      throw new Error('AssetImportResult id is required.');
    }
    if (!['imported', 'cached'].includes(this.status)) {
      throw new Error(`Invalid asset import status "${this.status}".`);
    }
    this.descriptor.validate();
    validateWarnings([...this.warnings]);
  }

  clone(): AssetImportResult {
    return AssetImportResult.fromJSON(this.toJSON());
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      status: this.status,
      descriptor: this.descriptor.toJSON(),
      checksum: this.checksum,
      importedAt: this.importedAt,
      warnings: [...this.warnings],
      diagnostics: this.diagnostics !== undefined
        ? JSON.parse(JSON.stringify(this.diagnostics))
        : undefined,
    };
  }

  static fromJSON(data: Record<string, unknown>): AssetImportResult {
    return new AssetImportResult({
      id: typeof data.id === 'string' ? data.id : '',
      status: typeof data.status === 'string' ? (data.status as AssetImportStatus) : 'imported',
      descriptor: AssetDescriptor.fromJSON(isRecord(data.descriptor) ? data.descriptor : {}),
      checksum: typeof data.checksum === 'string' ? data.checksum : undefined,
      importedAt: typeof data.importedAt === 'number' ? data.importedAt : undefined,
      warnings: Array.isArray(data.warnings) ? (data.warnings as string[]) : undefined,
      diagnostics: isRecord(data.diagnostics) ? data.diagnostics : undefined,
    });
  }
}
