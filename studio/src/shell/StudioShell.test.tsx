/**
 * @vitest-environment jsdom
 */
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { StudioProvider, studioApplication } from '../studio/StudioContext';
import { StudioWorkspace } from './StudioWorkspace';
import { STUDIO_MENUS } from './menuModel';
import { WINDOW_DEFINITIONS } from './windowCatalog';

function renderStudio(): void {
  render(
    <StudioProvider>
      <StudioWorkspace />
    </StudioProvider>,
  );
}

function openMenu(menuId: string): HTMLElement {
  const trigger = screen.getByTestId(`menu-${menuId}`);
  fireEvent.click(trigger);
  return screen.getByTestId(`menu-popover-${menuId}`);
}

beforeEach(() => {
  // The Studio application is a module-level singleton, so each test has to
  // clear the desktop and persisted layout it may have left behind.
  studioApplication.windows.resetLayout();
  studioApplication.telemetry.clear();
  studioApplication.benchmarks.clear();
  studioApplication.security.clear();
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
});

describe('Studio menu bar', () => {
  it('renders every top-level menu', () => {
    renderStudio();

    for (const menu of STUDIO_MENUS) {
      expect(screen.getByTestId(`menu-${menu.id}`)).toBeTruthy();
    }
  });

  it('opens a dropdown and lists its actions', () => {
    renderStudio();

    const popover = openMenu('research');

    expect(within(popover).getByTestId('menu-item-research.telemetry')).toBeTruthy();
    expect(within(popover).getByTestId('menu-item-research.run')).toBeTruthy();
  });

  it('runs the command behind a menu action and presents its window', () => {
    renderStudio();

    const popover = openMenu('research');
    fireEvent.click(within(popover).getByTestId('menu-item-research.telemetry'));

    expect(screen.getByTestId('window-telemetry')).toBeTruthy();
  });

  it('closes the dropdown on Escape', () => {
    renderStudio();

    openMenu('file');
    fireEvent.keyDown(window, { key: 'Escape' });

    expect(screen.queryByTestId('menu-popover-file')).toBeNull();
  });

  it('shows a live checkmark for exactly one render mode', () => {
    renderStudio();

    const popover = openMenu('view');
    const checked = ['view.2d', 'view.25d', 'view.3d'].filter(
      (id) => within(popover).getByTestId(`menu-item-${id}`).getAttribute('aria-checked') === 'true',
    );

    // Exactly one mode is active, and it is the one the Studio defaulted to.
    expect(checked).toEqual(['view.3d']);
    expect(screen.getByTestId('stage-mode').textContent).toContain('3D');
  });

  it('does not silently change the render mode when WebGL is unavailable', () => {
    renderStudio();

    // jsdom has no WebGL2 context. The viewport must fall back openly rather
    // than mutating the user's selected mode to hide a blank surface.
    const stage = screen.getByTestId('cyre-stage');
    expect(stage.getAttribute('data-render-mode')).toBe('3d');
    expect(stage.getAttribute('data-renderer')).toBe('canvas2d');

    expect(screen.getByTestId('engine-viewport-fallback-notice')).toBeTruthy();
    expect(screen.getByTestId('engine-viewport-fallback-notice').textContent).toMatch(
      /WebGL2 unavailable/i,
    );
  });

  it('disables Undo until there is something to undo', () => {
    renderStudio();

    const popover = openMenu('edit');
    const undo = within(popover).getByTestId('menu-item-edit.undo') as HTMLButtonElement;

    expect(undo.disabled).toBe(true);
  });

  it('lists every catalogued window in the Window menu', () => {
    renderStudio();

    const popover = openMenu('window');

    for (const definition of WINDOW_DEFINITIONS) {
      expect(within(popover).getByTestId(`menu-item-menu.window.${definition.kind}`)).toBeTruthy();
    }
  });
});

describe('Studio window layer', () => {
  it('opens a window from the Window menu and closes it again', () => {
    renderStudio();

    const popover = openMenu('window');
    fireEvent.click(within(popover).getByTestId('menu-item-menu.window.simulation'));
    expect(screen.getByTestId('window-simulation')).toBeTruthy();

    fireEvent.click(screen.getByTestId('window-close-simulation'));
    expect(screen.queryByTestId('window-simulation')).toBeNull();
  });

  it('drags a window by its title bar', () => {
    renderStudio();

    openMenu('window');
    fireEvent.click(screen.getByTestId('menu-item-menu.window.telemetry'));

    const frame = screen.getByTestId('window-telemetry');
    const before = frame.style.left;

    const titlebar = frame.querySelector('.cyre-window-titlebar') as HTMLElement;
    fireEvent.pointerDown(titlebar, { button: 0, clientX: 100, clientY: 60 });
    fireEvent.pointerMove(window, { clientX: 260, clientY: 180 });
    fireEvent.pointerUp(window);

    expect(frame.style.left).not.toBe(before);
  });

  it('resizes a window from its south-east edge', () => {
    renderStudio();

    openMenu('window');
    fireEvent.click(screen.getByTestId('menu-item-menu.window.telemetry'));

    const frame = screen.getByTestId('window-telemetry');
    const widthBefore = frame.style.width;

    fireEvent.pointerDown(screen.getByTestId('window-resize-telemetry-se'), {
      button: 0,
      clientX: 400,
      clientY: 400,
    });
    fireEvent.pointerMove(window, { clientX: 560, clientY: 480 });
    fireEvent.pointerUp(window);

    expect(frame.style.width).not.toBe(widthBefore);
  });

  it('minimizes a window into the tray and restores it', () => {
    renderStudio();

    openMenu('window');
    fireEvent.click(screen.getByTestId('menu-item-menu.window.telemetry'));

    fireEvent.click(screen.getByTestId('window-minimize-telemetry'));
    expect(screen.queryByTestId('window-telemetry')).toBeNull();
    expect(screen.getByTestId('window-tray-telemetry')).toBeTruthy();

    fireEvent.click(screen.getByTestId('window-tray-telemetry'));
    expect(screen.getByTestId('window-telemetry')).toBeTruthy();
  });

  it('maximizes and restores a window', () => {
    renderStudio();

    openMenu('window');
    fireEvent.click(screen.getByTestId('menu-item-menu.window.telemetry'));

    const frame = screen.getByTestId('window-telemetry');
    const desktopWidth = studioApplication.windows.getBounds().width;
    const widthBefore = frame.style.width;

    fireEvent.click(screen.getByTestId('window-maximize-telemetry'));
    expect(frame.style.width).toBe(`${desktopWidth}px`);

    fireEvent.click(screen.getByTestId('window-maximize-telemetry'));
    expect(frame.style.width).toBe(widthBefore);
  });

  it('renders every window kind without throwing', () => {
    for (const definition of WINDOW_DEFINITIONS) {
      const { unmount } = render(
        <StudioProvider>
          <StudioWorkspace />
        </StudioProvider>,
      );

      const popover = openMenu('window');
      fireEvent.click(within(popover).getByTestId(`menu-item-menu.window.${definition.kind}`));

      expect(screen.getByTestId(`window-${definition.kind}`)).toBeTruthy();
      unmount();
      cleanup();
      window.localStorage.clear();
    }
  });
});

describe('Studio workspace', () => {
  it('shows the viewport, toolbar and status bar on launch with no windows open', () => {
    renderStudio();

    expect(screen.getByTestId('studio-app')).toBeTruthy();
    expect(screen.getByTestId('studio-toolbar')).toBeTruthy();
    expect(screen.getByTestId('studio-statusbar')).toBeTruthy();
    expect(screen.getByTestId('cyre-stage')).toBeTruthy();
    expect(screen.queryAllByTestId(/^window-/)).toHaveLength(0);
  });

  it('runs the selected scenario from the empty state into the viewport', () => {
    renderStudio();

    fireEvent.click(screen.getByTestId('empty-play'));

    const stage = screen.getByTestId('cyre-stage');
    expect(stage.getAttribute('data-cyber-state')).toBe('active');
    expect(Number(stage.getAttribute('data-host-count'))).toBeGreaterThan(0);
  });

  it('opens the command palette with ⌘K and runs a command from it', () => {
    renderStudio();

    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    expect(screen.getByTestId('command-palette')).toBeTruthy();

    fireEvent.change(screen.getByTestId('command-palette-input'), {
      target: { value: 'telemetry' },
    });
    fireEvent.click(screen.getByTestId('palette-item-research.telemetry'));

    expect(screen.queryByTestId('command-palette')).toBeNull();
    expect(screen.getByTestId('window-telemetry')).toBeTruthy();
  });

  it('opens the palette from a real Ctrl+K key sequence bubbling off the body', () => {
    renderStudio();

    // Mirrors what a browser actually delivers for press('Control+k'): a bare
    // Control keydown followed by the modified key, bubbling from the focused
    // element rather than being dispatched straight onto window.
    const press = (init: KeyboardEventInit): void => {
      // act() flushes the React update the handler triggers; without it the
      // assertion would race the render rather than test the shortcut.
      act(() => {
        document.body.dispatchEvent(
          new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init }),
        );
      });
    };

    press({ key: 'Control', ctrlKey: true });
    press({ key: 'k', code: 'KeyK', ctrlKey: true });

    expect(screen.getByTestId('command-palette')).toBeTruthy();
  });

  it('binds global shortcuts in the capture phase', () => {
    // Capture on window is what makes the shortcuts both un-pre-emptable and
    // live from the moment the shell commits, instead of after first paint.
    const addSpy = vi.spyOn(window, 'addEventListener');

    renderStudio();

    const captureKeydown = addSpy.mock.calls.filter(
      (call) => call[0] === 'keydown' && call[2] === true,
    );
    expect(captureKeydown.length).toBeGreaterThan(0);

    addSpy.mockRestore();
  });
});
