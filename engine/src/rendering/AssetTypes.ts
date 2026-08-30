export const ASSET_TYPES = [
  'image',
  'model',
  'texture',
  'audio',
  'font',
  'data',
  'scenario',
  'other',
] as const;

export type AssetType = (typeof ASSET_TYPES)[number];

export function isAssetType(value: string): value is AssetType {
  return (ASSET_TYPES as readonly string[]).includes(value);
}
