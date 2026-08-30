import { isAssetType, type AssetType } from './AssetTypes.js';
import { inferFileExtension } from './AssetImportUtils.js';

const EXTENSION_TYPE_MAP: Record<string, AssetType> = {
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  gif: 'image',
  webp: 'image',
  svg: 'image',
  glb: 'model',
  gltf: 'model',
  obj: 'model',
  fbx: 'model',
  wav: 'audio',
  mp3: 'audio',
  ogg: 'audio',
  flac: 'audio',
  ttf: 'font',
  otf: 'font',
  woff: 'font',
  woff2: 'font',
  json: 'data',
  csv: 'data',
  xml: 'data',
  yaml: 'scenario',
  yml: 'scenario',
  cyre: 'scenario',
};

const MIME_TYPE_MAP: Record<string, AssetType> = {
  'image/png': 'image',
  'image/jpeg': 'image',
  'image/gif': 'image',
  'image/webp': 'image',
  'image/svg+xml': 'image',
  'model/gltf-binary': 'model',
  'model/gltf+json': 'model',
  'model/obj': 'model',
  'audio/wav': 'audio',
  'audio/mpeg': 'audio',
  'audio/ogg': 'audio',
  'audio/flac': 'audio',
  'font/ttf': 'font',
  'font/otf': 'font',
  'font/woff': 'font',
  'font/woff2': 'font',
  'application/json': 'data',
  'text/csv': 'data',
  'application/xml': 'data',
  'application/yaml': 'scenario',
  'application/vnd.cyre.scenario': 'scenario',
};

function normalizeMimeType(mimeType?: string): string | undefined {
  if (!mimeType || mimeType.trim() === '') return undefined;
  const normalized = mimeType.trim().toLowerCase().split(';')[0];
  return normalized;
}

export interface AssetTypeResolutionInput {
  requestedType?: AssetType;
  sourcePath?: string;
  mimeType?: string;
}

export function resolveAssetType(input: AssetTypeResolutionInput): AssetType {
  if (input.requestedType !== undefined && input.requestedType !== 'other' && isAssetType(input.requestedType)) {
    return input.requestedType;
  }

  const mimeType = normalizeMimeType(input.mimeType);
  if (mimeType !== undefined && MIME_TYPE_MAP[mimeType] !== undefined) {
    return MIME_TYPE_MAP[mimeType];
  }

  const extension = inferFileExtension(input.sourcePath);
  if (extension !== undefined && EXTENSION_TYPE_MAP[extension] !== undefined) {
    return EXTENSION_TYPE_MAP[extension];
  }

  return input.requestedType ?? 'other';
}
