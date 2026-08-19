export const BUILD_TARGETS = [
  'web',
  'mobile',
  'desktop',
  'console',
] as const;

export type BuildTarget = (typeof BUILD_TARGETS)[number];

export const BUILD_FLAVORS = [
  'development',
  'testing',
  'staging',
  'production',
] as const;

export type BuildFlavor = (typeof BUILD_FLAVORS)[number];

export function isBuildTarget(value: string): value is BuildTarget {
  return (BUILD_TARGETS as readonly string[]).includes(value);
}

export function isBuildFlavor(value: string): value is BuildFlavor {
  return (BUILD_FLAVORS as readonly string[]).includes(value);
}
