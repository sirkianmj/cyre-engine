/**
 * TimelineTypes
 * --------------
 * Types used by the event timeline system.
 */

export interface TimelineEvent {
  id: string;
  type: string;
  timestamp: number;
  sourceId?: string;
  targetId?: string;
  data?: Record<string, unknown>;
}
