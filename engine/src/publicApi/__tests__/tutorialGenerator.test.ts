import { describe, it, expect } from 'vitest';
import {
  TutorialGenerator,
  PublicApiRegistry,
} from '../index.js';

describe('TutorialGenerator', () => {
  it('lists tutorial ids', () => {
    const generator = new TutorialGenerator();
    const ids = generator.listTutorialIds();

    expect(ids).toContain('getting-started');
    expect(ids).toContain('network-graph');
    expect(ids).toContain('scenario-authoring');
    expect(ids).toContain('running-mission-001');
    expect(ids).toContain('autonomous-agents');
    expect(ids).toContain('automation-integration');
    expect(ids).toContain('platform-compatibility');
  });

  it('generates a single tutorial', () => {
    const tutorial = new TutorialGenerator().generateTutorial('network-graph');

    expect(tutorial.id).toBe('network-graph');
    expect(tutorial.format).toBe('markdown');
    expect(tutorial.content).toContain('# Building a Cyber Network');
    expect(tutorial.content).toContain('NetworkGraph');
    expect(tutorial.content).toContain('shortestPath');
  });

  it('generates all tutorials', () => {
    const tutorials = new TutorialGenerator().generateAll();
    expect(tutorials).toHaveLength(7);
    for (const tutorial of tutorials) {
      expect(tutorial.content.length).toBeGreaterThan(100);
    }
  });

  it('generates an index', () => {
    const index = new TutorialGenerator().generateTutorialsIndex();
    expect(index).toContain('# CYRE Tutorials');
    expect(index).toContain('Engine version:');
    expect(index).toContain('#getting-started');
  });

  it('generates a full tutorial bundle', () => {
    const bundle = new TutorialGenerator('Test Tutorials').generateBundle(123);
    expect(bundle.title).toBe('Test Tutorials');
    expect(bundle.generatedAt).toBe(123);
    expect(bundle.content).toContain('# CYRE Tutorial Documentation');
    expect(bundle.content).toContain('# CYRE Tutorials');
    expect(bundle.content).toContain('# Building a Cyber Network');
  });

  it('throws for unknown tutorial', () => {
    const generator = new TutorialGenerator();
    expect(() => generator.generateTutorial('missing')).toThrow(/does not exist/);
  });

  it('rejects empty name', () => {
    expect(() => new TutorialGenerator('')).toThrow(/name/);
  });

  it('validates cleanly', () => {
    const generator = new TutorialGenerator();
    expect(() => generator.validate()).not.toThrow();
  });
});
