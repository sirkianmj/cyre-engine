export interface ParticleSystem2DOptions {
  id: string;
  name: string;
  layerId?: string;
  maxParticles: number;
  emissionRate: number;
  lifetime: number;
  speed: number;
  spread?: number;
  color?: string;
  visible?: boolean;
}

export class ParticleSystem2D {
  readonly id: string;
  readonly name: string;
  readonly layerId?: string;
  readonly maxParticles: number;
  readonly emissionRate: number;
  readonly lifetime: number;
  readonly speed: number;
  readonly spread: number;
  readonly color?: string;
  readonly visible: boolean;

  constructor(options: ParticleSystem2DOptions) {
    if (!options.id || options.id.trim() === '') {
      throw new Error('ParticleSystem2D id is required.');
    }
    if (!options.name || options.name.trim() === '') {
      throw new Error('ParticleSystem2D name is required.');
    }
    if (options.layerId !== undefined && options.layerId.trim() === '') {
      throw new Error('ParticleSystem2D layerId cannot be empty if provided.');
    }
    if (!Number.isFinite(options.maxParticles) || options.maxParticles <= 0) {
      throw new Error('ParticleSystem2D maxParticles must be a positive finite number.');
    }
    if (!Number.isFinite(options.emissionRate) || options.emissionRate < 0) {
      throw new Error('ParticleSystem2D emissionRate must be a non-negative finite number.');
    }
    if (!Number.isFinite(options.lifetime) || options.lifetime <= 0) {
      throw new Error('ParticleSystem2D lifetime must be a positive finite number.');
    }
    if (!Number.isFinite(options.speed) || options.speed < 0) {
      throw new Error('ParticleSystem2D speed must be a non-negative finite number.');
    }
    if (
      options.spread !== undefined &&
      (!Number.isFinite(options.spread) || options.spread < 0)
    ) {
      throw new Error('ParticleSystem2D spread must be a non-negative finite number.');
    }

    this.id = options.id;
    this.name = options.name;
    this.layerId = options.layerId;
    this.maxParticles = options.maxParticles;
    this.emissionRate = options.emissionRate;
    this.lifetime = options.lifetime;
    this.speed = options.speed;
    this.spread = options.spread ?? 0;
    this.color = options.color;
    this.visible = options.visible ?? true;
  }

  validate(): void {
    // Constructor already validated.
  }

  clone(): ParticleSystem2D {
    return ParticleSystem2D.fromJSON(this.toJSON());
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      name: this.name,
      layerId: this.layerId,
      maxParticles: this.maxParticles,
      emissionRate: this.emissionRate,
      lifetime: this.lifetime,
      speed: this.speed,
      spread: this.spread,
      color: this.color,
      visible: this.visible,
    };
  }

  static fromJSON(data: Record<string, unknown>): ParticleSystem2D {
    return new ParticleSystem2D({
      id: typeof data.id === 'string' ? data.id : '',
      name: typeof data.name === 'string' ? data.name : '',
      layerId: typeof data.layerId === 'string' ? data.layerId : undefined,
      maxParticles: typeof data.maxParticles === 'number' ? data.maxParticles : 0,
      emissionRate: typeof data.emissionRate === 'number' ? data.emissionRate : 0,
      lifetime: typeof data.lifetime === 'number' ? data.lifetime : 0,
      speed: typeof data.speed === 'number' ? data.speed : 0,
      spread: typeof data.spread === 'number' ? data.spread : 0,
      color: typeof data.color === 'string' ? data.color : undefined,
      visible: typeof data.visible === 'boolean' ? data.visible : true,
    });
  }
}
