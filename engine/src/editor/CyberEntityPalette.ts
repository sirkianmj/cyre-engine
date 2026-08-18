export type CyberEntityCategory =
  | 'host'
  | 'network'
  | 'identity'
  | 'service'
  | 'security';

export interface CyberEntityPaletteItem {
  id: string;
  label: string;
  category: CyberEntityCategory;
  description: string;
  defaultProperties: Record<string, unknown>;
}

export const CYBER_ENTITY_PALETTE_ITEMS: CyberEntityPaletteItem[] = [
  {
    id: 'host',
    label: 'Host',
    category: 'host',
    description: 'A generic host device in the cyber environment.',
    defaultProperties: { type: 'host' },
  },
  {
    id: 'server',
    label: 'Server',
    category: 'host',
    description: 'A server host that provides services to the organization.',
    defaultProperties: { type: 'server' },
  },
  {
    id: 'client',
    label: 'Client',
    category: 'host',
    description: 'A client workstation used by employees.',
    defaultProperties: { type: 'client' },
  },
  {
    id: 'router',
    label: 'Router',
    category: 'network',
    description: 'A network router connecting subnets.',
    defaultProperties: { type: 'router' },
  },
  {
    id: 'firewall',
    label: 'Firewall',
    category: 'network',
    description: 'A firewall enforcing network segmentation and policy.',
    defaultProperties: { type: 'firewall' },
  },
  {
    id: 'network',
    label: 'Network',
    category: 'network',
    description: 'A network graph of nodes and edges.',
    defaultProperties: { type: 'network', nodes: [], edges: [] },
  },
  {
    id: 'user',
    label: 'User',
    category: 'identity',
    description: 'A human identity within the simulated organization.',
    defaultProperties: { type: 'user' },
  },
  {
    id: 'account',
    label: 'Account',
    category: 'identity',
    description: 'An account used for authentication and authorization.',
    defaultProperties: { type: 'account' },
  },
  {
    id: 'role',
    label: 'Role',
    category: 'identity',
    description: 'A role that groups permissions and privileges.',
    defaultProperties: { type: 'role' },
  },
  {
    id: 'service',
    label: 'Service',
    category: 'service',
    description: 'A network service running on a host.',
    defaultProperties: { type: 'service' },
  },
  {
    id: 'database',
    label: 'Database',
    category: 'service',
    description: 'A database service storing organizational data.',
    defaultProperties: { type: 'database' },
  },
  {
    id: 'vulnerability',
    label: 'Vulnerability',
    category: 'security',
    description: 'A weakness that may be exploited by an attacker.',
    defaultProperties: { type: 'vulnerability' },
  },
  {
    id: 'security-control',
    label: 'Security Control',
    category: 'security',
    description: 'A defensive control protecting the environment.',
    defaultProperties: { type: 'security-control' },
  },
];

export class CyberEntityPalette {
  private readonly items: Map<string, CyberEntityPaletteItem>;

  constructor(items: CyberEntityPaletteItem[] = CYBER_ENTITY_PALETTE_ITEMS) {
    this.items = new Map<string, CyberEntityPaletteItem>();
    for (const item of items) {
      this.validateItem(item);
      if (this.items.has(item.id)) {
        throw new Error(`Cyber entity palette item "${item.id}" already exists.`);
      }
      this.items.set(item.id, this.copyItem(item));
    }
  }

  listItems(): CyberEntityPaletteItem[] {
    return [...this.items.values()].map((item) => this.copyItem(item));
  }

  getItem(itemId: string): CyberEntityPaletteItem {
    const item = this.items.get(itemId);
    if (!item) {
      throw new Error(`Cyber entity palette item "${itemId}" does not exist.`);
    }
    return this.copyItem(item);
  }

  listCategories(): CyberEntityCategory[] {
    const categories = new Set<CyberEntityCategory>();
    for (const item of this.items.values()) {
      categories.add(item.category);
    }
    return [...categories].sort();
  }

  listItemsByCategory(category: CyberEntityCategory): CyberEntityPaletteItem[] {
    return this.listItems()
      .filter((item) => item.category === category)
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  search(query: string): CyberEntityPaletteItem[] {
    const normalizedQuery = query.trim().toLowerCase();
    if (normalizedQuery === '') {
      return this.listItems();
    }

    return this.listItems().filter((item) => {
      const searchableText = `${item.id} ${item.label} ${item.category} ${item.description}`.toLowerCase();
      return searchableText.includes(normalizedQuery);
    });
  }

  createEntityData(
    itemId: string,
    overrides: Record<string, unknown> = {},
  ): { type: string; properties: Record<string, unknown> } {
    const item = this.getItem(itemId);
    const type = String(item.defaultProperties.type ?? item.id);
    const properties = {
      ...item.defaultProperties,
      ...overrides,
    };

    return {
      type,
      properties: this.deepClone(properties),
    };
  }

  private validateItem(item: CyberEntityPaletteItem): void {
    if (!item.id || item.id.trim() === '') {
      throw new Error('Cyber entity palette item id is required.');
    }
    if (!item.label || item.label.trim() === '') {
      throw new Error('Cyber entity palette item label is required.');
    }
    if (!item.description || item.description.trim() === '') {
      throw new Error('Cyber entity palette item description is required.');
    }
    if (!item.defaultProperties || typeof item.defaultProperties !== 'object') {
      throw new Error('Cyber entity palette item defaultProperties must be an object.');
    }
  }

  private copyItem(item: CyberEntityPaletteItem): CyberEntityPaletteItem {
    return {
      id: item.id,
      label: item.label,
      category: item.category,
      description: item.description,
      defaultProperties: this.deepClone(item.defaultProperties),
    };
  }

  private deepClone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
  }
}
