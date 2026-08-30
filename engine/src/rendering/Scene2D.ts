import { Layer2D } from './Layer2D.js';
import { Camera2D } from './Camera2D.js';
import { Sprite2D } from './Sprite2D.js';
import { ParticleSystem2D } from './ParticleSystem2D.js';
import { AnimationClip2D } from './AnimationClip2D.js';

export class Scene2D {
  private layers: Map<string, Layer2D> = new Map();
  private cameras: Map<string, Camera2D> = new Map();
  private sprites: Map<string, Sprite2D> = new Map();
  private particleSystems: Map<string, ParticleSystem2D> = new Map();
  private animationClips: Map<string, AnimationClip2D> = new Map();

  addLayer(layer: Layer2D): void {
    if (this.layers.has(layer.id)) {
      throw new Error(`Layer2D "${layer.id}" already exists.`);
    }
    this.layers.set(layer.id, layer.clone());
  }

  addCamera(camera: Camera2D): void {
    if (this.cameras.has(camera.id)) {
      throw new Error(`Camera2D "${camera.id}" already exists.`);
    }
    this.cameras.set(camera.id, camera.clone());
  }

  addSprite(sprite: Sprite2D): void {
    if (this.sprites.has(sprite.id)) {
      throw new Error(`Sprite2D "${sprite.id}" already exists.`);
    }
    if (sprite.layerId && !this.layers.has(sprite.layerId)) {
      throw new Error(`Sprite2D references unknown layer "${sprite.layerId}".`);
    }
    this.sprites.set(sprite.id, sprite.clone());
  }

  addParticleSystem(ps: ParticleSystem2D): void {
    if (this.particleSystems.has(ps.id)) {
      throw new Error(`ParticleSystem2D "${ps.id}" already exists.`);
    }
    if (ps.layerId && !this.layers.has(ps.layerId)) {
      throw new Error(`ParticleSystem2D references unknown layer "${ps.layerId}".`);
    }
    this.particleSystems.set(ps.id, ps.clone());
  }

  addAnimationClip(clip: AnimationClip2D): void {
    if (this.animationClips.has(clip.id)) {
      throw new Error(`AnimationClip2D "${clip.id}" already exists.`);
    }
    this.animationClips.set(clip.id, clip.clone());
  }

  getLayer(id: string): Layer2D | undefined {
    return this.layers.get(id)?.clone();
  }

  getCamera(id: string): Camera2D | undefined {
    return this.cameras.get(id)?.clone();
  }

  getSprite(id: string): Sprite2D | undefined {
    return this.sprites.get(id)?.clone();
  }

  getParticleSystem(id: string): ParticleSystem2D | undefined {
    return this.particleSystems.get(id)?.clone();
  }

  getAnimationClip(id: string): AnimationClip2D | undefined {
    return this.animationClips.get(id)?.clone();
  }

  getLayers(): Layer2D[] {
    return Array.from(this.layers.values()).map((layer) => layer.clone());
  }

  getCameras(): Camera2D[] {
    return Array.from(this.cameras.values()).map((camera) => camera.clone());
  }

  getSprites(): Sprite2D[] {
    return Array.from(this.sprites.values()).map((sprite) => sprite.clone());
  }

  getParticleSystems(): ParticleSystem2D[] {
    return Array.from(this.particleSystems.values()).map((ps) => ps.clone());
  }

  getAnimationClips(): AnimationClip2D[] {
    return Array.from(this.animationClips.values()).map((clip) => clip.clone());
  }

  removeLayer(id: string): void {
    if (!this.layers.delete(id)) {
      throw new Error(`Layer2D "${id}" does not exist.`);
    }
  }

  removeCamera(id: string): void {
    if (!this.cameras.delete(id)) {
      throw new Error(`Camera2D "${id}" does not exist.`);
    }
  }

  removeSprite(id: string): void {
    if (!this.sprites.delete(id)) {
      throw new Error(`Sprite2D "${id}" does not exist.`);
    }
  }

  removeParticleSystem(id: string): void {
    if (!this.particleSystems.delete(id)) {
      throw new Error(`ParticleSystem2D "${id}" does not exist.`);
    }
  }

  removeAnimationClip(id: string): void {
    if (!this.animationClips.delete(id)) {
      throw new Error(`AnimationClip2D "${id}" does not exist.`);
    }
  }

  validate(): void {
    for (const sprite of this.sprites.values()) {
      if (sprite.layerId && !this.layers.has(sprite.layerId)) {
        throw new Error(`Sprite2D "${sprite.id}" references missing layer "${sprite.layerId}".`);
      }
    }
    for (const ps of this.particleSystems.values()) {
      if (ps.layerId && !this.layers.has(ps.layerId)) {
        throw new Error(`ParticleSystem2D "${ps.id}" references missing layer "${ps.layerId}".`);
      }
    }
  }

  clone(): Scene2D {
    return Scene2D.fromJSON(this.toJSON());
  }

  toJSON(): Record<string, unknown> {
    return {
      layers: this.getLayers().map((layer) => layer.toJSON()),
      cameras: this.getCameras().map((camera) => camera.toJSON()),
      sprites: this.getSprites().map((sprite) => sprite.toJSON()),
      particleSystems: this.getParticleSystems().map((ps) => ps.toJSON()),
      animationClips: this.getAnimationClips().map((clip) => clip.toJSON()),
    };
  }

  static fromJSON(data: Record<string, unknown>): Scene2D {
    const scene = new Scene2D();

    const layers = Array.isArray(data.layers)
      ? (data.layers as Record<string, unknown>[])
      : [];
    for (const layer of layers) {
      scene.addLayer(Layer2D.fromJSON(layer));
    }

    const cameras = Array.isArray(data.cameras)
      ? (data.cameras as Record<string, unknown>[])
      : [];
    for (const camera of cameras) {
      scene.addCamera(Camera2D.fromJSON(camera));
    }

    const sprites = Array.isArray(data.sprites)
      ? (data.sprites as Record<string, unknown>[])
      : [];
    for (const sprite of sprites) {
      scene.addSprite(Sprite2D.fromJSON(sprite));
    }

    const particleSystems = Array.isArray(data.particleSystems)
      ? (data.particleSystems as Record<string, unknown>[])
      : [];
    for (const ps of particleSystems) {
      scene.addParticleSystem(ParticleSystem2D.fromJSON(ps));
    }

    const animationClips = Array.isArray(data.animationClips)
      ? (data.animationClips as Record<string, unknown>[])
      : [];
    for (const clip of animationClips) {
      scene.addAnimationClip(AnimationClip2D.fromJSON(clip));
    }

    scene.validate();
    return scene;
  }
}
