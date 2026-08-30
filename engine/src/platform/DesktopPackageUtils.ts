import type { DesktopPackageOptions } from './DesktopPackageTypes.js';
import {
  DESKTOP_PLATFORMS,
  isDesktopPlatform,
  type DesktopPlatform,
} from './DesktopPackageTypes.js';

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function normalizePlatforms(
  platforms: DesktopPlatform[] | undefined,
): DesktopPlatform[] {
  if (platforms === undefined) return [...DESKTOP_PLATFORMS];
  if (!Array.isArray(platforms)) {
    throw new Error('Desktop package platforms must be an array.');
  }

  const seen = new Set<DesktopPlatform>();
  const normalized: DesktopPlatform[] = [];

  for (const platform of platforms) {
    if (typeof platform !== 'string' || platform.trim() === '') {
      throw new Error(`Invalid desktop platform "${platform}".`);
    }

    const trimmed = platform.trim();
    if (!isDesktopPlatform(trimmed)) {
      throw new Error(`Invalid desktop platform "${platform}".`);
    }
    if (seen.has(trimmed)) {
      throw new Error(`Desktop platform "${trimmed}" is duplicated.`);
    }

    seen.add(trimmed);
    normalized.push(trimmed);
  }

  return normalized;
}

export function normalizeFiles(files: string[] | undefined): string[] {
  if (files === undefined) return [];
  if (!Array.isArray(files)) {
    throw new Error('Desktop package files must be an array.');
  }

  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const file of files) {
    if (typeof file !== 'string' || file.trim() === '') {
      throw new Error('Desktop package files must contain non-empty strings.');
    }
    const trimmed = file.trim();
    if (seen.has(trimmed)) {
      throw new Error(`Desktop package file "${trimmed}" is duplicated.`);
    }
    seen.add(trimmed);
    normalized.push(trimmed);
  }

  return normalized;
}

export function validateDesktopPackageOptions(
  options: DesktopPackageOptions,
): void {
  if (!isRecord(options)) {
    throw new Error('Desktop package options must be an object.');
  }
  if (!options.id || options.id.trim() === '') {
    throw new Error('DesktopPackage id is required.');
  }
  if (!options.name || options.name.trim() === '') {
    throw new Error('DesktopPackage name is required.');
  }
  if (!options.version || options.version.trim() === '') {
    throw new Error('DesktopPackage version is required.');
  }
  if (!options.executableName || options.executableName.trim() === '') {
    throw new Error('DesktopPackage executableName is required.');
  }
  if (options.description !== undefined && typeof options.description !== 'string') {
    throw new Error('DesktopPackage description must be a string if provided.');
  }
  if (options.generatedAt !== undefined && !Number.isFinite(options.generatedAt)) {
    throw new Error('DesktopPackage generatedAt must be a finite number if provided.');
  }
  if (options.settings !== undefined && !isRecord(options.settings)) {
    throw new Error('DesktopPackage settings must be an object if provided.');
  }

  normalizePlatforms(options.platforms);
  normalizeFiles(options.files);
}
