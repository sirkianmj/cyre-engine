export const DESKTOP_PLATFORMS = [
  'windows',
  'macos',
  'linux',
] as const;

export type DesktopPlatform = (typeof DESKTOP_PLATFORMS)[number];

export function isDesktopPlatform(value: string): value is DesktopPlatform {
  return (DESKTOP_PLATFORMS as readonly string[]).includes(value);
}

export interface DesktopPackageOptions {
  id: string;
  name: string;
  version: string;
  executableName: string;
  platforms?: DesktopPlatform[];
  files?: string[];
  settings?: Record<string, unknown>;
  description?: string;
  generatedAt?: number;
}

export interface DesktopPackageManifest {
  id: string;
  name: string;
  version: string;
  description?: string;
  executableName: string;
  platforms: readonly DesktopPlatform[];
  files: readonly string[];
  settings: Record<string, unknown>;
  generatedAt: number;
  checksum: string;
  sizeBytes: number;
}
