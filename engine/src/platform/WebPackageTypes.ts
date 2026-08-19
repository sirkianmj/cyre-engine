export interface WebPackageOptions {
  id: string;
  name: string;
  version: string;
  entryPoint: string;
  assets?: string[];
  settings?: Record<string, unknown>;
  description?: string;
  generatedAt?: number;
}

export interface WebPackageManifest {
  id: string;
  name: string;
  version: string;
  description?: string;
  entryPoint: string;
  assets: readonly string[];
  settings: Record<string, unknown>;
  generatedAt: number;
  checksum: string;
  sizeBytes: number;
}
