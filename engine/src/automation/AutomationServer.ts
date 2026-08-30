/**
 * AutomationServer
 * ------------------
 * A simple HTTP server exposing REST endpoints for CYRE automation.
 * Uses Node.js built-in http module.
 * Endpoints:
 *   GET  /health         -> { status: 'ok' }
 *   POST /events         -> Accepts an AutomationEvent JSON and returns it
 *   GET  /events         -> Returns last received events (in-memory)
 *   POST /webhook        -> Register a webhook URL (body: { url })
 *   DELETE /webhook      -> Remove a webhook URL (body: { url })
 */

import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'node:http';
import type { AutomationEvent } from './AutomationTypes.js';
import { WebhookRegistry } from './WebhookRegistry.js';

export class AutomationServer {
  private server: Server;
  private events: AutomationEvent[];
  private webhooks: WebhookRegistry;

  constructor() {
    this.events = [];
    this.webhooks = new WebhookRegistry();
    this.server = createServer((req, res) => {
      this.handleRequest(req, res).catch(() => {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: 'Internal server error' }));
      });
    });
  }

  async start(port: number): Promise<void> {
    if (!Number.isInteger(port) || port < 0 || port > 65535) {
      throw new Error('Port must be an integer between 0 and 65535.');
    }
    return new Promise((resolve, reject) => {
      this.server.listen(port, () => {
        resolve();
      });
      this.server.on('error', reject);
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  getPort(): number {
    const address = this.server.address();
    if (typeof address === 'object' && address !== null) {
      return address.port;
    }
    return 0;
  }

  /**
   * Register a webhook URL programmatically.
   */
  registerWebhook(url: string): void {
    this.webhooks.add(url);
  }

  getWebhooks(): string[] {
    return this.webhooks.getUrls();
  }

  /**
   * Send an event to all registered webhooks and record it locally.
   */
  async emitEvent(event: AutomationEvent): Promise<Record<string, number>> {
    this.events.push(event);
    return this.webhooks.sendToAll(event);
  }

  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const method = req.method ?? 'GET';
    const url = new URL(req.url ?? '/', 'http://localhost');

    this.setCorsHeaders(res);

    if (method === 'GET' && url.pathname === '/health') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ status: 'ok' }));
      return;
    }

    if (method === 'POST' && url.pathname === '/events') {
      const body = await this.readBody(req);
      let event: AutomationEvent;
      try {
        event = JSON.parse(body);
      } catch (error) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
        return;
      }
      if (!event.type) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'Event type is required' }));
        return;
      }
      this.events.push(event);
      res.statusCode = 201;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(event));
      return;
    }

    if (method === 'GET' && url.pathname === '/events') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(this.events));
      return;
    }

    if (method === 'POST' && url.pathname === '/webhook') {
      const body = await this.readBody(req);
      let data: { url?: string };
      try {
        data = JSON.parse(body);
      } catch (error) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
        return;
      }
      if (!data.url) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'url is required' }));
        return;
      }
      this.webhooks.add(data.url);
      res.statusCode = 201;
      res.end(JSON.stringify({ registered: true }));
      return;
    }

    if (method === 'DELETE' && url.pathname === '/webhook') {
      const body = await this.readBody(req);
      let data: { url?: string };
      try {
        data = JSON.parse(body);
      } catch (error) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
        return;
      }
      if (!data.url) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'url is required' }));
        return;
      }
      try {
        this.webhooks.remove(data.url);
        res.statusCode = 200;
        res.end(JSON.stringify({ removed: true }));
      } catch (error) {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: (error as Error).message }));
      }
      return;
    }

    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'Not found' }));
  }

  private readBody(req: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk.toString();
      });
      req.on('end', () => {
        resolve(body);
      });
      req.on('error', reject);
    });
  }

  private setCorsHeaders(res: ServerResponse): void {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
}
