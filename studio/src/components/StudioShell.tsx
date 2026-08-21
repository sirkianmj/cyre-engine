import { useEffect, useState } from 'react';
import { MenuBar } from './MenuBar';
import { Toolbar } from './Toolbar';
import { WorkspacePanel } from './WorkspacePanel';
import { useStudio } from '../studio/StudioContext';

export function StudioShell() {
  const { state, application, togglePanel, setWorkspace } = useStudio();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    const commandHandler = () => setCommandPaletteOpen(true);

    const notificationHandler = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      setNotification(detail);
      window.setTimeout(() => setNotification(null), 2500);
    };

    window.addEventListener('cyre:command-palette', commandHandler);
    window.addEventListener('cyre:notification', notificationHandler);

    return () => {
      window.removeEventListener('cyre:command-palette', commandHandler);
      window.removeEventListener('cyre:notification', notificationHandler);
    };
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.metaKey && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandPaletteOpen(true);
      }

      if (event.key === 'F6') {
        event.preventDefault();

        if (!state.isPlaying) {
          application.play();
        } else if (state.isPaused) {
          application.resume();
        } else {
          application.pause();
        }
      }

      if (event.key === 'F7') {
        event.preventDefault();
        application.stop();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [application, state.isPaused, state.isPlaying]);

  return (
    <div className="studio-root">
      <MenuBar />
      <Toolbar />

      <div className="studio-body">
        {state.visiblePanels.project && (
          <aside className="panel project-panel">
            <PanelHeader
              title="Project"
              icon="◇"
              onClose={() => togglePanel('project')}
            />

            <div className="project-tree">
              <TreeItem label={state.projectName} icon="◆" expanded>
                <TreeItem label="Scenes" icon="▱" expanded>
                  <TreeItem label="Main Scene" icon="◈" selected />
                </TreeItem>
                <TreeItem label="Scenarios" icon="◇" />
                <TreeItem label="Missions" icon="▣" />
                <TreeItem label="Assets" icon="▤" />
                <TreeItem label="Research" icon="⌁" />
                <TreeItem label="Build Profiles" icon="⚙" />
              </TreeItem>
            </div>

            <div className="panel-footer">
              <span>PROJECT</span>
              <span>v1.0</span>
            </div>
          </aside>
        )}

        <main className="studio-main">
          <div className="workspace-tabs">
            <button
              className={state.workspace === 'default' ? 'active' : ''}
              onClick={() => setWorkspace('default')}
            >
              ◈ Workspace
            </button>
            <button
              className={state.workspace === 'network' ? 'active' : ''}
              onClick={() => setWorkspace('network')}
            >
              ◎ Network
            </button>
            <button
              className={state.workspace === 'mission' ? 'active' : ''}
              onClick={() => setWorkspace('mission')}
            >
              ▣ Mission
            </button>
            <button
              className={state.workspace === 'investigation' ? 'active' : ''}
              onClick={() => setWorkspace('investigation')}
            >
              ⌁ Investigation
            </button>

            <span className="tab-spacer" />

            <button
              className="tab-tool"
              title="Command Palette"
              onClick={() => setCommandPaletteOpen(true)}
            >
              ⌘K
            </button>
          </div>

          <WorkspacePanel />

          {state.visiblePanels.console && (
            <section className="panel console-panel">
              <PanelHeader
                title="Output"
                icon="›_"
                onClose={() => togglePanel('console')}
              />
              <div className="console-content">
                <div>
                  <span className="log-time">15:00:01</span>
                  <span className="log-info">INFO</span>
                  CYRE Studio initialized.
                </div>
                <div>
                  <span className="log-time">15:00:01</span>
                  <span className="log-info">INFO</span>
                  Engine baseline connected.
                </div>
                <div>
                  <span className="log-time">15:00:02</span>
                  <span className="log-success">READY</span>
                  Studio workspace ready.
                </div>
              </div>
            </section>
          )}
        </main>

        {state.visiblePanels.inspector && (
          <aside className="panel inspector-panel">
            <PanelHeader
              title="Inspector"
              icon="◇"
              onClose={() => togglePanel('inspector')}
            />

            <div className="inspector-selection">
              <div className="selection-icon">◈</div>
              <div>
                <strong>Main Scene</strong>
                <span>Scene</span>
              </div>
            </div>

            <InspectorSection title="Identity">
              <PropertyRow label="Name" value="Main Scene" />
              <PropertyRow label="Type" value="Scene" />
            </InspectorSection>

            <InspectorSection title="Simulation">
              <PropertyRow label="Tick Rate" value="60 Hz" />
              <PropertyRow label="Deterministic" value="Enabled" />
              <PropertyRow label="Difficulty" value="Standard" />
            </InspectorSection>

            <InspectorSection title="Runtime">
              <PropertyRow
                label="State"
                value={
                  state.isPlaying
                    ? state.isPaused
                      ? 'Paused'
                      : 'Running'
                    : 'Editor'
                }
              />
              <PropertyRow
                label="Speed"
                value={`${state.simulationSpeed}×`}
              />
            </InspectorSection>

            <div className="inspector-empty">
              Select an entity or asset to inspect its properties.
            </div>
          </aside>
        )}
      </div>

      <div className="studio-statusbar">
        <div className="status-left">
          <span className="status-ready">
            <i />
            READY
          </span>
          <span>CYRE Engine 1.0.0</span>
          <span>TypeScript</span>
        </div>

        <div className="status-right">
          <span>Simulation {state.isPlaying ? 'active' : 'idle'}</span>
          <span>FPS —</span>
          <span>Memory —</span>
          <span>UTF-8</span>
        </div>
      </div>

      {notification && (
        <div className="toast">
          <span>✓</span>
          {notification}
        </div>
      )}

      {commandPaletteOpen && (
        <CommandPalette onClose={() => setCommandPaletteOpen(false)} />
      )}
    </div>
  );
}

function PanelHeader({
  title,
  icon,
  onClose,
}: {
  title: string;
  icon: string;
  onClose: () => void;
}) {
  return (
    <div className="panel-header">
      <div>
        <span className="panel-icon">{icon}</span>
        <span>{title}</span>
      </div>
      <button onClick={onClose} title={`Close ${title}`}>
        ×
      </button>
    </div>
  );
}

function TreeItem({
  label,
  icon,
  children,
  expanded = false,
  selected = false,
}: {
  label: string;
  icon: string;
  children?: React.ReactNode;
  expanded?: boolean;
  selected?: boolean;
}) {
  return (
    <div>
      <button className={`tree-item ${selected ? 'selected' : ''}`}>
        <span className="tree-chevron">
          {children ? (expanded ? '⌄' : '›') : ''}
        </span>
        <span className="tree-icon">{icon}</span>
        <span>{label}</span>
      </button>

      {children && expanded && <div className="tree-children">{children}</div>}
    </div>
  );
}

function InspectorSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="inspector-section">
      <div className="inspector-section-title">
        <span>⌄</span>
        {title}
      </div>
      {children}
    </div>
  );
}

function PropertyRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="property-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function CommandPalette({ onClose }: { onClose: () => void }) {
  const { application, setWorkspace } = useStudio();
  const [query, setQuery] = useState('');

  const commands = [
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
    {
      label: 'Play Simulation',
      shortcut: 'F6',
      action: () => application.play(),
    },
    {
      label: 'Stop Simulation',
      shortcut: 'F7',
      action: () => application.stop(),
    },
    {
      label: 'Network Workspace',
      action: () => setWorkspace('network'),
    },
    {
      label: 'Mission Workspace',
      action: () => setWorkspace('mission'),
    },
    {
      label: 'Investigation Workspace',
      action: () => setWorkspace('investigation'),
    },
  ];

  const filtered = commands.filter((command) =>
    command.label.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="command-overlay" onMouseDown={onClose}>
      <div
        className="command-palette"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="command-search">
          <span>⌕</span>
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search commands..."
          />
          <kbd>ESC</kbd>
        </div>

        <div className="command-results">
          {filtered.map((command) => (
            <button
              key={command.label}
              onClick={() => {
                command.action();
                onClose();
              }}
            >
              <span>{command.label}</span>
              {command.shortcut && <kbd>{command.shortcut}</kbd>}
            </button>
          ))}

          {filtered.length === 0 && (
            <div className="command-empty">No commands found.</div>
          )}
        </div>
      </div>
    </div>
  );
}
