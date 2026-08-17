import { describe, it, expect, vi } from 'vitest';
import { MobilePlatformAdapter } from '../MobilePlatformAdapter.js';
import { MemoryStorageAdapter } from '../MemoryStorageAdapter.js';
import { TouchInputAdapter } from '../TouchInputAdapter.js';

describe('MemoryStorageAdapter', () => {
  it('stores and retrieves values', () => {
    const storage = new MemoryStorageAdapter();
    storage.setItem('key', 'value');
    expect(storage.getItem('key')).toBe('value');
    storage.removeItem('key');
    expect(storage.getItem('key')).toBeNull();
  });

  it('clears all values', () => {
    const storage = new MemoryStorageAdapter();
    storage.setItem('a', '1');
    storage.setItem('b', '2');
    storage.clear();
    expect(storage.getItem('a')).toBeNull();
    expect(storage.getItem('b')).toBeNull();
  });
});

describe('MobilePlatformAdapter', () => {
  it('has correct name and storage', () => {
    const adapter = new MobilePlatformAdapter();
    expect(adapter.name).toBe('mobile');
    expect(adapter.storage).toBeInstanceOf(MemoryStorageAdapter);
  });

  it('handles lifecycle pause/resume', () => {
    const adapter = new MobilePlatformAdapter();
    const pauseSpy = vi.fn();
    const resumeSpy = vi.fn();
    adapter.lifecycle.onPause(pauseSpy);
    adapter.lifecycle.onResume(resumeSpy);
    adapter.simulatePause();
    adapter.simulateResume();
    expect(pauseSpy).toHaveBeenCalledTimes(1);
    expect(resumeSpy).toHaveBeenCalledTimes(1);
  });
});

describe('TouchInputAdapter', () => {
  it('dispatches tap commands', () => {
    const adapter = new TouchInputAdapter();
    const handler = vi.fn();
    adapter.setCommandHandler(handler);
    adapter.tap(10, 20);
    expect(handler).toHaveBeenCalledWith({ type: 'tap', position: { x: 10, y: 20 } });
  });

  it('dispatches swipe commands', () => {
    const adapter = new TouchInputAdapter();
    const handler = vi.fn();
    adapter.setCommandHandler(handler);
    adapter.swipe({ x: 0, y: 0 }, { x: 100, y: 0 });
    expect(handler).toHaveBeenCalledWith({
      type: 'swipe',
      start: { x: 0, y: 0 },
      end: { x: 100, y: 0 },
    });
  });

  it('dispatches pinch commands', () => {
    const adapter = new TouchInputAdapter();
    const handler = vi.fn();
    adapter.setCommandHandler(handler);
    adapter.pinch(1.5);
    expect(handler).toHaveBeenCalledWith({ type: 'pinch', scale: 1.5 });
  });
});
