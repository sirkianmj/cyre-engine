import { describe, it, expect } from 'vitest';
import {
  DocumentationGenerator,
  PublicApiRegistry,
} from '../index.js';

describe('DocumentationGenerator', () => {
  it('generates API reference containing modules and symbols', () => {
    const generator = new DocumentationGenerator();
    const reference = generator.generateApiReference();

    expect(reference).toContain('# CYRE Public API Reference');
    expect(reference).toContain('Engine version:');
    expect(reference).toContain('Public API version:');
    expect(reference).toContain('## Modules');

    for (const moduleName of PublicApiRegistry.getModuleNames()) {
      expect(reference).toContain(moduleName);
    }
  });

  it('generates architecture overview', () => {
    const overview = new DocumentationGenerator().generateArchitectureOverview();

    expect(overview).toContain('# CYRE Architecture Overview');
    expect(overview).toContain('## Module Boundaries');
    expect(overview).toContain('Cross-module imports');
  });

  it('generates package inventory', () => {
    const packages = new DocumentationGenerator().generatePackagesOverview();

    expect(packages).toContain('# CYRE Package Inventory');
    expect(packages).toContain('| Package | API Version |');
    expect(packages).toContain('core');
    expect(packages).toContain('cyber');
  });

  it('generates a complete documentation bundle', () => {
    const generator = new DocumentationGenerator('Test Docs');
    const bundle = generator.generateBundle(12345);

    expect(bundle.title).toBe('Test Docs');
    expect(bundle.format).toBe('markdown');
    expect(bundle.generatedAt).toBe(12345);
    expect(bundle.content).toContain('# CYRE Engine Documentation');
    expect(bundle.content).toContain('# CYRE Public API Reference');
    expect(bundle.content).toContain('# CYRE Architecture Overview');
    expect(bundle.content).toContain('# CYRE Package Inventory');
  });

  it('rejects empty name', () => {
    expect(() => new DocumentationGenerator('')).toThrow(/name/);
  });

  it('validates cleanly', () => {
    const generator = new DocumentationGenerator();
    expect(() => generator.validate()).not.toThrow();
  });
});
