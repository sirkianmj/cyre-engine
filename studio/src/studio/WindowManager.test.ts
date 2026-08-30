import { beforeEach, describe, expect, it, vi } from 'vitest';

import { WindowManager } from './WindowManager';

const BOUNDS = { width: 1200, height: 800 };

function createManager(): WindowManager {
  return new WindowManager({ bounds: BOUNDS });
}

describe('WindowManager', () => {
  let manager: WindowManager;

  beforeEach(() => {
    manager = createManager();
    manager.resetLayout();
  });

  it('opens a window with a resolved title and default geometry', () => {
    const opened = manager.open('telemetry', { title: 'Telemetry' });

    expect(opened.kind).toBe('telemetry');
    expect(opened.title).toBe('Telemetry');
    expect(opened.width).toBeGreaterThan(0);
    expect(opened.height).toBeGreaterThan(0);
    expect(opened.focused).toBe(true);
    expect(manager.count()).toBe(1);
  });

  it('resolves titles through the title resolver', () => {
    const resolved = new WindowManager({
      bounds: BOUNDS,
      titleFor: (kind) => `Resolved ${kind}`,
    });
    resolved.resetLayout();

    expect(resolved.open('research').title).toBe('Resolved research');
  });

  it('treats window kinds as singletons', () => {
    const first = manager.open('telemetry', { title: 'Telemetry' });
    const second = manager.open('telemetry', { title: 'Telemetry' });

    expect(second.id).toBe(first.id);
    expect(manager.count()).toBe(1);
  });

  it('closes windows and reassigns focus to the top-most remaining window', () => {
    manager.open('telemetry');
    const research = manager.open('research');

    manager.close(research.id);

    expect(manager.count()).toBe(1);
    expect(manager.getFocused()?.kind).toBe('telemetry');
  });

  it('tracks focus and z-order across windows', () => {
    const first = manager.open('telemetry');
    const second = manager.open('research');

    expect(manager.getFocused()?.id).toBe(second.id);

    manager.focus(first.id);

    expect(manager.getFocused()?.id).toBe(first.id);
    expect(manager.list().at(-1)?.id).toBe(first.id);
  });

  it('minimizes and restores windows, removing them from the desktop', () => {
    const opened = manager.open('telemetry');
    manager.minimize(opened.id);

    expect(manager.get(opened.id)?.minimized).toBe(true);
    expect(manager.getFocused()).toBeNull();

    manager.restore(opened.id);

    expect(manager.get(opened.id)?.minimized).toBe(false);
    expect(manager.getFocused()?.id).toBe(opened.id);
  });

  it('maximizes to the full desktop and restores the previous rect', () => {
    const opened = manager.open('telemetry', { rect: { x: 40, y: 40, width: 500, height: 400 } });

    manager.toggleMaximize(opened.id);
    const maximized = manager.get(opened.id);
    expect(maximized?.maximized).toBe(true);
    expect(maximized?.width).toBe(BOUNDS.width);
    expect(maximized?.height).toBe(BOUNDS.height);

    manager.toggleMaximize(opened.id);
    const restored = manager.get(opened.id);
    expect(restored?.maximized).toBe(false);
    expect(restored?.width).toBe(500);
    expect(restored?.height).toBe(400);
  });

  it('moves windows and keeps the whole frame on the desktop', () => {
    const opened = manager.open('telemetry', { rect: { x: 100, y: 100, width: 400, height: 300 } });

    manager.move(opened.id, 300, 200);
    expect(manager.get(opened.id)).toMatchObject({ x: 300, y: 200 });

    // A window that hangs past the viewport edge cannot be brought back, so
    // the frame — resize handles included — must stay fully reachable.
    manager.move(opened.id, -5000, -5000);
    const topLeft = manager.get(opened.id);
    expect(topLeft).toMatchObject({ x: 0, y: 0 });

    manager.move(opened.id, 5000, 5000);
    const bottomRight = manager.get(opened.id);
    expect(bottomRight?.x).toBe(BOUNDS.width - 400);
    expect(bottomRight?.y).toBe(BOUNDS.height - 300);
    expect((bottomRight?.x ?? 0) + (bottomRight?.width ?? 0)).toBeLessThanOrEqual(BOUNDS.width);
    expect((bottomRight?.y ?? 0) + (bottomRight?.height ?? 0)).toBeLessThanOrEqual(BOUNDS.height);
  });

  it('never lets a resize push the frame off the desktop', () => {
    const opened = manager.open('telemetry', { rect: { x: 900, y: 600, width: 400, height: 300 } });

    manager.resize(opened.id, 4000, 4000);

    const resized = manager.get(opened.id);
    expect(resized?.width).toBeLessThanOrEqual(BOUNDS.width);
    expect(resized?.height).toBeLessThanOrEqual(BOUNDS.height);
    expect((resized?.x ?? 0) + (resized?.width ?? 0)).toBeLessThanOrEqual(BOUNDS.width);
    expect((resized?.y ?? 0) + (resized?.height ?? 0)).toBeLessThanOrEqual(BOUNDS.height);
  });

  it('refuses to move or resize a maximized window', () => {
    const opened = manager.open('telemetry');
    manager.toggleMaximize(opened.id);

    manager.move(opened.id, 500, 500);
    manager.resize(opened.id, 300, 300);

    expect(manager.get(opened.id)).toMatchObject({ x: 0, y: 0, width: BOUNDS.width, height: BOUNDS.height });
  });

  it('resizes from an edge while anchoring the opposite edge', () => {
    const opened = manager.open('telemetry', { rect: { x: 100, y: 100, width: 400, height: 300 } });

    manager.resizeFrom(opened.id, 'se', 80, 60);
    const grown = manager.get(opened.id);
    expect(grown?.width).toBe(480);
    expect(grown?.height).toBe(360);
    expect(grown?.x).toBe(100);
    expect(grown?.y).toBe(100);

    manager.resizeFrom(opened.id, 'nw', 40, 30);
    const anchored = manager.get(opened.id);
    expect(anchored?.width).toBe(440);
    expect(anchored?.height).toBe(330);
    expect(anchored?.x).toBe(140);
    expect(anchored?.y).toBe(130);
  });

  it('enforces the minimum window size', () => {
    const opened = manager.open('telemetry', { rect: { x: 100, y: 100, width: 500, height: 400 } });

    manager.resize(opened.id, 10, 10);

    const smallest = manager.get(opened.id);
    expect(smallest?.width).toBe(340);
    expect(smallest?.height).toBe(220);
  });

  it('cascades windows diagonally', () => {
    manager.open('telemetry');
    manager.open('research');
    manager.open('performance');

    manager.cascade();

    const positions = manager.list().map((entry) => `${entry.x},${entry.y}`);
    expect(new Set(positions).size).toBe(3);
    expect(manager.list().every((entry) => !entry.minimized && !entry.maximized)).toBe(true);
  });

  it('tiles windows into a grid that fills the desktop', () => {
    manager.open('telemetry');
    manager.open('research');
    manager.open('performance');
    manager.open('security');

    manager.tile();

    const tiled = manager.list();
    expect(tiled).toHaveLength(4);
    expect(new Set(tiled.map((entry) => `${entry.x},${entry.y}`)).size).toBe(4);
    expect(tiled.every((entry) => entry.width > 0 && entry.height > 0)).toBe(true);
    expect(Math.min(...tiled.map((entry) => entry.x))).toBe(0);
    expect(Math.min(...tiled.map((entry) => entry.y))).toBe(0);
  });

  it('restores every minimized and maximized window', () => {
    const first = manager.open('telemetry');
    const second = manager.open('research');

    manager.minimize(first.id);
    manager.toggleMaximize(second.id);

    manager.restoreAll();

    expect(manager.list().every((entry) => !entry.minimized && !entry.maximized)).toBe(true);
  });

  it('closes every window and resets the layout', () => {
    manager.open('telemetry');
    manager.open('research');

    manager.closeAll();
    expect(manager.count()).toBe(0);

    manager.open('security');
    manager.resetLayout();
    expect(manager.count()).toBe(0);
  });

  it('notifies subscribers on every mutation', () => {
    const listener = vi.fn();
    manager.subscribe(listener);

    const opened = manager.open('telemetry');
    manager.focus(opened.id);
    manager.minimize(opened.id);
    manager.close(opened.id);

    expect(listener.mock.calls.length).toBeGreaterThanOrEqual(4);
  });

  it('stops notifying after unsubscribe', () => {
    const listener = vi.fn();
    const unsubscribe = manager.subscribe(listener);
    unsubscribe();

    manager.open('telemetry');
    expect(listener).not.toHaveBeenCalled();
  });

  it('persists and restores the desktop layout', () => {
    const storage = new Map<string, string>();
    const fakeStorage: Storage = {
      get length() {
        return storage.size;
      },
      clear: () => storage.clear(),
      getItem: (key: string) => storage.get(key) ?? null,
      key: (index: number) => Array.from(storage.keys())[index] ?? null,
      removeItem: (key: string) => {
        storage.delete(key);
      },
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
    };

    Object.defineProperty(globalThis, 'window', {
      value: { localStorage: fakeStorage },
      configurable: true,
      writable: true,
    });

    const first = new WindowManager({ bounds: BOUNDS });
    first.resetLayout();
    const opened = first.open('telemetry', { title: 'Telemetry', rect: { x: 50, y: 60, width: 600, height: 420 } });
    first.minimize(opened.id);

    const second = new WindowManager({ bounds: BOUNDS });
    const restored = second.list();

    expect(restored).toHaveLength(1);
    expect(restored[0]).toMatchObject({
      kind: 'telemetry',
      title: 'Telemetry',
      x: 50,
      y: 60,
      width: 600,
      height: 420,
      minimized: true,
    });

    delete (globalThis as { window?: unknown }).window;
  });

  it('rejects invalid desktop bounds', () => {
    expect(() => manager.setBounds({ width: 0, height: 800 })).toThrow();
    expect(() => manager.setBounds({ width: 1200, height: -1 })).toThrow();
  });

  it('ignores closing an unknown window id', () => {
    expect(() => manager.close('missing')).not.toThrow();
    expect(manager.count()).toBe(0);
  });
});
