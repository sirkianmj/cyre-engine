/**
 * UIComponent
 * ------------
 * Base class for all CYRE UI components.
 * A component holds a state and renders to a plain object (for future rendering).
 */

export interface UIState {
  [key: string]: unknown;
}

export abstract class UIComponent<TState extends UIState = UIState> {
  protected state: TState;

  constructor(initialState: TState) {
    this.state = { ...initialState };
  }

  /** Get current state (read-only) */
  getState(): Readonly<TState> {
    return { ...this.state };
  }

  /** Update partial state */
  setState(patch: Partial<TState>): void {
    this.state = { ...this.state, ...patch };
  }

  /** Render component to a serialisable object */
  abstract render(): Record<string, unknown>;
}
