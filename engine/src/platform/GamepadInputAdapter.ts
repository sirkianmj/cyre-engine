/**
 * GamepadInputAdapter
 * --------------------
 * Maps standard gamepad buttons/axes to engine input commands.
 * Standard mapping (Xbox-like):
 *   A = Confirm, B = Cancel, X = Action, Y = Menu
 *   D-pad/Left stick = Navigate
 *   Start = Pause
 */

import type { InputAdapter, InputCommand } from './InputDevice.js';

export class GamepadInputAdapter implements InputAdapter {
  private onCommand?: (command: InputCommand) => void;

  setCommandHandler(handler: (command: InputCommand) => void): void {
    this.onCommand = handler;
  }

  /**
   * Process a button press.
   * @param button Standard button name.
   * @param pressed Whether pressed or released.
   */
  button(button: string, pressed: boolean): void {
    if (!pressed) return;
    const commands: Record<string, InputCommand> = {
      A: { type: 'confirm' },
      B: { type: 'cancel' },
      X: { type: 'action' },
      Y: { type: 'menu' },
      Start: { type: 'pause' },
      DPadUp: { type: 'navigate', position: { x: 0, y: -1 } },
      DPadDown: { type: 'navigate', position: { x: 0, y: 1 } },
      DPadLeft: { type: 'navigate', position: { x: -1, y: 0 } },
      DPadRight: { type: 'navigate', position: { x: 1, y: 0 } },
    };
    const command = commands[button];
    if (command && this.onCommand) {
      this.onCommand(command);
    }
  }

  /**
   * Process analog stick movement (e.g., for camera or navigation).
   */
  stick(axis: 'left' | 'right', x: number, y: number): void {
    const magnitude = Math.sqrt(x * x + y * y);
    const threshold = 0.2;
    if (magnitude < threshold) return;
    if (this.onCommand) {
      this.onCommand({
        type: 'stick',
        position: { x, y },
        value: magnitude,
      });
    }
  }
}
