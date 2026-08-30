import { describe, it, expect } from 'vitest';
import { TerminalUI } from '../TerminalUI.js';
import { DashboardUI } from '../DashboardUI.js';
import { UIRenderer } from '../UIRenderer.js';

describe('TerminalUI', () => {
  it('writes lines', () => {
    const terminal = new TerminalUI();
    terminal.write('Hello');
    terminal.write('World');
    expect(terminal.render().lines).toEqual(['Hello', 'World']);
  });

  it('executes commands', () => {
    const terminal = new TerminalUI();
    terminal.execute('help', 'Available commands: ...');
    expect(terminal.render().history).toContain('help');
    expect(terminal.render().lines).toContain('> help');
  });

  it('clears lines but keeps history', () => {
    const terminal = new TerminalUI();
    terminal.execute('cmd', 'output');
    terminal.clearLines();
    expect(terminal.render().lines).toEqual([]);
    expect(terminal.render().history).toContain('cmd');
  });
});

describe('DashboardUI', () => {
  it('updates metrics', () => {
    const dashboard = new DashboardUI();
    dashboard.setAlertCount(3);
    dashboard.setCompromisedHosts(1);
    dashboard.setInvestigationPhase('investigating');
    const render = dashboard.render();
    expect(render.alertCount).toBe(3);
    expect(render.compromisedHosts).toBe(1);
    expect(render.investigationPhase).toBe('investigating');
  });

  it('throws on negative alert count', () => {
    const dashboard = new DashboardUI();
    expect(() => dashboard.setAlertCount(-1)).toThrow(/non-negative/);
  });

  it('throws on empty investigation phase', () => {
    const dashboard = new DashboardUI();
    expect(() => dashboard.setInvestigationPhase('')).toThrow(/cannot be empty/);
  });
});

describe('UIRenderer', () => {
  it('renders a component', () => {
    const renderer = new UIRenderer();
    const terminal = new TerminalUI();
    terminal.write('test');
    const result = renderer.render(terminal);
    expect(result.componentType).toBe('terminal');
    expect(result.data.lines).toEqual(['test']);
  });

  it('renders multiple components', () => {
    const renderer = new UIRenderer();
    const terminal = new TerminalUI();
    const dashboard = new DashboardUI();
    const results = renderer.renderAll([terminal, dashboard]);
    expect(results).toHaveLength(2);
    expect(results[0].componentType).toBe('terminal');
    expect(results[1].componentType).toBe('dashboard');
  });
});
