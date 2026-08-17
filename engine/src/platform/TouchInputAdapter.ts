/**
 * TouchInputAdapter
 * ------------------
 * Maps touch events to engine-friendly commands.
 */

export interface TouchPoint {
  x: number;
  y: number;
  identifier: number;
}

export interface TouchCommand {
  type: 'tap' | 'swipe' | 'pinch';
  position?: { x: number; y: number };
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  scale?: number;
}

export class TouchInputAdapter {
  private onCommand?: (command: TouchCommand) => void;

  /**
   * Set the handler for touch commands.
   */
  setCommandHandler(handler: (command: TouchCommand) => void): void {
    this.onCommand = handler;
  }

  /**
   * Process a tap event.
   */
  tap(x: number, y: number): void {
    this.dispatch({ type: 'tap', position: { x, y } });
  }

  /**
   * Process a swipe event (start and end points).
   */
  swipe(start: { x: number; y: number }, end: { x: number; y: number }): void {
    this.dispatch({ type: 'swipe', start, end });
  }

  /**
   * Process a pinch event (scale factor).
   */
  pinch(scale: number): void {
    this.dispatch({ type: 'pinch', scale });
  }

  private dispatch(command: TouchCommand): void {
    if (this.onCommand) {
      this.onCommand(command);
    }
  }
}
