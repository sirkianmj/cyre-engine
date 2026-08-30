import { describe, it, expect } from 'vitest';
import { computeContentChecksum, inferFileExtension, uniqueTags } from '../AssetImportUtils.js';
import { resolveAssetType } from '../AssetTypeResolver.js';
import { AssetImportRequest } from '../AssetImportRequest.js';
import { AssetImporter } from '../AssetImporter.js';
import { AssetImportCache, createAssetImportCacheKey } from '../AssetImportCache.js';
import { AssetImportPipeline } from '../AssetImportPipeline.js';
import { AssetImportResult } from '../AssetImportResult.js';
import { AssetDescriptor } from '../AssetDescriptor.js';

describe('AssetImportUtils', () => {
  it('computes deterministic checksums', () => {
    expect(computeContentChecksum('hello')).toBe(computeContentChecksum('hello'));
    expect(computeContentChecksum('hello')).not.toBe(computeContentChecksum('world'));
  });

  it('computes checksum for bytes and empty content', () => {
    const bytes = new Uint8Array([1, 2, 3]);
    expect(computeContentChecksum(bytes)).toBe(computeContentChecksum(new Uint8Array([1, 2, 3])));
    expect(computeContentChecksum(undefined)).toMatch(/^fnv1a-/);
  });

  it('makes tags unique and trims them', () => {
    expect(uniqueTags([' a ', 'b', 'a', ''])).toEqual(['a', 'b']);
  });

  it('infers file extension', () => {
    expect(inferFileExtension('/assets/model.glb')).toBe('glb');
    expect(inferFileExtension('C:\\assets\\music.MP3')).toBe('mp3');
    expect(inferFileExtension('no-extension')).toBeUndefined();
    expect(inferFileExtension(undefined)).toBeUndefined();
  });
});

describe('AssetTypeResolver', () => {
  it('prefers explicit non-other requested type', () => {
    expect(resolveAssetType({ requestedType: 'image', sourcePath: 'x.glb' })).toBe('image');
  });

  it('resolves from MIME type', () => {
    expect(resolveAssetType({ requestedType: 'other', mimeType: 'model/gltf-binary' })).toBe('model');
  });

  it('resolves from file extension', () => {
    expect(resolveAssetType({ requestedType: 'other', sourcePath: 'sound.wav' })).toBe('audio');
    expect(resolveAssetType({ requestedType: 'other', sourcePath: 'font.ttf' })).toBe('font');
  });

  it('falls back to other', () => {
    expect(resolveAssetType({ requestedType: 'other' })).toBe('other');
    expect(resolveAssetType({ requestedType: 'other', sourcePath: 'file.unknown' })).toBe('other');
  });
});

describe('AssetImportRequest', () => {
  it('creates and validates a request', () => {
    const request = new AssetImportRequest({
      id: 'tex-1',
      name: 'Floor Texture',
      type: 'texture',
      sourcePath: 'assets/floor.png',
      mimeType: 'image/png',
    });
    expect(request.getContentSizeBytes()).toBe(0);
    expect(request.validate()).toBeUndefined();
  });

  it('computes byte size for string and binary content', () => {
    const textRequest = new AssetImportRequest({
      id: 'data-1',
      name: 'JSON Data',
      type: 'data',
      content: '{"x":1}',
    });
    expect(textRequest.getContentSizeBytes()).toBe(new TextEncoder().encode('{"x":1}').byteLength);

    const bytes = Uint8Array.from([1, 2, 3]);
    const byteRequest = new AssetImportRequest({
      id: 'bytes-1',
      name: 'Binary',
      type: 'other',
      content: bytes,
    });
    expect(byteRequest.getContentSizeBytes()).toBe(3);
    expect(byteRequest.getContentAsUint8Array()).toEqual(bytes);
  });

  it('clones Uint8Array content', () => {
    const bytes = Uint8Array.from([1, 2, 3]);
    const request = new AssetImportRequest({
      id: 'bytes',
      name: 'Binary',
      type: 'other',
      content: bytes,
    });
    bytes[0] = 99;
    expect(request.getContentAsUint8Array()[0]).toBe(1);
  });

  it('rejects invalid request data', () => {
    expect(() => new AssetImportRequest({ id: '', name: 'x', type: 'image' })).toThrow(/id/);
    expect(() => new AssetImportRequest({ id: 'x', name: 'x', type: 'invalid' as any })).toThrow(/type/);
    expect(() => new AssetImportRequest({ id: 'x', name: 'x', type: 'image', sourcePath: '' })).toThrow(/sourcePath/);
  });

  it('round-trips through JSON with bytes', () => {
    const original = new AssetImportRequest({
      id: 'bytes-json',
      name: 'Binary Asset',
      type: 'other',
      content: Uint8Array.from([1, 2, 3]),
      sourcePath: 'file.bin',
      tags: ['binary'],
    });
    const restored = AssetImportRequest.fromJSON(original.toJSON());
    expect(restored.id).toBe('bytes-json');
    expect(restored.getContentSizeBytes()).toBe(3);
    expect(restored.getContentAsUint8Array()).toEqual(Uint8Array.from([1, 2, 3]));
  });
});

describe('AssetImportResult', () => {
  it('creates with descriptor and validates', () => {
    const descriptor = new AssetDescriptor({
      id: 'tex',
      name: 'Texture',
      type: 'image',
      uri: 'assets://textures/floor.png',
      tags: ['floor', 'image'],
    });
    const result = new AssetImportResult({
      id: 'tex',
      status: 'imported',
      descriptor,
      checksum: 'abc',
      warnings: ['warning'],
    });
    expect(result.status).toBe('imported');
    expect(result.warnings).toEqual(['warning']);
    expect(() => result.validate()).not.toThrow();
  });

  it('round-trips through JSON', () => {
    const descriptor = new AssetDescriptor({
      id: 'tex',
      name: 'Texture',
      type: 'image',
      uri: 'assets://textures/floor.png',
      tags: ['floor'],
    });
    const result = new AssetImportResult({
      id: 'tex',
      status: 'imported',
      descriptor,
      checksum: 'abc',
      warnings: ['warning'],
    });
    const restored = AssetImportResult.fromJSON(result.toJSON());
    expect(restored.id).toBe('tex');
    expect(restored.status).toBe('imported');
    expect(restored.descriptor.id).toBe('tex');
    expect(restored.warnings).toEqual(['warning']);
  });
});

describe('AssetImporter', () => {
  it('imports an asset and creates descriptor with inferred type', () => {
    const importer = new AssetImporter();
    const request = new AssetImportRequest({
      id: 'floor',
      name: 'Floor Texture',
      type: 'other',
      sourcePath: 'assets/floor.png',
      mimeType: 'image/png',
      content: 'not-real-image-data',
      tags: ['floor'],
    });

    const result = importer.importAsset(request);
    expect(result.status).toBe('imported');
    expect(result.descriptor.type).toBe('image');
    expect(result.descriptor.tags).toContain('floor');
    expect(result.descriptor.tags).toContain('type:image');
    expect(result.descriptor.metadata!.importSource).toMatchObject({
      sizeBytes: 'not-real-image-data'.length,
      mimeType: 'image/png',
      sourceExtension: 'png',
      encoding: 'utf8',
    });
    expect(result.checksum).toMatch(/^fnv1a-/);
  });

  it('warns when type is resolved from source', () => {
    const importer = new AssetImporter();
    const request = new AssetImportRequest({
      id: 'model',
      name: 'Model',
      type: 'other',
      sourcePath: 'assets/model.glb',
      content: Uint8Array.from([1, 2, 3]),
    });
    const result = importer.importAsset(request);
    expect(result.warnings.some((warning) => warning.includes('resolved to'))).toBe(true);
  });

  it('warns when source path has no extension', () => {
    const importer = new AssetImporter();
    const request = new AssetImportRequest({
      id: 'raw',
      name: 'Raw Data',
      type: 'data',
      sourcePath: 'no-extension',
      content: 'raw',
    });
    const result = importer.importAsset(request);
    expect(result.warnings.some((warning) => warning.includes('no usable file extension'))).toBe(true);
  });
});

describe('AssetImportCache', () => {
  it('stores and retrieves results', () => {
    const cache = new AssetImportCache();
    const descriptor = new AssetDescriptor({ id: 'a', name: 'A', type: 'data' });
    const result = new AssetImportResult({ id: 'a', status: 'imported', descriptor });
    const key = 'key';
    cache.set(key, result);
    expect(cache.has(key)).toBe(true);
    expect(cache.size()).toBe(1);
    expect(cache.get(key)!.id).toBe('a');
  });

  it('clones stored results', () => {
    const cache = new AssetImportCache();
    const descriptor = new AssetDescriptor({
      id: 'a',
      name: 'A',
      type: 'data',
      metadata: { nested: { value: 1 } },
    });
    const result = new AssetImportResult({ id: 'a', status: 'imported', descriptor });
    cache.set('key', result);
    result.descriptor.metadata!.nested!.value = 99;
    const cached = cache.get('key')!;
    expect(cached.descriptor.metadata!.nested!.value).toBe(1);
  });

  it('creates stable cache keys', () => {
    const request = new AssetImportRequest({
      id: 'a',
      name: 'A',
      type: 'data',
      sourcePath: 'file.json',
      version: '1.0.0',
      content: '{"x":1}',
    });
    const key1 = createAssetImportCacheKey(request);
    const key2 = createAssetImportCacheKey(request);
    expect(key1).toBe(key2);
  });
});

describe('AssetImportPipeline', () => {
  it('imports and caches duplicate asset requests', () => {
    const pipeline = new AssetImportPipeline();
    const request = new AssetImportRequest({
      id: 'scene',
      name: 'Scenario',
      type: 'scenario',
      sourcePath: 'mission.cyre',
      content: 'scenario data',
      version: '1.0.0',
    });

    const first = pipeline.importAsset(request);
    expect(first.status).toBe('imported');
    expect(pipeline.getCacheSize()).toBe(1);

    const second = pipeline.importAsset(request.clone());
    expect(second.status).toBe('cached');
    expect(second.diagnostics).toMatchObject({ cacheHit: true });
  });

  it('imports same id again when content changes', () => {
    const pipeline = new AssetImportPipeline();
    const firstRequest = new AssetImportRequest({
      id: 'data',
      name: 'Data',
      type: 'data',
      content: 'one',
    });
    const secondRequest = new AssetImportRequest({
      id: 'data',
      name: 'Data',
      type: 'data',
      content: 'two',
    });

    expect(pipeline.importAsset(firstRequest).status).toBe('imported');
    expect(pipeline.importAsset(secondRequest).status).toBe('imported');
    expect(pipeline.getCacheSize()).toBe(2);
  });

  it('imports all requests and clears cache', () => {
    const pipeline = new AssetImportPipeline();
    const requests = [
      new AssetImportRequest({ id: 'a', name: 'A', type: 'image', sourcePath: 'a.png', content: 'a' }),
      new AssetImportRequest({ id: 'b', name: 'B', type: 'audio', sourcePath: 'b.wav', content: 'b' }),
    ];

    const results = pipeline.importAll(requests);
    expect(results).toHaveLength(2);
    expect(pipeline.getCacheSize()).toBe(2);

    pipeline.clearCache();
    expect(pipeline.getCacheSize()).toBe(0);
    expect(pipeline.listCachedResults()).toHaveLength(0);
    expect(() => pipeline.validate()).not.toThrow();
  });
});
