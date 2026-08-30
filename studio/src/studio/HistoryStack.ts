/**
 * HistoryStack
 * -------------
 * A small, framework free undo/redo stack used by CYRE Studio for
 * document-level edits (scenario draft authoring and network graph edits).
 *
 * The stack stores cloned snapshots, so mutating the live document after a
 * commit never corrupts history.
 */

export interface HistorySnapshot<T> {
  label: string;
  document: T;
}

export interface HistoryStatus {
  canUndo: boolean;
  canRedo: boolean;
  undoLabel: string | null;
  redoLabel: string | null;
  depth: number;
  redoDepth: number;
}

export type HistoryListener = () => void;

const MAX_DEPTH = 100;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export class HistoryStack<T> {
  private readonly past: Array<HistorySnapshot<T>> = [];
  private readonly future: Array<HistorySnapshot<T>> = [];
  private current: T;
  private readonly listeners = new Set<HistoryListener>();

  constructor(initial: T, private readonly limit: number = MAX_DEPTH) {
    this.current = clone(initial);
  }

  get document(): T {
    return clone(this.current);
  }

  peek(): T {
    return clone(this.current);
  }

  subscribe(listener: HistoryListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Commits the next document state. If the document is structurally
   * identical to the current one the commit is a no-op, which keeps the
   * undo stack free of empty steps.
   */
  commit(label: string, next: T): void {
    const serializedNext = JSON.stringify(next);
    if (serializedNext === JSON.stringify(this.current)) return;

    this.past.push({ label, document: clone(this.current) });
    if (this.past.length > this.limit) this.past.shift();
    this.future.length = 0;
    this.current = JSON.parse(serializedNext) as T;
    this.emit();
  }

  /** Replaces the document without recording history (used on project load). */
  replace(next: T): void {
    this.past.length = 0;
    this.future.length = 0;
    this.current = clone(next);
    this.emit();
  }

  canUndo(): boolean {
    return this.past.length > 0;
  }

  canRedo(): boolean {
    return this.future.length > 0;
  }

  undo(): T | null {
    const entry = this.past.pop();
    if (!entry) return null;
    this.future.push({ label: entry.label, document: clone(this.current) });
    this.current = clone(entry.document);
    this.emit();
    return clone(this.current);
  }

  redo(): T | null {
    const entry = this.future.pop();
    if (!entry) return null;
    this.past.push({ label: entry.label, document: clone(this.current) });
    this.current = clone(entry.document);
    this.emit();
    return clone(this.current);
  }

  status(): HistoryStatus {
    const lastPast = this.past[this.past.length - 1];
    const lastFuture = this.future[this.future.length - 1];
    return {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      undoLabel: lastPast ? lastPast.label : null,
      redoLabel: lastFuture ? lastFuture.label : null,
      depth: this.past.length,
      redoDepth: this.future.length,
    };
  }

  private emit(): void {
    for (const listener of Array.from(this.listeners)) listener();
  }
}
