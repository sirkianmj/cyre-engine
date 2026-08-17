/**
 * AutomationTypes
 * ----------------
 * Shared types for the automation module.
 */

export interface AutomationEvent {
  type: string;
  timestamp: number;
  source?: string;
  data?: unknown;
}
