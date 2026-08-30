import { describe, it, expect } from 'vitest';
import { AssetPreview } from '../AssetPreview.js';
import { AssetPreviewGenerator } from '../AssetPreviewGenerator.js';
import { AssetDescriptor } from '../AssetDescriptor.js';
import { AssetManager } from '../AssetManager.js';

function createManager(): AssetManager {
  const manager = new AssetManager();

  manager.register(new AssetDescriptor({
    id: 'image-floor',
    name: 'Floor Image',
    type: 'image',
    uri: 'assets://images/floor.png',
    mimeType: 'image/png',
    metadata: {
      width: 1024,
      height: 1024,
      colorSpace: 'srgb',
      format: 'png',
    },
  }));

  manager.register(new AssetDescriptor({
    id: 'model-server',
    name: 'Server Model',
    type: 'model',
    uri: 'assets://models/server.glb',
    mimeType: 'model/gltf-binary',
    metadata: {
      geometryType: 'box',
      vertexCount: 420,
      triangleCount: 840,
    },
  }));

  manager.register(new AssetDescriptor({
    id: 'audio-alert',
    name: 'Alert Sound',
    type: 'audio',
    mimeType: 'audio/wav',
    metadata: {
      duration: 2.4,
      sampleRate: 44100,
      channels: 2,
      codec: 'pcm',
    },
  }));

  manager.register(new AssetDescriptor({
    id: 'data-config',
    name: 'Config Data',
    type: 'data',
    mimeType: 'application/json',
    metadata: {
      value: { difficulty: 'advanced', target: 'finance' },
    },
  }));

  manager.register(new AssetDescriptor({
    id: 'font-ui',
    name: 'UI Font',
    type: 'font',
    mimeType: 'font/ttf',
    metadata: {
      family: 'Inter',
      weight: 600,
      style: 'sans',
    },
  }));

  manager.register(new AssetDescriptor({
    id: 'scenario-mission',
    name: 'Mission Scenario',
    type: 'scenario',
    metadata: {
      organizationSize: 'medium',
      attackPath: ['phishing', 'credential-access', 'database'],
      objectives: 3,
      difficulty: 'advanced',
    },
  }));

  manager.register(new AssetDescriptor({
    id: 'other-empty',
    name: 'Other Asset',
    type: 'other',
  }));

  return manager;
}

describe('AssetPreview', () => {
  it('creates a valid preview', () => {
    const preview = new AssetPreview({
      id: 'preview-1',
      assetId: 'asset-1',
      kind: 'metadata',
      title: 'Asset Preview',
      data: { type: 'image' },
      warnings: ['test warning'],
    });
    expect(preview.assetId).toBe('asset-1');
    expect(preview.kind).toBe('metadata');
    expect(preview.data).toEqual({ type: 'image' });
    expect(() => preview.validate()).not.toThrow();
  });

  it('rejects invalid preview data', () => {
    expect(() => new AssetPreview({ id: '', assetId: 'a', kind: 'metadata' })).toThrow(/id/);
    expect(() => new AssetPreview({ id: 'p', assetId: '', kind: 'metadata' })).toThrow(/assetId/);
    expect(
      () => new AssetPreview({ id: 'p', assetId: 'a', kind: 'invalid' as any }),
    ).toThrow(/kind/);
    expect(
      () => new AssetPreview({ id: 'p', assetId: 'a', kind: 'metadata', data: [] as any }),
    ).toThrow(/data/);
  });

  it('clones and round-trips through JSON', () => {
    const original = new AssetPreview({
      id: 'p',
      assetId: 'a',
      kind: 'json',
      data: { nested: { value: 1 } },
    });
    const clone = original.clone();
    clone.data!.nested!.value = 99;
    expect(original.data!.nested!.value).toBe(1);

    const restored = AssetPreview.fromJSON(original.toJSON());
    expect(restored.id).toBe('p');
    expect(restored.kind).toBe('json');
    expect(restored.data).toEqual({ nested: { value: 1 } });
  });
});

describe('AssetPreviewGenerator', () => {
  it('creates metadata preview for image asset', () => {
    const manager = createManager();
    const generator = new AssetPreviewGenerator(manager);
    const preview = generator.preview('image-floor');

    expect(preview.assetId).toBe('image-floor');
    expect(preview.kind).toBe('metadata');
    expect(preview.title).toBe('Image Preview');
    expect(preview.data).toMatchObject({
      type: 'image',
      width: 1024,
      height: 1024,
      colorSpace: 'srgb',
      format: 'png',
      tags: expect.any(Array),
    });
  });

  it('creates metadata preview for model and audio assets', () => {
    const manager = createManager();
    const generator = new AssetPreviewGenerator(manager);

    const modelPreview = generator.preview('model-server');
    expect(modelPreview.data).toMatchObject({
      geometryType: 'box',
      vertexCount: 420,
      triangleCount: 840,
    });

    const audioPreview = generator.preview('audio-alert');
    expect(audioPreview.data).toMatchObject({
      duration: 2.4,
      sampleRate: 44100,
      channels: 2,
      codec: 'pcm',
    });
  });

  it('creates JSON preview for data asset with metadata value object', () => {
    const manager = createManager();
    const generator = new AssetPreviewGenerator(manager);
    const preview = generator.preview('data-config');

    expect(preview.kind).toBe('json');
    expect(preview.data).toEqual({
      difficulty: 'advanced',
      target: 'finance',
    });
  });

  it('creates generic metadata preview for asset without specialized metadata', () => {
    const manager = createManager();
    const generator = new AssetPreviewGenerator(manager);
    const preview = generator.preview('other-empty');

    expect(preview.kind).toBe('metadata');
    expect(preview.data).toMatchObject({
      type: 'other',
      tags: expect.any(Array),
    });
    expect(preview.warnings.some((warning) => warning.includes('No specialized preview metadata'))).toBe(true);
  });

  it('creates scenario preview with known metadata', () => {
    const manager = createManager();
    const generator = new AssetPreviewGenerator(manager);
    const preview = generator.preview('scenario-mission');

    expect(preview.kind).toBe('metadata');
    expect(preview.data).toMatchObject({
      organizationSize: 'medium',
      attackPath: ['phishing', 'credential-access', 'database'],
      objectives: 3,
      difficulty: 'advanced',
    });
  });

  it('creates previews for all registered assets', () => {
    const manager = createManager();
    const generator = new AssetPreviewGenerator(manager);
    const previews = generator.previewAll();
    expect(previews).toHaveLength(7);
    expect(previews.every((preview) => preview.assetId.length > 0)).toBe(true);
  });

  it('rejects missing asset id', () => {
    const manager = createManager();
    const generator = new AssetPreviewGenerator(manager);
    expect(() => generator.preview('missing')).toThrow(/does not exist/);
  });

  it('does not leak internal assets through preview mutation', () => {
    const manager = createManager();
    const generator = new AssetPreviewGenerator(manager);
    const preview = generator.preview('image-floor');
    preview.data!.width = 999;
    expect(manager.get('image-floor')!.metadata!.width).toBe(1024);
  });

  it('validates generator with no errors', () => {
    const manager = createManager();
    const generator = new AssetPreviewGenerator(manager);
    expect(() => generator.validate()).not.toThrow();
  });
});
