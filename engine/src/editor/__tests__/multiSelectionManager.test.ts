import { describe, it, expect } from 'vitest';
import { MultiSelectionManager } from '../MultiSelectionManager.js';

function createManager(): MultiSelectionManager {
  const manager = new MultiSelectionManager();
  manager.add({ id: 'host-1', type: 'host', name: 'Web Server' });
  manager.add({ id: 'host-2', type: 'host', name: 'Database Server' });
  manager.add({ id: 'firewall-1', type: 'firewall', name: 'Edge Firewall' });
  return manager;
}

describe('MultiSelectionManager', () => {
  it('starts empty', () => {
    const manager = new MultiSelectionManager();
    expect(manager.isEmpty()).toBe(true);
    expect(manager.getSelectionCount()).toBe(0);
  });

  it('selects a single item and clears previous selection', () => {
    const manager = createManager();
    manager.select({ id: 'host-1', type: 'host' });
    expect(manager.has('host-1')).toBe(true);
    expect(manager.getSelectionCount()).toBe(1);
  });

  it('selects multiple items and replaces previous selection', () => {
    const manager = createManager();
    manager.selectMany([
      { id: 'host-1', type: 'host' },
      { id: 'firewall-1', type: 'firewall' },
    ]);
    expect(manager.getSelectionCount()).toBe(2);
    expect(manager.has('host-2')).toBe(false);
  });

  it('adds items without clearing existing selection', () => {
    const manager = new MultiSelectionManager();
    manager.add({ id: 'host-1', type: 'host' });
    manager.add({ id: 'firewall-1', type: 'firewall' });
    expect(manager.getSelectionCount()).toBe(2);
  });

  it('toggles selection', () => {
    const manager = new MultiSelectionManager();
    const item = { id: 'host-1', type: 'host' };
    manager.toggle(item);
    expect(manager.has('host-1')).toBe(true);

    manager.toggle(item);
    expect(manager.has('host-1')).toBe(false);
  });

  it('removes an item from selection', () => {
    const manager = createManager();
    manager.remove('host-1');
    expect(manager.has('host-1')).toBe(false);
    expect(manager.getSelectionCount()).toBe(2);
  });

  it('clears all selections', () => {
    const manager = createManager();
    manager.clear();
    expect(manager.isEmpty()).toBe(true);
    expect(manager.getSelectionCount()).toBe(0);
  });

  it('returns selected ids and items', () => {
    const manager = createManager();
    expect(manager.getSelectedIds()).toEqual(['host-1', 'host-2', 'firewall-1']);
    expect(manager.getSelectedItems().map((item) => item.id)).toEqual([
      'host-1',
      'host-2',
      'firewall-1',
    ]);
  });

  it('detects multi-selection', () => {
    const manager = new MultiSelectionManager();
    expect(manager.isMultiSelection()).toBe(false);

    manager.add({ id: 'host-1', type: 'host' });
    expect(manager.isMultiSelection()).toBe(false);

    manager.add({ id: 'host-2', type: 'host' });
    expect(manager.isMultiSelection()).toBe(true);
  });

  it('filters selected items by type', () => {
    const manager = createManager();
    expect(manager.filterByType('host').map((item) => item.id)).toEqual(['host-1', 'host-2']);
    expect(manager.filterByType('firewall').map((item) => item.id)).toEqual(['firewall-1']);
  });

  it('returns unique selection types sorted alphabetically', () => {
    const manager = createManager();
    expect(manager.getSelectionTypes()).toEqual(['firewall', 'host']);
  });

  it('rejects invalid item id and type', () => {
    const manager = new MultiSelectionManager();
    expect(() => manager.add({ id: '', type: 'host' })).toThrow(/id is required/);
    expect(() => manager.add({ id: 'host-1', type: '   ' })).toThrow(/type is required/);
  });

  it('rejects invalid item id for has and remove', () => {
    const manager = new MultiSelectionManager();
    expect(() => manager.has('')).toThrow(/id is required/);
    expect(() => manager.remove('')).toThrow(/id is required/);
  });

  it('deduplicates repeated ids when adding many', () => {
    const manager = new MultiSelectionManager();
    manager.selectMany([
      { id: 'host-1', type: 'host' },
      { id: 'host-1', type: 'host' },
      { id: 'host-2', type: 'host' },
    ]);
    expect(manager.getSelectionCount()).toBe(2);
    expect(manager.getSelectedIds()).toEqual(['host-1', 'host-2']);
  });

  it('returns selected items as copies', () => {
    const manager = createManager();
    const selected = manager.getSelectedItems();
    selected[0].name = 'Mutated';

    expect(manager.getSelectedItems()[0].name).toBe('Web Server');
  });
});
