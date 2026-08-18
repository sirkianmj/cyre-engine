/**
 * WebServer
 * ----------
 * A minimal HTTP server that serves the CYRE web release.
 * Exposes REST API endpoints and a simple HTML dashboard.
 */

import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'node:http';
import { WebApplication } from './WebApplication.js';
import type { ScoringMetrics } from '../game/index.js';

export class WebServer {
  private server: Server;
  private app: WebApplication;

  constructor(app: WebApplication = new WebApplication()) {
    this.app = app;
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
      this.server.listen(port, () => resolve());
      this.server.on('error', reject);
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.close((err) => (err ? reject(err) : resolve()));
    });
  }

  getPort(): number {
    const address = this.server.address();
    if (typeof address === 'object' && address !== null) {
      return address.port;
    }
    return 0;
  }

  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const method = req.method ?? 'GET';
    const url = new URL(req.url ?? '/', 'http://localhost');
    this.setCorsHeaders(res);

    if (method === 'GET' && url.pathname === '/') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html');
      res.end(this.getDashboardHTML());
      return;
    }

    if (method === 'GET' && url.pathname === '/api/health') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ status: 'ok', time: new Date().toISOString() }));
      return;
    }

    if (method === 'GET' && url.pathname === '/api/missions') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(this.app.getAvailableMissions()));
      return;
    }

    // Match /api/missions/:id
    const missionInfoMatch = url.pathname.match(/^\/api\/missions\/([^/]+)$/);
    if (missionInfoMatch && method === 'GET') {
      const missionId = decodeURIComponent(missionInfoMatch[1]);
      try {
        const info = this.app.getMissionInfo(missionId);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(info));
      } catch (error) {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: (error as Error).message }));
      }
      return;
    }

    // Match /api/missions/:id/start
    const missionStartMatch = url.pathname.match(/^\/api\/missions\/([^/]+)\/start$/);
    if (missionStartMatch && method === 'POST') {
      const missionId = decodeURIComponent(missionStartMatch[1]);
      try {
        const result = this.app.startMission(missionId);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(result));
      } catch (error) {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: (error as Error).message }));
      }
      return;
    }

    // Match /api/missions/:id/state
    const missionStateMatch = url.pathname.match(/^\/api\/missions\/([^/]+)\/state$/);
    if (missionStateMatch && method === 'GET') {
      const missionId = decodeURIComponent(missionStateMatch[1]);
      try {
        const state = this.app.getMissionState(missionId);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(state));
      } catch (error) {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: (error as Error).message }));
      }
      return;
    }

    // Match /api/missions/:id/complete
    const missionCompleteMatch = url.pathname.match(/^\/api\/missions\/([^/]+)\/complete$/);
    if (missionCompleteMatch && method === 'POST') {
      const missionId = decodeURIComponent(missionCompleteMatch[1]);
      const body = await this.readBody(req);
      let metrics: ScoringMetrics;
      try {
        metrics = JSON.parse(body);
      } catch (error) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
        return;
      }
      try {
        const result = this.app.completeMission(missionId, metrics);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(result));
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
      req.on('data', (chunk) => (body += chunk.toString()));
      req.on('end', () => resolve(body));
      req.on('error', reject);
    });
  }

  private setCorsHeaders(res: ServerResponse): void {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }

  private getDashboardHTML(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CYRE Web Release</title>
  <style>
    body { font-family: monospace; margin: 2rem; background: #0f1117; color: #e6e6e6; }
    h1 { color: #4af; }
    button { padding: 0.5rem 1rem; margin: 0.25rem; background: #1e293b; color: white; border: 1px solid #4af; cursor: pointer; }
    button:hover { background: #334155; }
    pre { background: #1a1f2b; padding: 1rem; border-radius: 4px; overflow: auto; }
  </style>
</head>
<body>
  <h1>CYRE Web Release</h1>
  <p>Use the API endpoints or the test buttons below.</p>
  <div>
    <button onclick="fetchHealth()">Health</button>
    <button onclick="fetchMissions()">List Missions</button>
  </div>
  <pre id="output">Click a button...</pre>
  <script>
    const output = document.getElementById('output');
    async function fetchJSON(url, options) {
      const res = await fetch(url, options);
      const data = await res.json();
      output.textContent = JSON.stringify(data, null, 2);
    }
    function fetchHealth() { fetchJSON('/api/health'); }
    function fetchMissions() { fetchJSON('/api/missions'); }
  </script>
</body>
</html>`;
  }
}
