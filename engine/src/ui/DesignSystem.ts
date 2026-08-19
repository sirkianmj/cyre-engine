export type DesignSystemCategory =
  | 'color'
  | 'typography'
  | 'spacing'
  | 'motion'
  | 'radii'
  | 'elevation'
  | 'component';

export type DesignSystemTokenValue = string | number;

export interface DesignSystemToken {
  name: string;
  category: DesignSystemCategory;
  value: DesignSystemTokenValue;
  description?: string;
}

export type DesignSystemTokenMap = Map<string, DesignSystemToken>;

const CATEGORIES: DesignSystemCategory[] = [
  'color',
  'typography',
  'spacing',
  'motion',
  'radii',
  'elevation',
  'component',
];

export class DesignSystem {
  private readonly tokens: DesignSystemTokenMap = new Map();

  constructor(initialTokens: DesignSystemToken[] = []) {
    if (!Array.isArray(initialTokens)) {
      throw new Error('Design system initial tokens must be an array.');
    }

    for (const token of initialTokens) {
      this.addToken(token);
    }
  }

  static createDefault(): DesignSystem {
    return new DesignSystem([
      {
        name: 'color.background',
        category: 'color',
        value: '#0b0f17',
        description: 'Primary application background.',
      },
      {
        name: 'color.surface',
        category: 'color',
        value: '#111827',
        description: 'Elevated surface color.',
      },
      {
        name: 'color.primary',
        category: 'color',
        value: '#22d3ee',
        description: 'Primary action and accent color.',
      },
      {
        name: 'color.danger',
        category: 'color',
        value: '#ef4444',
        description: 'Danger or destructive action color.',
      },
      {
        name: 'typography.family',
        category: 'typography',
        value: 'Inter, sans-serif',
      },
      {
        name: 'typography.baseSize',
        category: 'typography',
        value: 14,
      },
      {
        name: 'spacing.md',
        category: 'spacing',
        value: 16,
      },
      {
        name: 'motion.fast',
        category: 'motion',
        value: 120,
      },
      {
        name: 'radii.medium',
        category: 'radii',
        value: 8,
      },
      {
        name: 'elevation.panel',
        category: 'elevation',
        value: 2,
      },
      {
        name: 'component.button.height',
        category: 'component',
        value: 36,
      },
    ]);
  }

  addToken(token: DesignSystemToken): void {
    this.validateToken(token);

    if (this.tokens.has(token.name)) {
      throw new Error(`Design system token "${token.name}" already exists.`);
    }

    this.tokens.set(token.name, this.copyToken(token));
  }

  hasToken(tokenName: string): boolean {
    this.validateTokenName(tokenName);
    return this.tokens.has(tokenName);
  }

  getToken(tokenName: string): DesignSystemToken {
    this.validateTokenName(tokenName);
    const token = this.getRequiredInternalToken(tokenName);
    return this.copyToken(token);
  }

  getTokenValue(tokenName: string): DesignSystemTokenValue {
    return this.getRequiredInternalToken(tokenName).value;
  }

  setTokenValue(tokenName: string, value: DesignSystemTokenValue): void {
    const token = this.getRequiredInternalToken(tokenName);
    this.validateTokenValue(value);
    token.value = value;
  }

  listTokens(): DesignSystemToken[] {
    return [...this.tokens.values()]
      .map((token) => this.copyToken(token))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  listTokensByCategory(category: DesignSystemCategory): DesignSystemToken[] {
    this.validateCategory(category);
    return this.listTokens().filter((token) => token.category === category);
  }

  listCategories(): DesignSystemCategory[] {
    const categories = new Set<DesignSystemCategory>();
    for (const token of this.tokens.values()) {
      categories.add(token.category);
    }
    return [...categories].sort();
  }

  resolveComponentToken(component: string, property: string, state?: string): DesignSystemTokenValue {
    if (!component || component.trim() === '') {
      throw new Error('Design system component name is required.');
    }
    if (!property || property.trim() === '') {
      throw new Error('Design system component property is required.');
    }

    const exactStateToken = state
      ? `component.${component}.${property}.${state}`
      : undefined;

    if (exactStateToken && this.tokens.has(exactStateToken)) {
      return this.getTokenValue(exactStateToken);
    }

    const baseToken = `component.${component}.${property}`;
    if (this.tokens.has(baseToken)) {
      return this.getTokenValue(baseToken);
    }

    throw new Error(
      `Design system component token "component.${component}.${property}" does not exist.`,
    );
  }

  exportTokens(): Record<string, DesignSystemToken> {
    const exported: Record<string, DesignSystemToken> = {};
    for (const [name, token] of this.tokens.entries()) {
      exported[name] = this.copyToken(token);
    }
    return exported;
  }

  private getRequiredInternalToken(tokenName: string): DesignSystemToken {
    const token = this.tokens.get(tokenName);
    if (!token) {
      throw new Error(`Design system token "${tokenName}" does not exist.`);
    }
    return token;
  }

  private validateToken(token: DesignSystemToken): void {
    if (!token || typeof token !== 'object') {
      throw new Error('Design system token must be an object.');
    }
    this.validateTokenName(token.name);
    this.validateCategory(token.category);
    this.validateTokenValue(token.value);
  }

  private validateTokenName(name: string): void {
    if (!name || name.trim() === '') {
      throw new Error('Design system token name is required.');
    }
  }

  private validateTokenValue(value: DesignSystemTokenValue): void {
    if (typeof value !== 'string' && typeof value !== 'number') {
      throw new Error('Design system token value must be a string or number.');
    }
    if (typeof value === 'string' && value.trim() === '') {
      throw new Error('Design system token string value cannot be empty.');
    }
    if (typeof value === 'number' && !Number.isFinite(value)) {
      throw new Error('Design system token number value must be finite.');
    }
  }

  private validateCategory(category: DesignSystemCategory): void {
    if (!CATEGORIES.includes(category)) {
      throw new Error(`Invalid design system category "${category}".`);
    }
  }

  private copyToken(token: DesignSystemToken): DesignSystemToken {
    return {
      name: token.name,
      category: token.category,
      value: token.value,
      description: token.description,
    };
  }
}
