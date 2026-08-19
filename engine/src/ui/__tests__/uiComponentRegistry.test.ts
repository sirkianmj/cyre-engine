import { describe, it, expect } from 'vitest';
import { UIComponentRegistry } from '../UIComponentRegistry.js';
import { DashboardUI } from '../DashboardUI.js';
import { TerminalUI } from '../TerminalUI.js';
import { UIRenderer } from '../UIRenderer.js';

describe('UIComponentRegistry', () => {
  it('registers and retrieves UI components', () => {
    const registry = new UIComponentRegistry();
    const dashboard = new DashboardUI();
    registry.register('dashboard', dashboard);
    expect(registry.has('dashboard')).toBe(true);
    expect(registry.get('dashboard')).toBe(dashboard);
  });

  it('lists registered component ids sorted alphabetically', () => {
    const registry = new UIComponentRegistry();
    registry.register('z-terminal', new TerminalUI());
    registry.register('a-dashboard', new DashboardUI());
    expect(registry.listIds()).toEqual(['a-dashboard', 'z-terminal']);
  });

  it('renders a single component', () => {
    const registry = new UIComponentRegistry();
    const dashboard = new DashboardUI({ alertCount: 7 });
    registry.register('dashboard', dashboard);

    const rendered = registry.render('dashboard');
    expect(rendered.componentType).toBe('dashboard');
    expect(rendered.data.alertCount).toBe(7);
  });

  it('renders all registered components', () => {
    const registry = new UIComponentRegistry();
    registry.register('dashboard', new DashboardUI());
    registry.register('terminal', new TerminalUI());
    expect(registry.renderAll()).toHaveLength(2);
  });

  it('unregisters a component', () => {
    const registry = new UIComponentRegistry();
    registry.register('dashboard', new DashboardUI());
    registry.unregister('dashboard');
    expect(registry.has('dashboard')).toBe(false);
    expect(() => registry.get('dashboard')).toThrow(/does not exist/);
  });

  it('rejects duplicate component ids', () => {
    const registry = new UIComponentRegistry();
    registry.register('dashboard', new DashboardUI());
    expect(() => registry.register('dashboard', new DashboardUI())).toThrow(/already exists/);
  });

  it('rejects invalid component ids and components', () => {
    const registry = new UIComponentRegistry();
    expect(() => registry.register('', new DashboardUI())).toThrow(/id is required/);
    expect(() => registry.register('bad', {} as any)).toThrow(/must expose a render/);
  });

  it('rejects invalid renderer', () => {
    expect(() => new UIComponentRegistry({} as UIRenderer)).toThrow(/must expose a render/);
  });
});
