import type { WebPackageOptions } from './WebPackageTypes.js';

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function normalizeAssets(assets: string[] | undefined): string[] {
  if (assets === undefined) return [];
  if (!Array.isArray(assets)) {
    throw new Error('Web package assets must be an array.');
  }

  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const asset of assets) {
    if (typeof asset !== 'string' || asset.trim() === '') {
      throw new Error('Web package assets must contain non-empty strings.');
    }
    const trimmed = asset.trim();
    if (seen.has(trimmed)) {
      throw new Error(`Web package asset "${trimmed}" is duplicated.`);
    }
    seen.add(trimmed);
    normalized.push(trimmed);
  }

  return normalized;
}

export function validatePackageOptions(options: WebPackageOptions): void {
  if (!isRecord(options)) {
    throw new Error('Web package options must be an object.');
  }
  if (!options.id || options.id.trim() === '') {
    throw new Error('WebPackage id is required.');
  }
  if (!options.name || options.name.trim() === '') {
    throw new Error('WebPackage name is required.');
  }
  if (!options.version || options.version.trim() === '') {
    throw new Error('WebPackage version is required.');
  }
  if (!options.entryPoint || options.entryPoint.trim() === '') {
    throw new Error('WebPackage entryPoint is required.');
  }
  if (options.description !== undefined && typeof options.description !== 'string') {
    throw new Error('WebPackage description must be a string if provided.');
  }
  if (options.generatedAt !== undefined && !Number.isFinite(options.generatedAt)) {
    throw new Error('WebPackage generatedAt must be a finite number if provided.');
  }

  normalizeAssets(options.assets);

  if (options.settings !== undefined && !isRecord(options.settings)) {
    throw new Error('WebPackage settings must be an object if provided.');
  }
}
