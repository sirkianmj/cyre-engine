import { Camera25D } from './Camera25D.js';
import { Layer25D } from './Layer25D.js';
import { Light25D } from './Light25D.js';
import { Sprite25D } from './Sprite25D.js';

export class Scene25D {
  private layers: Map<string, Layer25D> = new Map();
  private cameras: Map<string, Camera25D> = new Map();
  private lights: Map<string, Light25D> = new Map();
  private sprites: Map<string, Sprite25D> = new Map();

  addLayer(layer: Layer25D): void {
    if (this.layers.has(layer.id)) {
      throw new Error(`Layer25D "${layer.id}" already exists.`);
    }
    this.layers.set(layer.id, layer.clone());
  }

  addCamera(camera: Camera25D): void {
    if (this.cameras.has(camera.id)) {
      throw new Error(`Camera25D "${camera.id}" already exists.`);
    }
    this.cameras.set(camera.id, camera.clone());
  }

  addLight(light: Light25D): void {
    if (this.lights.has(light.id)) {
      throw new Error(`Light25D "${light.id}" already exists.`);
    }
    this.lights.set(light.id, light.clone());
  }

  addSprite(sprite: Sprite25D): void {
    if (this.sprites.has(sprite.id)) {
      throw new Error(`Sprite25D "${sprite.id}" already exists.`);
    }
    if (sprite.layerId && !this.layers.has(sprite.layerId)) {
      throw new Error(`Sprite25D references unknown layer "${sprite.layerId}".`);
    }
    this.sprites.set(sprite.id, sprite.clone());
  }

  getLayer(id: string): Layer25D | undefined {
    return this.layers.get(id)?.clone();
  }

  getCamera(id: string): Camera25D | undefined {
    return this.cameras.get(id)?.clone();
  }

  getLight(id: string): Light25D | undefined {
    return this.lights.get(id)?.clone();
  }

  getSprite(id: string): Sprite25D | undefined {
    return this.sprites.get(id)?.clone();
  }

  getLayers(): Layer25D[] {
    return Array.from(this.layers.values()).map((layer) => layer.clone());
  }

  getCameras(): Camera25D[] {
    return Array.from(this.cameras.values()).map((camera) => camera.clone());
  }

  getLights(): Light25D[] {
    return Array.from(this.lights.values()).map((light) => light.clone());
  }

  getSprites(): Sprite25D[] {
    return Array.from(this.sprites.values()).map((sprite) => sprite.clone());
  }

  removeLayer(id: string): void {
    if (!this.layers.delete(id)) {
      throw new Error(`Layer25D "${id}" does not exist.`);
    }
  }

  removeCamera(id: string): void {
    if (!this.cameras.delete(id)) {
      throw new Error(`Camera25D "${id}" does not exist.`);
    }
  }

  removeLight(id: string): void {
    if (!this.lights.delete(id)) {
      throw new Error(`Light25D "${id}" does not exist.`);
    }
  }

  removeSprite(id: string): void {
    if (!this.sprites.delete(id)) {
      throw new Error(`Sprite25D "${id}" does not exist.`);
    }
  }

  validate(): void {
    for (const sprite of this.sprites.values()) {
      if (sprite.layerId && !this.layers.has(sprite.layerId)) {
        throw new Error(`Sprite25D "${sprite.id}" references missing layer "${sprite.layerId}".`);
      }
    }
  }

  clone(): Scene25D {
    return Scene25D.fromJSON(this.toJSON());
  }

  toJSON(): Record<string, unknown> {
    return {
      layers: this.getLayers().map((layer) => layer.toJSON()),
      cameras: this.getCameras().map((camera) => camera.toJSON()),
      lights: this.getLights().map((light) => light.toJSON()),
      sprites: this.getSprites().map((sprite) => sprite.toJSON()),
    };
  }

  static fromJSON(data: Record<string, unknown>): Scene25D {
    const scene = new Scene25D();

    const layers = Array.isArray(data.layers)
      ? (data.layers as Record<string, unknown>[])
      : [];
    for (const layer of layers) {
      scene.addLayer(Layer25D.fromJSON(layer));
    }

    const cameras = Array.isArray(data.cameras)
      ? (data.cameras as Record<string, unknown>[])
      : [];
    for (const camera of cameras) {
      scene.addCamera(Camera25D.fromJSON(camera));
    }

    const lights = Array.isArray(data.lights)
      ? (data.lights as Record<string, unknown>[])
      : [];
    for (const light of lights) {
      scene.addLight(Light25D.fromJSON(light));
    }

    const sprites = Array.isArray(data.sprites)
      ? (data.sprites as Record<string, unknown>[])
      : [];
    for (const sprite of sprites) {
      scene.addSprite(Sprite25D.fromJSON(sprite));
    }

    scene.validate();
    return scene;
  }
}
