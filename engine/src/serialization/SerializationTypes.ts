export interface SerializedMetadata {
  createdAt: string;
  modifiedAt?: string;
  engineVersion?: string;
  name?: string;
  [key: string]: unknown;
}

export interface SerializedEnvelope<TData = unknown> {
  schema: string;
  version: number;
  id: string;
  metadata: SerializedMetadata;
  data: TData;
}

export interface SchemaDefinition<TData = unknown> {
  name: string;
  latestVersion: number;
  validate(data: unknown): string[];
  migrate?(oldVersion: number, data: unknown): { version: number; data: unknown };
}
