import { useMemo, useState } from 'react';

import type {
  EditorNotification,
  InspectorTarget,
  ProjectNode,
} from '@cyre/engine';

import { useStudio } from '../studio/StudioContext';
import { Viewport } from './Viewport';

const nodeIcons: Record<string, string> = {
  folder: '▾',
  scene: '◈',
  mission: '◆',
  asset: '□',
  scenario: '◇',
};

function ProjectTreeNode({
  node,
  nodes,
  depth,
}: {
  node: ProjectNode;
  nodes: ProjectNode[];
  depth: number;
}): JSX.Element {
  const [expanded, setExpanded] = useState(true);
  const children = nodes.filter(
    (child) => child.parentId === node.id,
  );

  return (
    <div>
      <button
        className="tree-item"
        style={{ paddingLeft: depth * 12 }}
        onClick={() => setExpanded(!expanded)}
      >
        <span>{children.length > 0 ? (expanded ? '▾' : '▸') : '·'}</span>
        <span>{nodeIcons[node.type] ?? '·'}</span>
        <span>{node.name}</span>
      </button>

      {expanded &&
        children.map((child) => (
          <ProjectTreeNode
            key={child.id}
            node={child}
            nodes={nodes}
            depth={depth + 1}
          />
        ))}
    </div>
  );
}

function ProjectExplorerPanel({
  nodes,
}: {
  nodes: ProjectNode[];
}): JSX.Element {
  const roots = nodes.filter((node) => !node.parentId);

  return (
    <aside className="layout-panel project-panel">
      <div className="panel-header">
        <span>PROJECT</span>
      </div>

      <div className="tree">
        {roots.map((node) => (
          <ProjectTreeNode
            key={node.id}
            node={node}
            nodes={nodes}
            depth={0}
          />
        ))}
      </div>
    </aside>
  );
}

function InspectorPanel({
  target,
}: {
  target: InspectorTarget | null;
}): JSX.Element {
  if (!target) {
    return (
      <aside className="layout-panel inspector-panel">
        <div className="panel-header">
          <span>INSPECTOR</span>
        </div>
        <div className="inspector-empty">No selection</div>
      </aside>
    );
  }

  const categories = Array.from(
    new Set(
      target.properties.map(
        (property) => property.category ?? 'General',
      ),
    ),
  ).sort();

  return (
    <aside className="layout-panel inspector-panel">
      <div className="panel-header">
        <span>INSPECTOR</span>
        <strong>{target.name}</strong>
      </div>

      {categories.map((category) => (
        <section key={category} className="inspector-section">
          <div className="section-title">
            {category.toUpperCase()}
          </div>

          {target.properties
            .filter(
              (property) =>
                (property.category ?? 'General') === category,
            )
            .map((property) => (
              <div
                key={property.key}
                className="property-row"
              >
                <span>{property.label}</span>
                <strong>{String(property.value)}</strong>
              </div>
            ))}
        </section>
      ))}
    </aside>
  );
}

function ConsolePanel({
  notifications,
}: {
  notifications: EditorNotification[];
}): JSX.Element {
  return (
    <div className="cyre-console">
      <div className="panel-header">
        <span>NOTIFICATIONS</span>
      </div>

      <div className="console-output">
        {notifications.length === 0 ? (
          <div className="console-empty">No notifications.</div>
        ) : (
          notifications.slice(-20).map((notification) => (
            <div
              key={notification.id}
              className={`console-line console-${notification.type}`}
            >
              <span>{notification.timestamp}</span>
              <strong>
                {notification.type.toUpperCase()}
              </strong>
              {notification.message}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function StudioShell(): JSX.Element {
  const {
    application,
    state,
    play,
    pause,
    resume,
    stop,
    restart,
    setSimulationSpeed,
    setWorkspace,
    clearNotifications,
  } = useStudio();

  const [mobilePanel, setMobilePanel] = useState<
    'project' | 'inspector' | 'console' | null
  >(null);

  const simulationLabel = useMemo(() => {
    if (!state.isPlaying) return 'STOPPED';
    if (state.isPaused) return 'PAUSED';
    return 'RUNNING';
  }, [state.isPlaying, state.isPaused]);

  const handleMenuAction = (
    action?: string,
  ): void => {
    if (action) {
      application.executeCommand(action);
    }
  };

  return (
    <div className="cyre-studio">
      <header className="studio-titlebar">
        <div className="brand">
          <div className="brand-mark">C</div>
          <div>
            <strong>CYRE</strong>
            <span>CYBERSECURITY REALITY ENGINE</span>
          </div>
        </div>

        <div className="project-title">
          {state.projectTitle}
          <span>•</span>
          <span className="saved">{state.statusMessage}</span>
        </div>

        <div className="title-actions">
          <button onClick={clearNotifications}>
            ◉ {state.notifications.length}
          </button>
          <button>□</button>
          <button>×</button>
        </div>
      </header>

      <nav className="studio-menubar">
        {state.menuGroups.map((group) => (
          <div key={group.id} className="menu-wrapper">
            <button className="menu-trigger">
              {group.label}
            </button>

            <div className="menu-dropdown">
              {group.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleMenuAction(item.action)}
                >
                  <span>{item.label}</span>
                  {item.shortcut && (
                    <span className="menu-shortcut">
                      {item.shortcut}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className="menu-spacer" />

        <div className="engine-state">
          <span className="engine-dot" />
          {state.engineState.toUpperCase()}
        </div>
      </nav>

      <div className="studio-toolbar">
        <div className="transport">
          <button
            className={!state.isPlaying ? 'active' : ''}
            onClick={state.isPlaying ? stop : play}
          >
            {state.isPlaying ? '■' : '▶'}
          </button>

          <button
            disabled={!state.isPlaying}
            onClick={state.isPaused ? resume : pause}
          >
            {state.isPaused ? '▶' : 'Ⅱ'}
          </button>

          <button onClick={restart}>↻</button>

          <div className="speed-control">
            <span>Speed</span>
            <select
              value={state.simulationSpeed}
              onChange={(event) =>
                setSimulationSpeed(Number(event.target.value))
              }
            >
              <option value={0.25}>0.25×</option>
              <option value={0.5}>0.5×</option>
              <option value={1}>1×</option>
              <option value={2}>2×</option>
              <option value={4}>4×</option>
            </select>
          </div>
        </div>

        <div className="workspace-tabs">
          {state.workspaces.map((workspace) => (
            <button
              key={workspace.id}
              className={
                state.activeWorkspaceId === workspace.id
                  ? 'active'
                  : ''
              }
              onClick={() => setWorkspace(workspace.id)}
            >
              {workspace.name}
            </button>
          ))}
        </div>

        <div className="toolbar-status">
          <span
            className={
              state.isPlaying
                ? state.isPaused
                  ? 'paused'
                  : 'running'
                : 'stopped'
            }
          >
            ● {simulationLabel}
          </span>
        </div>
      </div>

      <main className="studio-layout">
        <div
          className={`layout-panel project-panel ${
            mobilePanel === 'project' ? 'mobile-open' : ''
          }`}
        >
          <ProjectExplorerPanel
            nodes={state.projectExplorerNodes}
          />
        </div>

        <section className="studio-center">
          <div className="workspace-header">
            <div>
              <span className="workspace-eyebrow">
                {state.activeWorkspaceId?.toUpperCase()} WORKSPACE
              </span>
              <h1>{state.projectTitle}</h1>
            </div>
          </div>

          <div className="workspace-content">
            <Viewport
              nodes={state.networkNodes}
              edges={state.networkEdges}
            />
          </div>

          <ConsolePanel
            notifications={state.notifications}
          />
        </section>

        <div
          className={`layout-panel inspector-panel ${
            mobilePanel === 'inspector' ? 'mobile-open' : ''
          }`}
        >
          <InspectorPanel target={state.inspectorTarget} />
        </div>
      </main>

      <footer className="studio-statusbar">
        <div>
          <span className="status-online" />
          CYRE ENGINE
        </div>

        <div className="status-center">
          <span>Simulation: {simulationLabel}</span>
          <span>Speed: {state.simulationSpeed}×</span>
          <span>
            Entities: {state.networkNodes.length}
          </span>
          <span>Edges: {state.networkEdges.length}</span>
        </div>

        <div>
          <span>{state.statusMessage}</span>
        </div>
      </footer>
    </div>
  );
}
