/**
 * WebhookClient
 * --------------
 * Sends HTTP POST requests to external webhook URLs.
 * Uses Node.js built-in http/https.
 */

import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import type { AutomationEvent } from './AutomationTypes.js';

export class WebhookClient {
  /**
   * Send an event to a webhook URL.
   * @param url The full URL (http or https).
   * @param event The automation event to send.
   * @returns Promise that resolves to the HTTP status code.
   */
  static send(url: string, event: AutomationEvent): Promise<number> {
    return new Promise((resolve, reject) => {
      let parsed: URL;
      try {
        parsed = new URL(url);
      } catch (error) {
        reject(new Error(`Invalid webhook URL: ${url}`));
        return;
      }

      const payload = JSON.stringify(event);
      const isHttps = parsed.protocol === 'https:';
      const requestModule = isHttps ? httpsRequest : httpRequest;

      const req = requestModule(
        {
          hostname: parsed.hostname,
          port: parsed.port || (isHttps ? 443 : 80),
          path: parsed.pathname + parsed.search,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
          },
        },
        (res) => {
          res.resume();
          resolve(res.statusCode ?? 0);
        },
      );

      req.on('error', (error) => {
        reject(error);
      });

      req.write(payload);
      req.end();
    });
  }
}
