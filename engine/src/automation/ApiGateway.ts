import { EventBus, type BaseEvent } from '../core/index.js';
import {
  isApiMethod,
  type ApiHandler,
  type ApiMethod,
  type ApiRequest,
  type ApiResponse,
  type ApiRouteDefinition,
  type ApiRouteInfo,
  type ApiGatewaySnapshot,
} from './ApiTypes.js';

interface CompiledRoute {
  method: ApiMethod;
  path: string;
  paramNames: string[];
  regex: RegExp;
  handler: ApiHandler;
}

interface GatewayEvent extends BaseEvent {
  type: 'api:request-handled' | 'api:request-error' | 'api:route-not-found';
  method?: string;
  path?: string;
  statusCode?: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function createResponse(
  statusCode: number,
  body?: unknown,
  headers: Record<string, string> = {},
): ApiResponse {
  const responseHeaders = { ...headers };
  if (body !== undefined && !responseHeaders['content-type']) {
    if (typeof body === 'string') {
      responseHeaders['content-type'] = 'text/plain';
    } else {
      responseHeaders['content-type'] = 'application/json';
    }
  }
  return {
    statusCode,
    headers: responseHeaders,
    body,
  };
}

export class ApiGateway {
  readonly name: string;
  private readonly routes: CompiledRoute[] = [];
  private readonly eventBus: EventBus;
  private readonly routeKeys = new Set<string>();

  constructor(options: { name?: string; eventBus?: EventBus } = {}) {
    if (options.name !== undefined && options.name.trim() === '') {
      throw new Error('ApiGateway name cannot be empty if provided.');
    }
    this.name = options.name ?? 'CYRE API Gateway';
    this.eventBus = options.eventBus ?? new EventBus();
  }

  registerRoute(route: ApiRouteDefinition): void {
    this.validateRouteDefinition(route);

    const key = `${route.method}:${route.path}`;
    if (this.routeKeys.has(key)) {
      throw new Error(`API route ${route.method} ${route.path} is already registered.`);
    }

    const { paramNames, regex } = this.compilePath(route.path);
    this.routes.push({
      method: route.method,
      path: route.path,
      paramNames,
      regex,
      handler: route.handler,
    });
    this.routeKeys.add(key);
  }

  unregisterRoute(method: ApiMethod, path: string): void {
    if (!isApiMethod(method)) {
      throw new Error(`Invalid API method "${method}".`);
    }
    if (!path || path.trim() === '') {
      throw new Error('API route path must be a non-empty string.');
    }

    const key = `${method}:${path}`;
    if (!this.routeKeys.has(key)) {
      throw new Error(`API route ${method} ${path} does not exist.`);
    }

    const index = this.routes.findIndex(
      (route) => route.method === method && route.path === path,
    );
    if (index >= 0) {
      this.routes.splice(index, 1);
    }
    this.routeKeys.delete(key);
  }

  hasRoute(method: ApiMethod, path: string): boolean {
    if (!isApiMethod(method)) return false;
    return this.routeKeys.has(`${method}:${path}`);
  }

  listRoutes(): ApiRouteInfo[] {
    return this.routes.map((route) => ({
      method: route.method,
      path: route.path,
      paramNames: [...route.paramNames],
    }));
  }

  getEventBus(): EventBus {
    return this.eventBus;
  }

  async dispatch(
    input: Omit<ApiRequest, 'params'>,
  ): Promise<ApiResponse> {
    if (!isRecord(input)) {
      return createResponse(500, { error: 'API request must be an object.' });
    }
    if (!isApiMethod(input.method)) {
      return createResponse(405, { error: `Unsupported method "${input.method}".` });
    }
    if (!input.path || typeof input.path !== 'string') {
      return createResponse(400, { error: 'API request path is required.' });
    }

    const query = input.query !== undefined && isRecord(input.query)
      ? { ...input.query }
      : {};
    const headers = input.headers !== undefined && isRecord(input.headers)
      ? { ...input.headers }
      : {};

    const pathMatch = this.matchRoute(input.method, input.path);

    if (!pathMatch) {
      const methodMatchesPath = this.routes.some((route) =>
        this.matchPath(route.regex, input.path),
      );
      const statusCode = methodMatchesPath ? 405 : 404;
      const body = methodMatchesPath
        ? { error: `Method ${input.method} not allowed for path ${input.path}.` }
        : { error: `No route found for ${input.method} ${input.path}.` };

      this.eventBus.publish<GatewayEvent>({
        type: 'api:route-not-found',
        timestamp: Date.now(),
        method: input.method,
        path: input.path,
        statusCode,
      });

      return createResponse(statusCode, body);
    }

    const request: ApiRequest = {
      method: input.method,
      path: input.path,
      query,
      headers,
      params: pathMatch.params,
      body: input.body,
    };

    try {
      const response = await pathMatch.route.handler(request);
      const normalizedStatus =
        Number.isInteger(response.statusCode) &&
        response.statusCode >= 100 &&
        response.statusCode <= 599
          ? response.statusCode
          : 500;
      const normalizedResponse = createResponse(
        normalizedStatus,
        response.body,
        response.headers,
      );

      this.eventBus.publish<GatewayEvent>({
        type: 'api:request-handled',
        timestamp: Date.now(),
        method: input.method,
        path: input.path,
        statusCode: normalizedStatus,
      });

      return normalizedResponse;
    } catch (error) {
      this.eventBus.publish<GatewayEvent>({
        type: 'api:request-error',
        timestamp: Date.now(),
        method: input.method,
        path: input.path,
        statusCode: 500,
      });
      return createResponse(500, {
        error: (error as Error).message ?? 'Unknown API handler error.',
      });
    }
  }

  dispatchSync(
    input: Omit<ApiRequest, 'params'>,
  ): ApiResponse | Promise<ApiResponse> {
    const result = this.dispatch(input);
    return result;
  }

  validate(): void {
    if (!this.name || this.name.trim() === '') {
      throw new Error('ApiGateway name is required.');
    }
    for (const route of this.routes) {
      if (!isApiMethod(route.method)) {
        throw new Error(`Invalid API route method "${route.method}".`);
      }
      if (!route.path || !route.path.startsWith('/')) {
        throw new Error(`API route path "${route.path}" must start with "/".`);
      }
      if (typeof route.handler !== 'function') {
        throw new Error(`API route ${route.method} ${route.path} handler must be a function.`);
      }
    }
  }

  createSnapshot(): ApiGatewaySnapshot {
    const history = this.eventBus.getHistory() as GatewayEvent[];
    const recentEvents = history.slice(-20).map((event) => ({
      type: event.type,
      timestamp: event.timestamp,
      method: event.method,
      path: event.path,
      statusCode: event.statusCode,
    }));

    return {
      name: this.name,
      routeCount: this.routes.length,
      routes: this.listRoutes(),
      eventCount: history.length,
      recentEvents,
      summary: [
        this.name,
        `${this.routes.length} routes`,
        `${history.length} events`,
      ].join(' | '),
    };
  }

  private matchRoute(
    method: ApiMethod,
    path: string,
  ): { route: CompiledRoute; params: Record<string, string> } | undefined {
    for (const route of this.routes) {
      if (route.method !== method) continue;
      const params = this.matchPath(route.regex, path);
      if (params !== undefined) {
        const paramMap: Record<string, string> = {};
        route.paramNames.forEach((name, index) => {
          paramMap[name] = params[index + 1] ?? '';
        });
        return { route, params: paramMap };
      }
    }
    return undefined;
  }

  private matchPath(
    regex: RegExp,
    path: string,
  ): RegExpMatchArray | undefined {
    const match = path.match(regex);
    return match ?? undefined;
  }

  private compilePath(path: string): { paramNames: string[]; regex: RegExp } {
    if (!path || !path.startsWith('/')) {
      throw new Error(`API route path "${path}" must start with "/".`);
    }

    const paramNames: string[] = [];
    const parts = path.split('/').filter((part) => part.length > 0);
    const pattern = parts
      .map((part) => {
        if (part.startsWith(':')) {
          const paramName = part.slice(1);
          if (!paramName || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(paramName)) {
            throw new Error(`Invalid API path parameter "${part}".`);
          }
          paramNames.push(paramName);
          return '([^/]+)';
        }
        return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      })
      .join('/');

    const regex = new RegExp(`^/${pattern}/?$`);
    return { paramNames, regex };
  }

  private validateRouteDefinition(route: ApiRouteDefinition): void {
    if (!isRecord(route)) {
      throw new Error('API route definition must be an object.');
    }
    if (!isApiMethod(route.method)) {
      throw new Error(`Invalid API method "${route.method}".`);
    }
    if (!route.path || !route.path.startsWith('/')) {
      throw new Error(`API route path "${route.path}" must start with "/".`);
    }
    if (typeof route.handler !== 'function') {
      throw new Error('API route handler must be a function.');
    }
    this.compilePath(route.path);
  }
}
