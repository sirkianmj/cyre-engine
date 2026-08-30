import { RenderTarget } from './RenderTarget.js';
import { RenderResult } from './RenderResult.js';
import { Scene2D } from './Scene2D.js';
import { RenderingCapabilities } from './RenderingCapabilities.js';

export class Renderer2D {
  readonly id = 'renderer-2d';
  readonly name = 'CYRE 2D Renderer';
  readonly capabilities: RenderingCapabilities;
  private frameCounter = 0;

  constructor() {
    this.capabilities = new RenderingCapabilities({
      modes: ['2d'],
      features: ['sprites', 'layers', 'cameras', 'transforms', 'ui', 'animation', 'particles'],
    });
  }

  render(scene: Scene2D, target: RenderTarget): RenderResult {
    scene.validate();
    target.validate();

    if (target.mode !== '2d' && target.mode !== 'headless') {
      throw new Error('Renderer2D only supports 2d or headless render targets.');
    }

    this.frameCounter += 1;

    const commands: Record<string, unknown>[] = [];
    const layers = scene.getLayers().sort((a, b) => a.zIndex - b.zIndex);

    for (const layer of layers) {
      if (!layer.visible) continue;

      commands.push({ type: 'beginLayer', layer: layer.toJSON() });

      const sprites = scene.getSprites().filter(
        (sprite) => sprite.layerId === layer.id && sprite.visible,
      );
      for (const sprite of sprites) {
        commands.push({ type: 'drawSprite', sprite: sprite.toJSON() });
      }

      const particles = scene.getParticleSystems().filter(
        (ps) => ps.layerId === layer.id && ps.visible,
      );
      for (const ps of particles) {
        commands.push({ type: 'emitParticles', particleSystem: ps.toJSON() });
      }

      commands.push({ type: 'endLayer', layerId: layer.id });
    }

    for (const camera of scene.getCameras()) {
      if (camera.visible) {
        commands.push({ type: 'setCamera', camera: camera.toJSON() });
      }
    }

    return new RenderResult({
      frameNumber: this.frameCounter,
      backendId: this.id,
      targetId: target.id,
      stats: {
        layerCount: scene.getLayers().length,
        spriteCount: scene.getSprites().length,
        cameraCount: scene.getCameras().length,
        particleSystemCount: scene.getParticleSystems().length,
        animationClipCount: scene.getAnimationClips().length,
        commandCount: commands.length,
      },
      data: { commands },
    });
  }
}
