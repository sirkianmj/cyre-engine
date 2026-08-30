/**
 * @vitest-environment jsdom
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CyberWorldAdapter } from '@cyre/engine';

import { EngineViewport } from './EngineViewport';
import { projectHosts } from '../rendering/viewportInteraction';

import type { GpuRenderOptions } from '@cyre/engine';

import { DEFAULT_GPU_RENDER_OPTIONS } from '@cyre/engine';

/** A minimal live state: two hosts and one observed connection. */
const state = {
  hosts: {
    internet: {
      id: 'internet',
      name: 'Internet',
      type: 'internet' as const,
      compromised: false,
      accessLevel: 'none' as const,
      services: [],
      vulnerabilities: [],
      isolated: false,
    },
    'web-server': {
      id: 'web-server',
      name: 'Web Server',
      type: 'web_server' as const,
      compromised: true,
      accessLevel: 'user' as const,
      services: [{ name: 'http', port: 80, protocol: 'tcp' as const }],
      vulnerabilities: ['CVE-2024-1234'],
      isolated: false,
    },
  },
  attacker: { position: 'web-server', privileges: 'user' as const, discoveredServices: [] },
  attackStage: 'initial_access' as never,
  objective: { targetHostId: 'web-server', achieved: false },
  monitoring: { enabled: true, logs: [{ timestamp: 1, type: 'exploit', source: 'internet', target: 'web-server' }] },
  evidence: [],
  alerts: [],
  defenderActions: [],
  blockedPaths: [],
} as never;

function options(overrides: Partial<GpuRenderOptions> = {}): GpuRenderOptions {
  return { ...DEFAULT_GPU_RENDER_OPTIONS, ...overrides };
}

afterEach(() => {
  cleanup();
});

describe('EngineViewport', () => {
  it('exposes the label layer and hides it when labels are off', () => {
    const { rerender } = render(
      <EngineViewport
        state={state}
        mode="2d"
        selectedNodeId={null}
        options={options({ showLabels: true })}
        onSelectNode={() => undefined}
      />,
    );

    const labels = screen.getByTestId('engine-viewport-labels');
    expect(labels).toBeTruthy();
    expect(labels.style.display).toBe('block');

    rerender(
      <EngineViewport
        state={state}
        mode="2d"
        selectedNodeId={null}
        options={options({ showLabels: false })}
        onSelectNode={() => undefined}
      />,
    );

    expect(screen.getByTestId('engine-viewport-labels').style.display).toBe('none');
  });

  it('reports which renderer is active', () => {
    render(
      <EngineViewport
        state={state}
        mode="3d"
        selectedNodeId={null}
        onSelectNode={() => undefined}
      />,
    );

    // jsdom has no WebGL2, so the fallback must be disclosed rather than hidden.
    const viewport = screen.getByTestId('engine-viewport');
    expect(viewport.getAttribute('data-renderer')).toBe('canvas2d');
    expect(viewport.getAttribute('data-mode')).toBe('3d');
    expect(screen.getByTestId('engine-viewport-fallback-notice')).toBeTruthy();
  });

  it('renders with no state without throwing', () => {
    render(
      <EngineViewport
        state={null}
        mode="2.5d"
        selectedNodeId={null}
        onSelectNode={() => undefined}
      />,
    );

    expect(screen.getByTestId('engine-viewport')).toBeTruthy();
    expect(screen.getByTestId('engine-viewport').getAttribute('data-mode')).toBe('2.5d');
  });

  it('defaults every overlay to on', () => {
    render(
      <EngineViewport
        state={state}
        mode="2d"
        selectedNodeId={null}
        onSelectNode={() => undefined}
      />,
    );

    expect(screen.getByTestId('engine-viewport-labels').style.display).toBe('block');
  });
});

/* ---------------------------------------------------------------------------
 * Interaction
 *
 * jsdom has no WebGL and no layout, so these tests stub the viewport box and
 * drive real pointer events. The host position they aim at is computed with the
 * same `projectHosts` the component uses, which is the point: the test proves
 * the wiring, not the projection maths (covered in viewportInteraction.test.ts).
 * ------------------------------------------------------------------------- */

describe('EngineViewport interaction', () => {
  const RECT = { left: 0, top: 0, width: 1280, height: 720, right: 1280, bottom: 720, x: 0, y: 0, toJSON: () => ({}) };

  beforeEach(() => {
    Element.prototype.getBoundingClientRect = () => RECT as DOMRect;
    Element.prototype.setPointerCapture = () => undefined;
    Element.prototype.releasePointerCapture = () => undefined;
  });

  /** Where the component will draw a given host, for aiming the pointer. */
  function screenPositionOf(hostId: string, mode: '2d' | '2.5d' | '3d' = '2d'): { x: number; y: number } {
    const scene = CyberWorldAdapter.toSceneGraph(state as never);
    const projection = projectHosts(
      scene.getNodes(),
      {
        width: 1280,
        height: 720,
        panX: 0,
        panY: 0,
        zoom: 1,
        yaw: 0.7,
        pitch: 0.55,
        distance: 20,
        target: [0, 0, 0],
      },
      mode,
      { width: 1280, height: 720 },
    ).find((entry) => entry.id === hostId);

    if (!projection) throw new Error(`no projection for ${hostId}`);
    return { x: projection.x, y: projection.y };
  }

  it('selects the host under a click', () => {
    const onSelectionChange = vi.fn();
    const { getByTestId } = render(
      <EngineViewport
        state={state}
        mode="2d"
        options={options()}
        onSelectionChange={onSelectionChange}
      />,
    );

    const target = screenPositionOf('web-server');
    const viewport = getByTestId('engine-viewport');

    fireEvent.pointerDown(viewport, { clientX: target.x, clientY: target.y, button: 0, pointerId: 1 });
    fireEvent.pointerUp(viewport, { clientX: target.x, clientY: target.y, button: 0, pointerId: 1 });

    expect(onSelectionChange).toHaveBeenCalledWith(['web-server']);
  });

  it('clears the selection when empty space is clicked', () => {
    const onSelectionChange = vi.fn();
    const { getByTestId } = render(
      <EngineViewport
        state={state}
        mode="2d"
        selection={['web-server']}
        options={options()}
        onSelectionChange={onSelectionChange}
      />,
    );

    const viewport = getByTestId('engine-viewport');

    fireEvent.pointerDown(viewport, { clientX: 5, clientY: 700, button: 0, pointerId: 1 });
    fireEvent.pointerUp(viewport, { clientX: 5, clientY: 700, button: 0, pointerId: 1 });

    expect(onSelectionChange).toHaveBeenLastCalledWith([]);
  });

  it('extends the selection on shift-click', () => {
    const onSelectionChange = vi.fn();
    const { getByTestId } = render(
      <EngineViewport
        state={state}
        mode="2d"
        selection={['internet']}
        options={options()}
        onSelectionChange={onSelectionChange}
      />,
    );

    const target = screenPositionOf('web-server');
    const viewport = getByTestId('engine-viewport');

    fireEvent.pointerDown(viewport, {
      clientX: target.x,
      clientY: target.y,
      button: 0,
      pointerId: 1,
      shiftKey: true,
    });

    expect(onSelectionChange).toHaveBeenCalledWith(['internet', 'web-server']);
  });

  it('reports the host under the pointer as hovered', () => {
    const onHoverChange = vi.fn();
    const { getByTestId } = render(
      <EngineViewport state={state} mode="2d" options={options()} onHoverChange={onHoverChange} />,
    );

    const target = screenPositionOf('web-server');
    fireEvent.pointerMove(getByTestId('engine-viewport'), {
      clientX: target.x,
      clientY: target.y,
      pointerId: 1,
    });

    expect(onHoverChange).toHaveBeenCalledWith('web-server');
    expect(getByTestId('engine-viewport').getAttribute('data-hovered-host')).toBe('web-server');
  });

  it('clears hover when the pointer leaves', () => {
    const onHoverChange = vi.fn();
    const { getByTestId } = render(
      <EngineViewport state={state} mode="2d" options={options()} onHoverChange={onHoverChange} />,
    );

    const viewport = getByTestId('engine-viewport');
    const target = screenPositionOf('web-server');

    fireEvent.pointerMove(viewport, { clientX: target.x, clientY: target.y, pointerId: 1 });
    fireEvent.pointerLeave(viewport, { pointerId: 1 });

    expect(onHoverChange).toHaveBeenLastCalledWith(null);
  });

  it('opens the context menu on right-click, naming the host under the cursor', () => {
    const onHostContextMenu = vi.fn();
    const { getByTestId } = render(
      <EngineViewport
        state={state}
        mode="2d"
        options={options()}
        onHostContextMenu={onHostContextMenu}
      />,
    );

    const target = screenPositionOf('web-server');
    fireEvent.contextMenu(getByTestId('engine-viewport'), { clientX: target.x, clientY: target.y });

    expect(onHostContextMenu).toHaveBeenCalledTimes(1);
    expect(onHostContextMenu.mock.calls[0]?.[0]).toMatchObject({ hostId: 'web-server' });
  });

  it('reports empty space when the context menu is opened off a host', () => {
    const onHostContextMenu = vi.fn();
    const { getByTestId } = render(
      <EngineViewport state={state} mode="2d" options={options()} onHostContextMenu={onHostContextMenu} />,
    );

    fireEvent.contextMenu(getByTestId('engine-viewport'), { clientX: 3, clientY: 715 });

    expect(onHostContextMenu.mock.calls[0]?.[0]?.hostId ?? null).toBeNull();
  });

  it('moves a dragged host and reports the new position', () => {
    const onMoveHosts = vi.fn();
    const { getByTestId } = render(
      <EngineViewport state={state} mode="2d" options={options()} onMoveHosts={onMoveHosts} />,
    );

    const target = screenPositionOf('web-server');
    const viewport = getByTestId('engine-viewport');

    fireEvent.pointerDown(viewport, { clientX: target.x, clientY: target.y, button: 0, pointerId: 1 });
    fireEvent.pointerMove(viewport, { clientX: target.x + 80, clientY: target.y + 40, pointerId: 1 });

    expect(onMoveHosts).toHaveBeenCalled();

    const [hostIds, positions] = onMoveHosts.mock.calls[0] as unknown as [
      string[],
      Map<string, readonly [number, number, number]>,
    ];

    expect(hostIds).toEqual(['web-server']);
    const moved = positions.get('web-server');
    expect(moved).toBeDefined();
    moved?.forEach((component) => expect(Number.isFinite(component)).toBe(true));
  });

  it('does not move a host for a click that never travelled', () => {
    const onMoveHosts = vi.fn();
    const { getByTestId } = render(
      <EngineViewport state={state} mode="2d" options={options()} onMoveHosts={onMoveHosts} />,
    );

    const target = screenPositionOf('web-server');
    const viewport = getByTestId('engine-viewport');

    fireEvent.pointerDown(viewport, { clientX: target.x, clientY: target.y, button: 0, pointerId: 1 });
    fireEvent.pointerMove(viewport, { clientX: target.x + 1, clientY: target.y, pointerId: 1 });

    expect(onMoveHosts).not.toHaveBeenCalled();
  });

  it('exposes the selection to the DOM for the stage and tests', () => {
    const { getByTestId } = render(
      <EngineViewport
        state={state}
        mode="2d"
        selection={['web-server', 'internet']}
        options={options()}
      />,
    );

    const viewport = getByTestId('engine-viewport');

    expect(viewport.getAttribute('data-selected-count')).toBe('2');
    expect(viewport.getAttribute('data-selected-hosts')).toBe('web-server internet');
  });

  it('picks the same host in every projection mode', () => {
    for (const mode of ['2d', '2.5d', '3d'] as const) {
      const onSelectionChange = vi.fn();
      const { getByTestId, unmount } = render(
        <EngineViewport
          state={state}
          mode={mode}
          options={options()}
          onSelectionChange={onSelectionChange}
        />,
      );

      const target = screenPositionOf('web-server', mode);
      const viewport = getByTestId('engine-viewport');

      fireEvent.pointerDown(viewport, { clientX: target.x, clientY: target.y, button: 0, pointerId: 1 });
      fireEvent.pointerUp(viewport, { clientX: target.x, clientY: target.y, button: 0, pointerId: 1 });

      expect(onSelectionChange, `mode ${mode}`).toHaveBeenCalledWith(['web-server']);
      unmount();
    }
  });
});
