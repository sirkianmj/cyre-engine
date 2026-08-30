/**
 * StudioWorkspace
 * ----------------
 * The CYRE Studio desktop: menu bar, one contextual toolbar, the viewport as
 * the centre of the experience, floating windows, and a quiet status bar.
 * No permanent dock strips — every secondary tool is a window.
 */

import { useCallback, useEffect, useLayoutEffect, useState } from 'react';

import { CyreStage } from '../components/CyreStage';
import { useStudio } from '../studio/StudioContext';
import { Button } from '../ui/primitives';

import { CommandPalette } from './CommandPalette';
import { MenuBar } from './MenuBar';
import { ConfirmDialog, Notifications } from './Notifications';
import { StatusBar } from './StatusBar';
import { TransportBar } from './TransportBar';
import { WindowLayer } from './WindowLayer';
import { resolveShortcutCommand } from './shortcutModel';

export function StudioWorkspace(): JSX.Element {
  const { state, application, commands, runCommand, openWindow } = useStudio();
  const [paletteOpen, setPaletteOpen] = useState(false);

  const togglePalette = useCallback(() => setPaletteOpen((open) => !open), []);

  useEffect(() => {
    const onToggle = (): void => togglePalette();
    window.addEventListener('cyre:toggle-palette', onToggle);
    return () => window.removeEventListener('cyre:toggle-palette', onToggle);
  }, [togglePalette]);

  // Editor-wide keybindings are bound in the layout phase, on `window`, in the
  // capture phase. A passive effect runs after paint, which leaves a window
  // where the chrome is on screen but the shortcuts are not wired yet; the
  // capture phase also means no nested handler can pre-empt a global shortcut.
  useLayoutEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const target = event.target as HTMLElement | null;
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement || target?.isContentEditable === true;

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        togglePalette();
        return;
      }

      if (event.key === 'Escape' && paletteOpen) {
        setPaletteOpen(false);
        return;
      }

      if (typing || paletteOpen) return;

      // Backtick cycles window focus like a native desktop.
      if ((event.metaKey || event.ctrlKey) && event.key === '`') {
        event.preventDefault();
        runCommand('window.focus-next');
        return;
      }

      const commandId = resolveShortcutCommand(event, commands);
      if (!commandId) return;

      const command = commands.get(commandId);
      if (!command) return;

      event.preventDefault();
      runCommand(commandId);
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [commands, paletteOpen, runCommand, togglePalette]);

  const session = state.cyberSession;
  const hasHosts = Object.keys(session.state?.hosts ?? {}).length > 0;

  return (
    <div className="cyre-app" data-testid="studio-app">
      <MenuBar />
      <TransportBar />

      <main className="cyre-desktop" data-testid="studio-desktop">
        <div className="cyre-stage-wrap">
          <CyreStage />
        </div>

        {!hasHosts ? (
          <div className="cyre-stage-overlay">
            <div className="cyre-stage-empty">
              <h2>{state.projectTitle}</h2>
              <p>
                The viewport renders the live cyber simulation. Start it to load the selected scenario
                into the deterministic engine runtime, or open a tool from the menu bar.
              </p>
              <div className="cyre-row">
                <Button variant="primary" icon="play" testId="empty-play" onClick={() => runCommand('scenario.run')}>
                  Run scenario
                </Button>
                <Button icon="library" testId="empty-library" onClick={() => openWindow('scenario-library')}>
                  Scenario library
                </Button>
                <Button icon="attack" testId="empty-attack" onClick={() => openWindow('attack')}>
                  Attack chain
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        <WindowLayer />
      </main>

      <StatusBar />

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <Notifications />
      <ConfirmDialog />

      <span className="cyre-sr-only" aria-live="polite">
        {application.getState().statusMessage}
      </span>
    </div>
  );
}
