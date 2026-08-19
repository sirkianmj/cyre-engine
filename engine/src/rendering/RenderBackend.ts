import type { RenderingCapabilities } from './RenderingCapabilities.js';
import type { RenderTarget } from './RenderTarget.js';
import type { RenderRequest } from './RenderRequest.js';
import type { RenderResult } from './RenderResult.js';
import type { SceneGraph } from './SceneGraph.js';

export interface RenderBackend {
  readonly id: string;
  readonly name: string;
  readonly capabilities: RenderingCapabilities;

  initialize?(): void | Promise<void>;
  render(
    target: RenderTarget,
    request: RenderRequest,
    scene?: SceneGraph,
  ): RenderResult;
  dispose?(): void | Promise<void>;
}
