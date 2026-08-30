import { AssetDescriptor } from './AssetDescriptor.js';
import { AssetManager } from './AssetManager.js';
import { isAssetType, type AssetType } from './AssetTypes.js';

export type AssetSortField = 'id' | 'name' | 'type';
export type AssetSortDirection = 'asc' | 'desc';

export interface AssetBrowserQuery {
  searchText?: string;
  type?: AssetType;
  tags?: string[];
  sortBy?: AssetSortField;
  sortDirection?: AssetSortDirection;
  page?: number;
  pageSize?: number;
}

export interface AssetBrowserPage {
  items: AssetDescriptor[];
  total: number;
  page: number;
  pageSize: number | null;
  totalPages: number | null;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function matchesSearchText(asset: AssetDescriptor, searchText: string): boolean {
  const term = searchText.trim().toLowerCase();
  if (term === '') return true;

  if (asset.id.toLowerCase().includes(term)) return true;
  if (asset.name.toLowerCase().includes(term)) return true;
  if (asset.uri?.toLowerCase().includes(term)) return true;
  if (asset.path?.toLowerCase().includes(term)) return true;
  if (asset.mimeType?.toLowerCase().includes(term)) return true;
  if (asset.version?.toLowerCase().includes(term)) return true;
  if (asset.tags.some((tag) => tag.toLowerCase().includes(term))) return true;

  if (asset.metadata !== undefined) {
    const metadataText = JSON.stringify(asset.metadata).toLowerCase();
    if (metadataText.includes(term)) return true;
  }

  return false;
}

export class AssetBrowser {
  private readonly manager: AssetManager;

  constructor(manager: AssetManager) {
    this.manager = manager;
  }

  query(query: AssetBrowserQuery = {}): AssetBrowserPage {
    if (query.type !== undefined && !isAssetType(query.type)) {
      throw new Error(`Invalid asset type "${query.type}".`);
    }
    if (query.tags !== undefined) {
      if (!Array.isArray(query.tags)) {
        throw new Error('AssetBrowserQuery tags must be an array.');
      }
      for (const tag of query.tags) {
        if (typeof tag !== 'string' || tag.trim() === '') {
          throw new Error('AssetBrowserQuery tags must be non-empty strings.');
        }
      }
    }
    if (
      query.page !== undefined &&
      (!Number.isInteger(query.page) || query.page < 1)
    ) {
      throw new Error('AssetBrowserQuery page must be a positive integer.');
    }
    if (
      query.pageSize !== undefined &&
      (!Number.isInteger(query.pageSize) || query.pageSize < 1)
    ) {
      throw new Error('AssetBrowserQuery pageSize must be a positive integer.');
    }

    const sortBy = query.sortBy ?? 'name';
    if (!['id', 'name', 'type'].includes(sortBy)) {
      throw new Error(`Invalid asset sort field "${sortBy}".`);
    }
    const sortDirection = query.sortDirection ?? 'asc';
    if (!['asc', 'desc'].includes(sortDirection)) {
      throw new Error(`Invalid asset sort direction "${sortDirection}".`);
    }

    let items = this.manager.list();

    if (query.type !== undefined) {
      items = items.filter((asset) => asset.type === query.type);
    }

    if (query.tags !== undefined && query.tags.length > 0) {
      items = items.filter((asset) =>
        query.tags!.every((tag) => asset.tags.includes(tag)),
      );
    }

    if (query.searchText !== undefined && query.searchText.trim() !== '') {
      items = items.filter((asset) => matchesSearchText(asset, query.searchText!));
    }

    items.sort((a, b) => {
      const left = a[sortBy];
      const right = b[sortBy];
      const comparison = left.localeCompare(right);
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    const total = items.length;
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? null;
    const totalPages = pageSize === null ? null : Math.ceil(total / pageSize);

    if (pageSize !== null) {
      const startIndex = (page - 1) * pageSize;
      items = items.slice(startIndex, startIndex + pageSize);
    }

    return {
      items,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  listAvailableTypes(): AssetType[] {
    const types = new Set(this.manager.list().map((asset) => asset.type));
    return Array.from(types).sort();
  }

  listAvailableTags(): string[] {
    const tags = new Set<string>();
    for (const asset of this.manager.list()) {
      for (const tag of asset.tags) {
        tags.add(tag);
      }
    }
    return Array.from(tags).sort();
  }

  validate(): void {
    this.manager.validate();
  }
}
