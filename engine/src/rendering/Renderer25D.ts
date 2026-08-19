import { RenderTarget } from './RenderTarget.js';
import { RenderResult } from './RenderResult.js';
import { RenderingCapabilities } from './RenderingCapabilities.js';
import { Scene25D } from './Scene25D.js';

export class Renderer25D {
  readonly id = 'renderer-2.5d';
  readonly name = 'CYRE 2.5D Renderer';
  readonly capabilities: RenderingCapabilities;
  private frameCounter = 0;

  constructor() {
    this.capabilities = new RenderingCapabilities({
      modes: ['2.5d'],
      features: [
        'depth',
        'perspective-camera',
        'layers',
        'sprites',
        'spatial-presentation',
        'lighting',
        'camera-perspective',
      ],
    });
  }

  render(scene: Scene25D, target: RenderTarget): RenderResult {
    scene.validate();
    target.validate();

    if (target.mode !== '2.5d' && target.mode !== 'headless') {
      throw new Error('Renderer25D only supports 2.5d or headless render targets.');
    }

    this.frameCounter += 1;

    const commands: Record<string, unknown>[] = [];
    const layers = scene.getLayers().sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return a.depth - b.depth;
    });

    commands.push({ type: 'beginFrame', target: target.toJSON() });

    for (const layer of layers) {
      if (!layer.visible) continue;

      commands.push({
        type: 'beginLayer',
        layer: layer.toJSON(),
        depth: layer.depth,
        order: layer.order,
      });

      const sprites = scene.getSprites()
        .filter((sprite) => sprite.layerId === layer.id && sprite.visible)
        .sort((a, b) => a.transform.z - b.transform.z);

      for (const sprite of sprites) {
        commands.push({ type: 'drawSprite', sprite: sprite.toJSON() });
      }

      commands.push({ type: 'endLayer', layerId: layer.id });
    }

    for (const light of scene.getLights()) {
      commands.push({ type: 'applyLight', light: light.toJSON() });
    }

    for (const camera of scene.getCameras()) {
      if (camera.visible) {
        commands.push({
          type: 'setCamera',
          camera: camera.toJSON(),
          projection: 'perspective',
        });
      }
    }

    commands.push({ type: 'endFrame' });

    return new RenderResult({
      frameNumber: this.frameCounter,
      backendId: this.id,
      targetId: target.id,
      stats: {
        layerCount: scene.getLayers().length,
        cameraCount: scene.getCameras().length,
        lightCount: scene.getLights().length,
        spriteCount: scene.getSprites().length,
        commandCount: commands.length,
      },
      data: {
        commands,
        projection: 'perspective',
        depthSorting: 'far-to-near',
      },
    });
  }
}
