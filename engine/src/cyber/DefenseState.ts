/**
 * DefenseState
 * -------------
 * Tracks which defensive actions have been applied and their timestamps.
 * Defensive actions correspond to the incident response lifecycle.
 */

import { DefensiveAction, ALL_DEFENSIVE_ACTIONS } from './DefensiveAction.js';

export interface DefenseActionRecord {
  action: DefensiveAction;
  timestamp: number;
}

export class DefenseState {
  private actions: Map<DefensiveAction, number> = new Map();

  /**
   * Apply a defensive action.
   * @param action The action to apply.
   * @param timestamp Time in milliseconds (defaults to Date.now()).
   * @throws Error if action is invalid or already applied.
   */
  apply(action: DefensiveAction, timestamp: number = Date.now()): DefenseActionRecord {
    if (!ALL_DEFENSIVE_ACTIONS.includes(action)) {
      throw new Error(`Invalid defensive action: ${action}`);
    }
    if (this.actions.has(action)) {
      throw new Error(`Defensive action "${action}" has already been applied.`);
    }
    this.actions.set(action, timestamp);
    return { action, timestamp };
  }

  /**
   * Check if a defensive action has been applied.
   */
  hasApplied(action: DefensiveAction): boolean {
    return this.actions.has(action);
  }

  /**
   * Get the timestamp when the action was applied, if present.
   */
  getTimestamp(action: DefensiveAction): number | undefined {
    return this.actions.get(action);
  }

  /**
   * Get a list of all applied actions (in insertion order).
   */
  getAppliedActions(): DefensiveAction[] {
    return Array.from(this.actions.keys());
  }

  /**
   * Get the full history of applied actions.
   */
  getHistory(): DefenseActionRecord[] {
    return Array.from(this.actions.entries()).map(([action, timestamp]) => ({
      action,
      timestamp,
    }));
  }

  /**
   * Remove an applied action (e.g., to revert a defensive measure).
   * @throws Error if the action was not applied.
   */
  remove(action: DefensiveAction): void {
    if (!this.actions.has(action)) {
      throw new Error(`Defensive action "${action}" has not been applied.`);
    }
    this.actions.delete(action);
  }

  /**
   * Clear all applied actions.
   */
  reset(): void {
    this.actions.clear();
  }

  toJSON(): Record<string, unknown> {
    return {
      appliedActions: this.getHistory(),
    };
  }
}
