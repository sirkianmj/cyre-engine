export type InspectorPropertyType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'object'
  | 'array';

export interface InspectorProperty {
  key: string;
  label: string;
  type: InspectorPropertyType;
  value: unknown;
  category?: string;
  editable?: boolean;
  description?: string;
}

export interface InspectorTarget {
  id: string;
  name: string;
  properties: InspectorProperty[];
}

export class Inspector {
  private target?: InspectorTarget;
  private readonly originalValues = new Map<string, unknown>();

  selectTarget(id: string, name: string, properties: InspectorProperty[]): void {
    if (!id || id.trim() === '') {
      throw new Error('Inspector target id is required.');
    }
    if (!name || name.trim() === '') {
      throw new Error('Inspector target name is required.');
    }
    if (!Array.isArray(properties)) {
      throw new Error('Inspector target properties must be an array.');
    }

    const seenKeys = new Set<string>();
    const copiedProperties = properties.map((property) => {
      this.validateProperty(property);
      if (seenKeys.has(property.key)) {
        throw new Error(`Duplicate inspector property key "${property.key}".`);
      }
      seenKeys.add(property.key);
      return this.copyProperty(property);
    });

    this.target = {
      id,
      name,
      properties: copiedProperties,
    };

    this.originalValues.clear();
    for (const property of copiedProperties) {
      this.originalValues.set(property.key, this.deepClone(property.value));
    }
  }

  clearSelection(): void {
    this.target = undefined;
    this.originalValues.clear();
  }

  getSelectedTargetId(): string | undefined {
    return this.target?.id;
  }

  getSelectedTarget(): InspectorTarget | undefined {
    if (!this.target) {
      return undefined;
    }
    return {
      id: this.target.id,
      name: this.target.name,
      properties: this.target.properties.map((property) => this.copyProperty(property)),
    };
  }

  getProperties(category?: string): InspectorProperty[] {
    const target = this.requireTarget();
    const properties = target.properties.map((property) => this.copyProperty(property));
    if (category === undefined) {
      return properties;
    }
    return properties.filter((property) => property.category === category);
  }

  getProperty(key: string): InspectorProperty {
    const target = this.requireTarget();
    return this.copyProperty(this.findProperty(target, key));
  }

  getPropertyValue(key: string): unknown {
    const target = this.requireTarget();
    return this.deepClone(this.findProperty(target, key).value);
  }

  setPropertyValue(key: string, value: unknown): void {
    const target = this.requireTarget();
    const property = this.findProperty(target, key);
    this.validateValueForType(property, value);
    property.value = this.deepClone(value);
  }

  isPropertyModified(key: string): boolean {
    const target = this.requireTarget();
    const property = this.findProperty(target, key);
    const originalValue = this.originalValues.get(key);
    return JSON.stringify(property.value) !== JSON.stringify(originalValue);
  }

  resetProperty(key: string): void {
    const target = this.requireTarget();
    const property = this.findProperty(target, key);
    if (!this.originalValues.has(key)) {
      throw new Error(`Inspector property "${key}" does not have an original value.`);
    }
    property.value = this.deepClone(this.originalValues.get(key));
  }

  resetAllProperties(): void {
    const target = this.requireTarget();
    for (const property of target.properties) {
      if (this.originalValues.has(property.key)) {
        property.value = this.deepClone(this.originalValues.get(property.key));
      }
    }
  }

  listCategories(): string[] {
    const target = this.requireTarget();
    const categories = new Set<string>();
    for (const property of target.properties) {
      if (property.category && property.category.trim() !== '') {
        categories.add(property.category);
      }
    }
    return [...categories].sort();
  }

  search(query: string): InspectorProperty[] {
    const target = this.requireTarget();
    const normalizedQuery = query.trim().toLowerCase();
    const properties = target.properties.map((property) => this.copyProperty(property));

    if (normalizedQuery === '') {
      return properties;
    }

    return properties.filter((property) => {
      const searchableText = [
        property.key,
        property.label,
        property.type,
        property.category ?? '',
        property.description ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return searchableText.includes(normalizedQuery);
    });
  }

  private requireTarget(): InspectorTarget {
    if (!this.target) {
      throw new Error('No inspector target selected.');
    }
    return this.target;
  }

  private findProperty(target: InspectorTarget, key: string): InspectorProperty {
    if (!key || key.trim() === '') {
      throw new Error('Inspector property key is required.');
    }
    const property = target.properties.find((entry) => entry.key === key);
    if (!property) {
      throw new Error(`Inspector property "${key}" does not exist.`);
    }
    return property;
  }

  private validateProperty(property: InspectorProperty): void {
    if (!property.key || property.key.trim() === '') {
      throw new Error('Inspector property key is required.');
    }
    if (!property.label || property.label.trim() === '') {
      throw new Error('Inspector property label is required.');
    }
    if (!['string', 'number', 'boolean', 'object', 'array'].includes(property.type)) {
      throw new Error(`Invalid inspector property type "${property.type}".`);
    }
    this.validateValueForType(property, property.value);
  }

  private validateValueForType(property: InspectorProperty, value: unknown): void {
    switch (property.type) {
      case 'string':
        if (typeof value !== 'string') {
          throw new Error(`Inspector property "${property.key}" expects a string value.`);
        }
        break;
      case 'number':
        if (typeof value !== 'number' || !Number.isFinite(value)) {
          throw new Error(`Inspector property "${property.key}" expects a finite number value.`);
        }
        break;
      case 'boolean':
        if (typeof value !== 'boolean') {
          throw new Error(`Inspector property "${property.key}" expects a boolean value.`);
        }
        break;
      case 'object':
        if (value === null || typeof value !== 'object' || Array.isArray(value)) {
          throw new Error(`Inspector property "${property.key}" expects an object value.`);
        }
        break;
      case 'array':
        if (!Array.isArray(value)) {
          throw new Error(`Inspector property "${property.key}" expects an array value.`);
        }
        break;
      default:
        break;
    }
  }

  private copyProperty(property: InspectorProperty): InspectorProperty {
    return {
      key: property.key,
      label: property.label,
      type: property.type,
      value: this.deepClone(property.value),
      category: property.category,
      editable: property.editable,
      description: property.description,
    };
  }

  private deepClone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
  }
}
