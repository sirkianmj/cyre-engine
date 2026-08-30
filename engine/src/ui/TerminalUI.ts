/**
 * TerminalUI
 * -----------
 * A simple text-based terminal UI component.
 * Maintains command history and output lines.
 */

import { UIComponent, UIState } from './UIComponent.js';

interface TerminalState extends UIState {
  lines: string[];
  history: string[];
}

export class TerminalUI extends UIComponent<TerminalState> {
  constructor() {
    super({ lines: [], history: [] });
  }

  /** Add a line to the terminal output */
  write(line: string): void {
    this.setState({
      lines: [...this.state.lines, line],
    });
  }

  /** Execute a command and append to output */
  execute(command: string, result: string): void {
    this.write(`> ${command}`);
    this.write(result);
    this.setState({
      history: [...this.state.history, command],
    });
  }

  /** Clear all output lines */
  clearLines(): void {
    this.setState({ lines: [] });
  }

  render(): Record<string, unknown> {
    return {
      type: 'terminal',
      lines: [...this.state.lines],
      history: [...this.state.history],
    };
  }
}
