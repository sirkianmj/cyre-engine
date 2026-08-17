/**
 * WebhookRegistry
 * ----------------
 * Stores webhook URLs and allows event distribution.
 */

import { WebhookClient } from './WebhookClient.js';
import type { AutomationEvent } from './AutomationTypes.js';

export class WebhookRegistry {
  private urls: Set<string> = new Set();

  add(url: string): void {
    if (!url || url.trim() === '') {
      throw new Error('Webhook URL must be a non-empty string.');
    }
    if (this.urls.has(url)) {
      throw new Error(`Webhook URL "${url}" already registered.`);
    }
    this.urls.add(url);
  }

  remove(url: string): void {
    if (!this.urls.has(url)) {
      throw new Error(`Webhook URL "${url}" is not registered.`);
    }
    this.urls.delete(url);
  }

  getUrls(): string[] {
    return Array.from(this.urls);
  }

  /**
   * Send an event to all registered webhooks.
   * Returns a map of URL to HTTP status code.
   */
  async sendToAll(event: AutomationEvent): Promise<Record<string, number>> {
    const results: Record<string, number> = {};
    for (const url of this.urls) {
      try {
        const status = await WebhookClient.send(url, event);
        results[url] = status;
      } catch (error) {
        results[url] = 0;
      }
    }
    return results;
  }
}
