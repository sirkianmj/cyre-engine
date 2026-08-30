/**
 * WindowManager
 * --------------
 * A headless windowing model for CYRE Studio.
 *
 * Studio presents every secondary tool as a real window: windows can be
 * opened, focused, minimized, maximized, dragged, resized, tiled and
 * restored. The model itself is framework free and DOM free so it can be
 * unit tested and reused by the React layer.
 */

import type { WindowKind } from '../shell/windowCatalog';

export type { WindowKind };

export interface WindowRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WindowInstance extends WindowRect {
  id: string;
  kind: WindowKind;
  title: string;
  minimized: boolean;
  maximized: boolean;
  z: number;
  focused: boolean;
  restoreRect: WindowRect | null;
}

export interface WindowManagerOptions {
  /** Usable desktop area windows are clamped to. */
  bounds?: { width: number; height: number };
  /** Smallest size any window may be resized to. */
  minSize?: { width: number; height: number };
  /** Resolves the presentation title for a window kind. */
  titleFor?: (kind: WindowKind) => string;
}

export interface OpenWindowOptions {
  title?: string;
  rect?: Partial<WindowRect>;
  focused?: boolean;
}

export type WindowChangeListener = () => void;

export type ResizeEdge =
  | 'n'
  | 's'
  | 'e'
  | 'w'
  | 'ne'
  | 'nw'
  | 'se'
  | 'sw';

const DEFAULT_BOUNDS = { width: 1600, height: 1000 };
const DEFAULT_MIN_SIZE = { width: 340, height: 220 };
const LAYOUT_STORAGE_KEY = 'cyre.studio.windows.v1';

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
}

export class WindowManager {
  private windows = new Map<string, WindowInstance>();
  private readonly listeners = new Set<WindowChangeListener>();
  private sequence = 0;
  private zCounter = 10;
  private bounds: { width: number; height: number };
  private minSize: { width: number; height: number };
  private storage: Storage | null;
  private readonly titleFor: ((kind: WindowKind) => string) | null;

  constructor(options: WindowManagerOptions = {}) {
    this.bounds = options.bounds ?? DEFAULT_BOUNDS;
    this.minSize = options.minSize ?? DEFAULT_MIN_SIZE;
    this.titleFor = options.titleFor ?? null;
    this.storage = WindowManager.resolveStorage();
    this.restorePersistedLayout();
  }

  private static resolveStorage(): Storage | null {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return null;
      return window.localStorage;
    } catch {
      return null;
    }
  }

  setBounds(bounds: { width: number; height: number }): void {
    if (bounds.width <= 0 || bounds.height <= 0) {
      throw new Error('Window bounds must be positive.');
    }
    this.bounds = { ...bounds };
  }

  getBounds(): { width: number; height: number } {
    return { ...this.bounds };
  }

  subscribe(listener: WindowChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  list(): WindowInstance[] {
    return Array.from(this.windows.values())
      .map((entry) => ({ ...entry }))
      .sort((a, b) => a.z - b.z);
  }

  listByKind(kind: WindowKind): WindowInstance[] {
    return this.list().filter((entry) => entry.kind === kind);
  }

  get(windowId: string): WindowInstance | null {
    const found = this.windows.get(windowId);
    return found ? { ...found } : null;
  }

  getFocused(): WindowInstance | null {
    const ordered = this.list().filter((entry) => !entry.minimized);
    const focused = ordered.find((entry) => entry.focused);
    return focused ?? null;
  }

  count(): number {
    return this.windows.size;
  }

  /**
   * Opens a window. When a window of the same kind already exists it is
   * focused and updated instead of duplicated, which matches the behaviour
   * of a native editor where tools are singletons.
   */
  open(kind: WindowKind, options: OpenWindowOptions = {}): WindowInstance {
    const existing = this.listByKind(kind)[0];
    if (existing) {
      const updated = this.update(existing.id, {
        title: options.title ?? existing.title,
        minimized: false,
      });
      this.focus(existing.id);
      return this.requireWindow(updated.id);
    }

    this.sequence += 1;
    const id = `${kind}-${this.sequence}`;
    const width = clamp(
      options.rect?.width ?? 720,
      this.minSize.width,
      this.bounds.width,
    );
    const height = clamp(
      options.rect?.height ?? 520,
      this.minSize.height,
      this.bounds.height,
    );
    const cascade = (this.windows.size % 6) * 28;
    const placed = this.containRect({
      x: options.rect?.x ?? Math.round((this.bounds.width - width) / 2) + cascade,
      y: options.rect?.y ?? 48 + cascade,
      width,
      height,
    });

    this.zCounter += 1;
    const instance: WindowInstance = {
      id,
      kind,
      title: options.title ?? this.titleFor?.(kind) ?? kind,
      x: placed.x,
      y: placed.y,
      width: placed.width,
      height: placed.height,
      minimized: false,
      maximized: false,
      z: this.zCounter,
      focused: options.focused !== false,
      restoreRect: null,
    };

    if (options.focused !== false) {
      for (const entry of this.windows.values()) entry.focused = false;
    }

    this.windows.set(id, instance);
    this.persist();
    this.emit();
    return { ...instance };
  }

  close(windowId: string): void {
    if (!this.windows.has(windowId)) return;
    this.windows.delete(windowId);
    this.focusTopmost();
    this.persist();
    this.emit();
  }

  closeKind(kind: WindowKind): void {
    for (const entry of this.listByKind(kind)) {
      this.windows.delete(entry.id);
    }
    this.focusTopmost();
    this.persist();
    this.emit();
  }

  closeAll(): void {
    if (this.windows.size === 0) return;
    this.windows.clear();
    this.persist();
    this.emit();
  }

  focus(windowId: string): void {
    const target = this.windows.get(windowId);
    if (!target) return;
    this.zCounter += 1;
    target.z = this.zCounter;
    target.focused = true;
    if (target.minimized) target.minimized = false;
    for (const entry of this.windows.values()) {
      if (entry.id !== windowId) entry.focused = false;
    }
    this.persist();
    this.emit();
  }

  focusTopmost(): void {
    const candidates = this.list().filter((entry) => !entry.minimized);
    const top = candidates[candidates.length - 1];
    if (!top) return;
    this.focus(top.id);
  }

  minimize(windowId: string): void {
    const target = this.windows.get(windowId);
    if (!target || target.minimized) return;
    target.minimized = true;
    target.focused = false;
    this.focusTopmost();
    this.persist();
    this.emit();
  }

  restore(windowId: string): void {
    const target = this.windows.get(windowId);
    if (!target) return;
    target.minimized = false;
    this.focus(windowId);
  }

  toggleMaximize(windowId: string): void {
    const target = this.windows.get(windowId);
    if (!target) return;

    if (target.maximized && target.restoreRect) {
      const rect = target.restoreRect;
      target.x = rect.x;
      target.y = rect.y;
      target.width = rect.width;
      target.height = rect.height;
      target.maximized = false;
      target.restoreRect = null;
    } else {
      target.restoreRect = {
        x: target.x,
        y: target.y,
        width: target.width,
        height: target.height,
      };
      target.x = 0;
      target.y = 0;
      target.width = this.bounds.width;
      target.height = this.bounds.height;
      target.maximized = true;
    }

    this.focus(windowId);
  }

  /**
   * Keeps a rect fully inside the desktop. Unlike a native OS window, a
   * window that hangs past the viewport edge cannot be brought back, so the
   * whole frame — including its resize handles — must stay reachable.
   */
  private containRect(rect: WindowRect): WindowRect {
    const width = clamp(rect.width, this.minSize.width, this.bounds.width);
    const height = clamp(rect.height, this.minSize.height, this.bounds.height);

    return {
      width,
      height,
      x: clamp(rect.x, 0, Math.max(0, this.bounds.width - width)),
      y: clamp(rect.y, 0, Math.max(0, this.bounds.height - height)),
    };
  }

  move(windowId: string, x: number, y: number): void {
    const target = this.windows.get(windowId);
    if (!target || target.maximized) return;

    const contained = this.containRect({ x, y, width: target.width, height: target.height });
    target.x = contained.x;
    target.y = contained.y;
    this.persist();
    this.emit();
  }

  resize(windowId: string, width: number, height: number): void {
    const target = this.windows.get(windowId);
    if (!target || target.maximized) return;

    const contained = this.containRect({ x: target.x, y: target.y, width, height });
    target.width = contained.width;
    target.height = contained.height;
    target.x = contained.x;
    target.y = contained.y;
    this.persist();
    this.emit();
  }

  /**
   * Resizes from a specific edge so the opposite edge stays anchored,
   * matching native window resizing.
   */
  resizeFrom(
    windowId: string,
    edge: ResizeEdge,
    dx: number,
    dy: number,
  ): void {
    const target = this.windows.get(windowId);
    if (!target || target.maximized) return;

    let { x, y, width, height } = target;

    if (edge.includes('e')) width += dx;
    if (edge.includes('s')) height += dy;
    if (edge.includes('w')) {
      const nextWidth = width - dx;
      const applied = clamp(nextWidth, this.minSize.width, this.bounds.width);
      x += width - applied;
      width = applied;
    }
    if (edge.includes('n')) {
      const nextHeight = height - dy;
      const applied = clamp(nextHeight, this.minSize.height, this.bounds.height);
      y += height - applied;
      height = applied;
    }

    const contained = this.containRect({ x, y, width, height });
    target.x = contained.x;
    target.y = contained.y;
    target.width = contained.width;
    target.height = contained.height;
    this.persist();
    this.emit();
  }

  private update(
    windowId: string,
    patch: Partial<WindowInstance>,
  ): WindowInstance {
    const target = this.windows.get(windowId);
    if (!target) throw new Error(`Window "${windowId}" does not exist.`);
    Object.assign(target, patch);
    this.persist();
    this.emit();
    return { ...target };
  }

  private requireWindow(windowId: string): WindowInstance {
    const target = this.windows.get(windowId);
    if (!target) throw new Error(`Window "${windowId}" does not exist.`);
    return { ...target };
  }

  /** Stacks all open windows diagonally from the top-left. */
  cascade(): void {
    const entries = this.list();
    entries.forEach((entry, index) => {
      const target = this.windows.get(entry.id);
      if (!target) return;
      target.maximized = false;
      target.restoreRect = null;
      target.minimized = false;
      const placed = this.containRect({
        x: 24 + index * 32,
        y: 24 + index * 32,
        width: 760,
        height: 520,
      });
      target.width = placed.width;
      target.height = placed.height;
      target.x = placed.x;
      target.y = placed.y;
    });
    this.focusTopmost();
    this.persist();
    this.emit();
  }

  /** Lays windows out in a grid that fills the desktop. */
  tile(): void {
    const entries = this.list();
    if (entries.length === 0) return;
    const columns = Math.ceil(Math.sqrt(entries.length));
    const rows = Math.ceil(entries.length / columns);
    const cellWidth = Math.floor(this.bounds.width / columns);
    const cellHeight = Math.floor(this.bounds.height / rows);

    entries.forEach((entry, index) => {
      const target = this.windows.get(entry.id);
      if (!target) return;
      target.maximized = false;
      target.restoreRect = null;
      target.minimized = false;
      target.x = (index % columns) * cellWidth;
      target.y = Math.floor(index / columns) * cellHeight;
      target.width = cellWidth;
      target.height = cellHeight;
    });

    this.focusTopmost();
    this.persist();
    this.emit();
  }

  restoreAll(): void {
    for (const entry of this.list()) {
      const target = this.windows.get(entry.id);
      if (!target) continue;
      target.minimized = false;
      if (target.maximized && target.restoreRect) {
        target.x = target.restoreRect.x;
        target.y = target.restoreRect.y;
        target.width = target.restoreRect.width;
        target.height = target.restoreRect.height;
        target.maximized = false;
        target.restoreRect = null;
      }
    }
    this.persist();
    this.emit();
  }

  /** Resets the desktop to the default empty layout. */
  resetLayout(): void {
    this.windows.clear();
    this.zCounter = 10;
    this.sequence = 0;
    this.persist();
    this.emit();
  }

  serialize(): WindowInstance[] {
    return this.list();
  }

  private persist(): void {
    if (!this.storage) return;
    try {
      this.storage.setItem(
        LAYOUT_STORAGE_KEY,
        JSON.stringify({
          sequence: this.sequence,
          zCounter: this.zCounter,
          windows: this.serialize(),
        }),
      );
    } catch {
      // Private mode / disabled storage: window layout simply is not kept.
    }
  }

  private restorePersistedLayout(): void {
    if (!this.storage) return;
    try {
      const raw = this.storage.getItem(LAYOUT_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        sequence?: number;
        zCounter?: number;
        windows?: WindowInstance[];
      };
      if (!Array.isArray(parsed.windows)) return;

      for (const entry of parsed.windows) {
        if (!entry || typeof entry.id !== 'string' || typeof entry.kind !== 'string') {
          continue;
        }
        this.windows.set(entry.id, {
          id: entry.id,
          kind: entry.kind,
          title: typeof entry.title === 'string' ? entry.title : entry.kind,
          x: Number.isFinite(entry.x) ? entry.x : 40,
          y: Number.isFinite(entry.y) ? entry.y : 40,
          width: clamp(
            Number.isFinite(entry.width) ? entry.width : 720,
            this.minSize.width,
            this.bounds.width,
          ),
          height: clamp(
            Number.isFinite(entry.height) ? entry.height : 520,
            this.minSize.height,
            this.bounds.height,
          ),
          minimized: entry.minimized === true,
          maximized: false,
          z: Number.isFinite(entry.z) ? entry.z : 10,
          focused: false,
          restoreRect: null,
        });
      }

      this.sequence = Number.isFinite(parsed.sequence) ? (parsed.sequence as number) : this.windows.size;
      this.zCounter = Number.isFinite(parsed.zCounter) ? (parsed.zCounter as number) : 10 + this.windows.size;
      this.focusTopmost();
    } catch {
      this.windows.clear();
    }
  }

  private emit(): void {
    for (const listener of Array.from(this.listeners)) listener();
  }
}
