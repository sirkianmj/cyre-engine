export type AssetPreviewKind = 'metadata' | 'text' | 'json' | 'binary-summary';

export interface AssetPreviewOptions {
  id: string;
  assetId: string;
  kind: AssetPreviewKind;
  title?: string;
  mimeType?: string;
  data?: Record<string, unknown>;
  generatedAt?: number;
  warnings?: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateWarnings(warnings: string[] | undefined): void {
  if (warnings === undefined) return;
  if (!Array.isArray(warnings)) {
    throw new Error('AssetPreview warnings must be an array.');
  }
  for (const warning of warnings) {
    if (typeof warning !== 'string' || warning.trim() === '') {
      throw new Error('AssetPreview warnings must be non-empty strings.');
    }
  }
}

const VALID_PREVIEW_KINDS: readonly AssetPreviewKind[] = [
  'metadata',
  'text',
  'json',
  'binary-summary',
];

export class AssetPreview {
  readonly id: string;
  readonly assetId: string;
  readonly kind: AssetPreviewKind;
  readonly title?: string;
  readonly mimeType?: string;
  readonly data?: Record<string, unknown>;
  readonly generatedAt: number;
  readonly warnings: readonly string[];

  constructor(options: AssetPreviewOptions) {
    if (!options.id || options.id.trim() === '') {
      throw new Error('AssetPreview id is required.');
    }
    if (!options.assetId || options.assetId.trim() === '') {
      throw new Error('AssetPreview assetId is required.');
    }
    if (!VALID_PREVIEW_KINDS.includes(options.kind)) {
      throw new Error(`Invalid AssetPreview kind "${options.kind}".`);
    }
    if (options.title !== undefined && options.title.trim() === '') {
      throw new Error('AssetPreview title cannot be empty if provided.');
    }
    if (options.mimeType !== undefined && options.mimeType.trim() === '') {
      throw new Error('AssetPreview mimeType cannot be empty if provided.');
    }
    if (options.data !== undefined && !isRecord(options.data)) {
      throw new Error('AssetPreview data must be an object if provided.');
    }
    if (
      options.generatedAt !== undefined &&
      !Number.isFinite(options.generatedAt)
    ) {
      throw new Error('AssetPreview generatedAt must be a finite number if provided.');
    }
    validateWarnings(options.warnings);

    this.id = options.id;
    this.assetId = options.assetId;
    this.kind = options.kind;
    this.title = options.title;
    this.mimeType = options.mimeType;
    this.data = options.data !== undefined
      ? JSON.parse(JSON.stringify(options.data))
      : undefined;
    this.generatedAt = options.generatedAt ?? Date.now();
    this.warnings = Object.freeze([...(options.warnings ?? [])]);
  }

  validate(): void {
    if (!this.id || this.id.trim() === '') {
      throw new Error('AssetPreview id is required.');
    }
    if (!this.assetId || this.assetId.trim() === '') {
      throw new Error('AssetPreview assetId is required.');
    }
    if (!VALID_PREVIEW_KINDS.includes(this.kind)) {
      throw new Error(`Invalid AssetPreview kind "${this.kind}".`);
    }
    validateWarnings([...this.warnings]);
  }

  clone(): AssetPreview {
    return AssetPreview.fromJSON(this.toJSON());
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      assetId: this.assetId,
      kind: this.kind,
      title: this.title,
      mimeType: this.mimeType,
      data: this.data !== undefined
        ? JSON.parse(JSON.stringify(this.data))
        : undefined,
      generatedAt: this.generatedAt,
      warnings: [...this.warnings],
    };
  }

  static fromJSON(data: Record<string, unknown>): AssetPreview {
    return new AssetPreview({
      id: typeof data.id === 'string' ? data.id : '',
      assetId: typeof data.assetId === 'string' ? data.assetId : '',
      kind: typeof data.kind === 'string' ? (data.kind as AssetPreviewKind) : 'metadata',
      title: typeof data.title === 'string' ? data.title : undefined,
      mimeType: typeof data.mimeType === 'string' ? data.mimeType : undefined,
      data: isRecord(data.data) ? data.data : undefined,
      generatedAt: typeof data.generatedAt === 'number' ? data.generatedAt : undefined,
      warnings: Array.isArray(data.warnings) ? (data.warnings as string[]) : undefined,
    });
  }
}
