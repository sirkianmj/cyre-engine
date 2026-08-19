import type { RenderBackend } from './RenderBackend.js';
import { RenderingCapabilities } from './RenderingCapabilities.js';
import { RenderTarget } from './RenderTarget.js';
import { RenderRequest } from './RenderRequest.js';
import { RenderResult } from './RenderResult.js';
import { SceneGraph } from './SceneGraph.js';

export class SimpleSceneGraphBackend implements RenderBackend {
  readonly id = 'simple-scene-graph';
  readonly name = 'Simple Scene Graph Backend';
  readonly capabilities: RenderingCapabilities;
  private frameCounter = 0;

  constructor() {
    this.capabilities = new RenderingCapabilities({
      modes: ['2d'],
      features: ['scene-graph', 'basic-render'],
    });
  }

  render(
    target: RenderTarget,
    request: RenderRequest,
    scene?: SceneGraph,
  ): RenderResult {
    target.validate();
    request.validate();

    if (!scene) {
      throw new Error('SimpleSceneGraphBackend requires a SceneGraph.');
    }

    scene.validate();
    this.frameCounter += 1;

    return new RenderResult({
      frameNumber: this.frameCounter,
      backendId: this.id,
      targetId: target.id,
      renderedAt: Date.now(),
      stats: {
        nodeCount: scene.getNodes().length,
        edgeCount: scene.getEdges().length,
      },
      data: {
        mode: target.mode,
        width: target.width,
        height: target.height,
      },
    });
  }
}
