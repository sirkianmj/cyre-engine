export const MOBILE_PLATFORMS = [
  'ios',
  'android',
] as const;

export type MobilePlatform = (typeof MOBILE_PLATFORMS)[number];

export function isMobilePlatform(value: string): value is MobilePlatform {
  return (MOBILE_PLATFORMS as readonly string[]).includes(value);
}

export interface MobilePackageOptions {
  id: string;
  name: string;
  version: string;
  bundleId: string;
  platforms?: MobilePlatform[];
  files?: string[];
  settings?: Record<string, unknown>;
  description?: string;
  generatedAt?: number;
}

export interface MobilePackageManifest {
  id: string;
  name: string;
  version: string;
  description?: string;
  bundleId: string;
  platforms: readonly MobilePlatform[];
  files: readonly string[];
  settings: Record<string, unknown>;
  generatedAt: number;
  checksum: string;
  sizeBytes: number;
}
