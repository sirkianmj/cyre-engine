/**
 * InputDevice
 * ------------
 * Abstract input device interfaces.
 */

export interface InputCommand {
  type: string;
  value?: number;
  position?: { x: number; y: number };
}

export interface InputAdapter {
  setCommandHandler(handler: (command: InputCommand) => void): void;
}
