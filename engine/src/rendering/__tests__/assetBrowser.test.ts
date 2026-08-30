import { describe, it, expect } from 'vitest';
import { AssetBrowser } from '../AssetBrowser.js';
import { AssetDescriptor } from '../AssetDescriptor.js';
import { AssetManager } from '../AssetManager.js';

function createManager(): AssetManager {
  const manager = new AssetManager();
  manager.register(new AssetDescriptor({
    id: 'tex-floor',
    name: 'Floor Texture',
    type: 'image',
    tags: ['texture', 'floor', 'environment'],
    metadata: { source: 'archive' },
  }));
  manager.register(new AssetDescriptor({
    id: 'tex-wall',
    name: 'Wall Texture',
    type: 'image',
    tags: ['texture', 'wall'],
  }));
  manager.register(new AssetDescriptor({
    id: 'model-server',
    name: 'Server Rack Model',
    type: 'model',
    tags: ['3d', 'server', 'environment'],
  }));
  manager.register(new AssetDescriptor({
    id: 'audio-alert',
    name: 'Security Alert Sound',
    type: 'audio',
    tags: ['sfx', 'alert'],
  }));
  manager.register(new AssetDescriptor({
    id: 'font-ui',
    name: 'UI Font',
    type: 'font',
    tags: ['typography', 'ui'],
  }));
  return manager;
}

describe('AssetBrowser', () => {
  it('queries all assets with default sorting by name', () => {
    const manager = createManager();
    const browser = new AssetBrowser(manager);
    const page = browser.query();
    expect(page.total).toBe(5);
    expect(page.items).toHaveLength(5);
    expect(page.items.map((asset) => asset.name)).toEqual([
      'Floor Texture',
      'Security Alert Sound',
      'Server Rack Model',
      'UI Font',
      'Wall Texture',
    ]);
  });

  it('filters by type', () => {
    const manager = createManager();
    const browser = new AssetBrowser(manager);
    const page = browser.query({ type: 'image' });
    expect(page.total).toBe(2);
    expect(page.items.every((asset) => asset.type === 'image')).toBe(true);
  });

  it('filters by tags with all-match semantics', () => {
    const manager = createManager();
    const browser = new AssetBrowser(manager);
    const page = browser.query({ tags: ['environment'] });
    expect(page.total).toBe(2);
    expect(page.items.map((asset) => asset.id)).toContain('tex-floor');
    expect(page.items.map((asset) => asset.id)).toContain('model-server');

    const multiTagPage = browser.query({ tags: ['texture', 'floor'] });
    expect(multiTagPage.total).toBe(1);
    expect(multiTagPage.items[0].id).toBe('tex-floor');
  });

  it('searches by id, name, tag, and metadata', () => {
    const manager = createManager();
    const browser = new AssetBrowser(manager);

    expect(browser.query({ searchText: 'server' }).total).toBe(1);
    expect(browser.query({ searchText: 'alert' }).total).toBe(1);
    expect(browser.query({ searchText: 'environment' }).total).toBe(2);
    expect(browser.query({ searchText: 'archive' }).total).toBe(1);
    expect(browser.query({ searchText: 'non-existent' }).total).toBe(0);
  });

  it('sorts by id, name, and type in both directions', () => {
    const manager = createManager();
    const browser = new AssetBrowser(manager);

    const byIdAsc = browser.query({ sortBy: 'id', sortDirection: 'asc' });
    expect(byIdAsc.items[0].id).toBe('audio-alert');

    const byIdDesc = browser.query({ sortBy: 'id', sortDirection: 'desc' });
    expect(byIdDesc.items[0].id).toBe('tex-wall');

    const byTypeDesc = browser.query({ sortBy: 'type', sortDirection: 'desc' });
    expect(byTypeDesc.items[0].type).toBe('model');
  });

  it('paginates assets', () => {
    const manager = createManager();
    const browser = new AssetBrowser(manager);

    const page1 = browser.query({ page: 1, pageSize: 2 });
    expect(page1.total).toBe(5);
    expect(page1.items).toHaveLength(2);
    expect(page1.totalPages).toBe(3);

    const page3 = browser.query({ page: 3, pageSize: 2 });
    expect(page3.items).toHaveLength(1);
    expect(page3.page).toBe(3);
  });

  it('lists available types and tags', () => {
    const manager = createManager();
    const browser = new AssetBrowser(manager);
    expect(browser.listAvailableTypes()).toEqual(['audio', 'font', 'image', 'model']);
    expect(browser.listAvailableTags()).toContain('floor');
    expect(browser.listAvailableTags()).toContain('environment');
  });

  it('rejects invalid type, tags, sort, page, and pageSize', () => {
    const manager = createManager();
    const browser = new AssetBrowser(manager);
    expect(() => browser.query({ type: 'invalid' as any })).toThrow(/asset type/);
    expect(() => browser.query({ tags: [''] })).toThrow(/non-empty/);
    expect(() => browser.query({ sortBy: 'invalid' as any })).toThrow(/sort field/);
    expect(() => browser.query({ page: 0 })).toThrow(/positive integer/);
    expect(() => browser.query({ pageSize: 0 })).toThrow(/positive integer/);
  });

  it('does not leak internal assets through query result mutation', () => {
    const manager = createManager();
    const browser = new AssetBrowser(manager);
    const page = browser.query({ type: 'image' });
    page.items[0].name = 'Modified';
    expect(manager.get('tex-floor')!.name).not.toBe('Modified');
    expect(manager.get('tex-floor')!.name).toBe('Floor Texture');
  });

  it('validates browser with no errors', () => {
    const manager = createManager();
    const browser = new AssetBrowser(manager);
    expect(() => browser.validate()).not.toThrow();
  });
});
