/**
 * N8nIntegration
 * ---------------
 * Integrates CYRE with n8n by:
 *  - Holding an n8n webhook URL.
 *  - Filtering events by allowed type.
 *  - Sending events using WebhookClient.
 *  - Generating a sample n8n workflow JSON.
 */

import { WebhookClient } from './WebhookClient.js';
import type { AutomationEvent } from './AutomationTypes.js';
import { CyreEventType, isCyreEventType } from './cyreEventTypes.js';

export interface N8nWorkflowNode {
  parameters: Record<string, unknown>;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
}

export interface N8nWorkflowDefinition {
  name: string;
  nodes: N8nWorkflowNode[];
  connections: Record<string, unknown>;
}

export class N8nIntegration {
  readonly webhookUrl: string;
  private allowedTypes: Set<CyreEventType>;

  constructor(webhookUrl: string, allowedTypes: CyreEventType[] = []) {
    if (!webhookUrl || webhookUrl.trim() === '') {
      throw new Error('n8n webhook URL must be a non-empty string.');
    }
    try {
      new URL(webhookUrl);
    } catch (error) {
      throw new Error(`Invalid n8n webhook URL: ${webhookUrl}`);
    }
    this.webhookUrl = webhookUrl;
    this.allowedTypes = new Set(allowedTypes);
  }

  /**
   * Add an allowed event type.
   * If no types are allowed, all types are sent (default behavior).
   */
  allowEventType(type: CyreEventType): void {
    if (!isCyreEventType(type)) {
      throw new Error(`Invalid CYRE event type: ${type}`);
    }
    this.allowedTypes.add(type);
  }

  /**
   * Check if an event type is allowed.
   * If allowedTypes is empty, all types are allowed.
   */
  isAllowed(type: string): boolean {
    if (this.allowedTypes.size === 0) return true;
    return isCyreEventType(type) && this.allowedTypes.has(type as CyreEventType);
  }

  /**
   * Send an automation event to the n8n webhook if type is allowed.
   * @returns HTTP status code, or null if event not allowed.
   */
  async sendEvent(event: AutomationEvent): Promise<number | null> {
    if (!this.isAllowed(event.type)) {
      return null;
    }
    return WebhookClient.send(this.webhookUrl, event);
  }

  /**
   * Generate a sample n8n workflow definition.
   * This can be imported into n8n to create a webhook -> report workflow.
   */
  buildWorkflowDefinition(workflowName = 'CYRE Automation'): N8nWorkflowDefinition {
    return {
      name: workflowName,
      nodes: [
        {
          parameters: {
            httpMethod: 'POST',
            path: 'cyre-event',
            responseMode: 'onReceived',
          },
          name: 'Webhook',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 2,
          position: [0, 0],
        },
        {
          parameters: {
            jsCode:
              '// Extract CYRE event data\n' +
              'const event = $input.first().json;\n' +
              'return { eventType: event.type, timestamp: event.timestamp, source: event.source, data: event.data };\n',
          },
          name: 'Format Event',
          type: 'n8n-nodes-base.code',
          typeVersion: 2,
          position: [200, 0],
        },
        {
          parameters: {
            content: 'CYRE Event: {{ $json.eventType }}',
          },
          name: 'Notify',
          type: 'n8n-nodes-base.emailSend',
          typeVersion: 2,
          position: [400, 0],
        },
      ],
      connections: {
        Webhook: {
          main: [[{ node: 'Format Event', type: 'main', index: 0 }]],
        },
        'Format Event': {
          main: [[{ node: 'Notify', type: 'main', index: 0 }]],
        },
      },
    };
  }
}
