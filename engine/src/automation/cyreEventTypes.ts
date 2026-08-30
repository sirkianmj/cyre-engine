/**
 * CYRE Event Types
 * -----------------
 * Defines the standard event types that can be emitted by CYRE
 * and consumed by automation platforms like n8n.
 */

export const CYRE_EVENT_TYPES = [
  'incident_detected',
  'host_compromised',
  'attack_completed',
  'mission_completed',
  'suspicious_activity_detected',
  'player_decision_made',
] as const;

export type CyreEventType = (typeof CYRE_EVENT_TYPES)[number];

export function isCyreEventType(value: string): value is CyreEventType {
  return (CYRE_EVENT_TYPES as readonly string[]).includes(value);
}
