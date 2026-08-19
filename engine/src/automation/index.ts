/**
 * CYRE Automation Module Exports
 * -------------------------------
 * Public API for automation server, webhooks, events, n8n integration,
 * API gateway, and WebSocket event streaming.
 */

export type { AutomationEvent } from './AutomationTypes.js';
export { WebhookClient } from './WebhookClient.js';
export { WebhookRegistry } from './WebhookRegistry.js';
export { AutomationServer } from './AutomationServer.js';
export {
  CYRE_EVENT_TYPES,
  isCyreEventType,
  type CyreEventType,
} from './cyreEventTypes.js';
export {
  N8nIntegration,
  type N8nWorkflowDefinition,
  type N8nWorkflowNode,
} from './N8nIntegration.js';

export {
  API_METHODS,
  isApiMethod,
} from './ApiTypes.js';
export type {
  ApiMethod,
  ApiRequest,
  ApiResponse,
  ApiHandler,
  ApiRouteDefinition,
  ApiRouteInfo,
  ApiGatewaySnapshot,
} from './ApiTypes.js';
export { ApiGateway } from './ApiGateway.js';

export { WebSocketEventStream } from './WebSocketEventStream.js';
export type {
  WebSocketLike,
  WebSocketEventEnvelope,
  EventStreamFilter,
  WebSocketEventStreamStats,
  WebSocketEventStreamSnapshot,
  WebSocketEventStreamOptions,
} from './WebSocketEventStream.js';
