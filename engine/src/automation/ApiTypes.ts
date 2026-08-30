export const API_METHODS = [
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
] as const;

export type ApiMethod = (typeof API_METHODS)[number];

export function isApiMethod(value: string): value is ApiMethod {
  return (API_METHODS as readonly string[]).includes(value);
}

export interface ApiRequest {
  method: ApiMethod;
  path: string;
  query?: Record<string, string>;
  headers?: Record<string, string>;
  params?: Record<string, string>;
  body?: unknown;
}

export interface ApiResponse {
  statusCode: number;
  headers?: Record<string, string>;
  body?: unknown;
}

export type ApiHandler = (
  request: ApiRequest,
) => ApiResponse | Promise<ApiResponse>;

export interface ApiRouteDefinition {
  method: ApiMethod;
  path: string;
  handler: ApiHandler;
}

export interface ApiRouteInfo {
  method: ApiMethod;
  path: string;
  paramNames: string[];
}

export interface ApiGatewaySnapshot {
  name: string;
  routeCount: number;
  routes: ApiRouteInfo[];
  eventCount: number;
  recentEvents: Array<{
    type: string;
    timestamp: number;
    method?: string;
    path?: string;
    statusCode?: number;
  }>;
  summary: string;
}
