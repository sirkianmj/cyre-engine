import { describe, it, expect } from 'vitest';
import {
  CyberEntityPalette,
  CYBER_ENTITY_PALETTE_ITEMS,
} from '../CyberEntityPalette.js';

describe('CyberEntityPalette', () => {
  it('lists default cyber entity palette items', () => {
    const palette = new CyberEntityPalette();
    expect(palette.listItems().length).toBeGreaterThanOrEqual(13);
  });

  it('returns categories in alphabetical order', () => {
    const palette = new CyberEntityPalette();
    expect(palette.listCategories()).toEqual(['host', 'identity', 'network', 'security', 'service']);
  });

  it('retrieves a palette item by id', () => {
    const palette = new CyberEntityPalette();
    expect(palette.getItem('firewall').label).toBe('Firewall');
    expect(palette.getItem('firewall').category).toBe('network');
  });

  it('throws for an unknown palette item', () => {
    const palette = new CyberEntityPalette();
    expect(() => palette.getItem('missing')).toThrow(/does not exist/);
  });

  it('lists palette items by category', () => {
    const palette = new CyberEntityPalette();
    const hostItems = palette.listItemsByCategory('host');
    expect(hostItems.map((item) => item.id)).toEqual(['client', 'host', 'server']);
  });

  it('searches palette items by label and description', () => {
    const palette = new CyberEntityPalette();
    expect(palette.search('firewall').map((item) => item.id)).toEqual(['firewall']);
    expect(palette.search('network').map((item) => item.id)).toContain('network');
  });

  it('creates entity data with deep-copied default properties', () => {
    const palette = new CyberEntityPalette();
    const first = palette.createEntityData('network');
    first.properties.nodes.push('internet');

    const second = palette.createEntityData('network');
    expect(second.properties.nodes).toEqual([]);
  });

  it('merges custom overrides into entity properties', () => {
    const palette = new CyberEntityPalette();
    const data = palette.createEntityData('server', { hostname: 'web01' });
    expect(data.type).toBe('server');
    expect(data.properties.hostname).toBe('web01');
  });

  it('rejects duplicate palette items', () => {
    const customItems = [
      {
        id: 'custom-host',
        label: 'Custom Host',
        category: 'host' as const,
        description: 'A custom host item.',
        defaultProperties: { type: 'host' },
      },
      {
        id: 'custom-host',
        label: 'Duplicate Custom Host',
        category: 'host' as const,
        description: 'Duplicate item.',
        defaultProperties: { type: 'host' },
      },
    ];
    expect(() => new CyberEntityPalette(customItems)).toThrow(/already exists/);
  });

  it('rejects invalid palette items', () => {
    const invalidItems = [
      {
        id: '',
        label: 'Bad Item',
        category: 'host' as const,
        description: 'Missing id.',
        defaultProperties: {},
      },
    ];
    expect(() => new CyberEntityPalette(invalidItems)).toThrow(/id is required/);
  });
});
