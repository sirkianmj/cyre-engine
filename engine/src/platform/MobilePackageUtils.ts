import type { MobilePackageOptions } from './MobilePackageTypes.js';
import {
  MOBILE_PLATFORMS,
  isMobilePlatform,
  type MobilePlatform,
} from './MobilePackageTypes.js';

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function normalizePlatforms(
  platforms: MobilePlatform[] | undefined,
): MobilePlatform[] {
  if (platforms === undefined) return [...MOBILE_PLATFORMS];
  if (!Array.isArray(platforms)) {
    throw new Error('Mobile package platforms must be an array.');
  }

  const seen = new Set<MobilePlatform>();
  const normalized: MobilePlatform[] = [];

  for (const platform of platforms) {
    if (typeof platform !== 'string' || platform.trim() === '') {
      throw new Error(`Invalid mobile platform "${platform}".`);
    }

    const trimmed = platform.trim();
    if (!isMobilePlatform(trimmed)) {
      throw new Error(`Invalid mobile platform "${platform}".`);
    }
    if (seen.has(trimmed)) {
      throw new Error(`Mobile platform "${trimmed}" is duplicated.`);
    }

    seen.add(trimmed);
    normalized.push(trimmed);
  }

  return normalized;
}

export function normalizeFiles(files: string[] | undefined): string[] {
  if (files === undefined) return [];
  if (!Array.isArray(files)) {
    throw new Error('Mobile package files must be an array.');
  }

  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const file of files) {
    if (typeof file !== 'string' || file.trim() === '') {
      throw new Error('Mobile package files must contain non-empty strings.');
    }
    const trimmed = file.trim();
    if (seen.has(trimmed)) {
      throw new Error(`Mobile package file "${trimmed}" is duplicated.`);
    }
    seen.add(trimmed);
    normalized.push(trimmed);
  }

  return normalized;
}

export function validateMobilePackageOptions(
  options: MobilePackageOptions,
): void {
  if (!isRecord(options)) {
    throw new Error('Mobile package options must be an object.');
  }
  if (!options.id || options.id.trim() === '') {
    throw new Error('MobilePackage id is required.');
  }
  if (!options.name || options.name.trim() === '') {
    throw new Error('MobilePackage name is required.');
  }
  if (!options.version || options.version.trim() === '') {
    throw new Error('MobilePackage version is required.');
  }
  if (!options.bundleId || options.bundleId.trim() === '') {
    throw new Error('MobilePackage bundleId is required.');
  }
  if (options.description !== undefined && typeof options.description !== 'string') {
    throw new Error('MobilePackage description must be a string if provided.');
  }
  if (options.generatedAt !== undefined && !Number.isFinite(options.generatedAt)) {
    throw new Error('MobilePackage generatedAt must be a finite number if provided.');
  }
  if (options.settings !== undefined && !isRecord(options.settings)) {
    throw new Error('MobilePackage settings must be an object if provided.');
  }

  normalizePlatforms(options.platforms);
  normalizeFiles(options.files);
}
