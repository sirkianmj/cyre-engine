import { RenderTarget } from './RenderTarget.js';
import { RenderResult } from './RenderResult.js';
import { RenderingCapabilities } from './RenderingCapabilities.js';
import { Scene3D } from './Scene3D.js';

export class Renderer3D {
  readonly id = 'renderer-3d';
  readonly name = 'CYRE 3D Foundation Renderer';
  readonly capabilities: RenderingCapabilities;
  private frameCounter = 0;

  constructor() {
    this.capabilities = new RenderingCapabilities({
      modes: ['3d'],
      features: [
        'scene-graph',
        'meshes',
        'materials',
        'cameras',
        'lights',
        'transforms',
        'basic-render',
        'asset-loading',
      ],
    });
  }

  render(scene: Scene3D, target: RenderTarget): RenderResult {
    scene.validate();
    target.validate();

    if (target.mode !== '3d' && target.mode !== 'headless') {
      throw new Error('Renderer3D only supports 3d or headless render targets.');
    }

    this.frameCounter += 1;

    const commands: Record<string, unknown>[] = [];
    commands.push({
      type: 'beginFrame',
      target: target.toJSON(),
      projection: 'perspective',
    });

    for (const material of scene.getMaterials()) {
      commands.push({ type: 'uploadMaterial', material: material.toJSON() });
    }

    for (const light of scene.getLights()) {
      commands.push({ type: 'applyLight', light: light.toJSON() });
    }

    for (const camera of scene.getCameras()) {
      if (camera.visible) {
        commands.push({ type: 'setCamera', camera: camera.toJSON() });
      }
    }

    for (const mesh of scene.getMeshes()) {
      if (mesh.visible) {
        commands.push({ type: 'drawMesh', mesh: mesh.toJSON() });
      }
    }

    commands.push({ type: 'endFrame' });

    return new RenderResult({
      frameNumber: this.frameCounter,
      backendId: this.id,
      targetId: target.id,
      stats: {
        materialCount: scene.getMaterials().length,
        meshCount: scene.getMeshes().length,
        cameraCount: scene.getCameras().length,
        lightCount: scene.getLights().length,
        commandCount: commands.length,
      },
      data: {
        commands,
        projection: 'perspective',
      },
    });
  }
}
