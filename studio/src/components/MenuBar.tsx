import { useState } from 'react';
import { useStudio } from '../studio/StudioContext';

interface MenuItem {
  label: string;
  shortcut?: string;
  action: () => void;
}

export function MenuBar() {
  const { application, state, togglePanel } = useStudio();
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const menus: Record<string, MenuItem[]> = {
    File: [
      {
        label: 'New Project',
        shortcut: '⌘N',
        action: () => application.createProject(),
      },
      {
        label: 'Save Project',
        shortcut: '⌘S',
        action: () => application.saveProject(),
      },
    ],
    Edit: [
      {
        label: 'Command Palette',
        shortcut: '⌘K',
        action: () => window.dispatchEvent(new CustomEvent('cyre:command-palette')),
      },
    ],
    View: [
      {
        label: 'Project Explorer',
        action: () => togglePanel('project'),
      },
      {
        label: 'Inspector',
        action: () => togglePanel('inspector'),
      },
      {
        label: 'Console',
        action: () => togglePanel('console'),
      },
    ],
    Simulation: [
      {
        label: state.isPlaying
          ? state.isPaused
            ? 'Resume'
            : 'Pause'
          : 'Play',
        shortcut: 'F6',
        action: () => {
          if (!state.isPlaying) {
            application.play();
          } else if (state.isPaused) {
            application.resume();
          } else {
            application.pause();
          }
        },
      },
      {
        label: 'Stop',
        shortcut: 'F7',
        action: () => application.stop(),
      },
      {
        label: 'Restart',
        action: () => application.restart(),
      },
    ],
    Help: [
      {
        label: 'CYRE Documentation',
        action: () =>
          window.dispatchEvent(
            new CustomEvent('cyre:notification', {
              detail: 'Documentation portal is not connected yet.',
            }),
          ),
      },
    ],
  };

  return (
    <header className="menu-bar" onMouseLeave={() => setOpenMenu(null)}>
      <div className="brand-mark">
        <span className="brand-glyph">C</span>
        <span className="brand-name">CYRE</span>
        <span className="brand-product">STUDIO</span>
      </div>

      <nav className="menu-items" aria-label="Application menu">
        {Object.entries(menus).map(([name, items]) => (
          <div className="menu-wrapper" key={name}>
            <button
              className={`menu-trigger ${openMenu === name ? 'active' : ''}`}
              onClick={() => setOpenMenu(openMenu === name ? null : name)}
            >
              {name}
            </button>

            {openMenu === name && (
              <div className="menu-dropdown">
                {items.map((item) => (
                  <button
                    className="menu-dropdown-item"
                    key={item.label}
                    onClick={() => {
                      item.action();
                      setOpenMenu(null);
                    }}
                  >
                    <span>{item.label}</span>
                    {item.shortcut && (
                      <span className="menu-shortcut">{item.shortcut}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      <div className="menu-spacer" />

      <div className="menu-project">
        <span className="project-status-dot" />
        <span>{state.projectName}</span>
      </div>

      <button
        className="menu-icon-button"
        title="Notifications"
        onClick={() => application.clearNotifications()}
      >
        ◉
        {state.notifications > 0 && (
          <span className="notification-badge">{state.notifications}</span>
        )}
      </button>

      <div className="window-controls" aria-hidden="true">
        <span>—</span>
        <span>□</span>
        <span>×</span>
      </div>
    </header>
  );
}
