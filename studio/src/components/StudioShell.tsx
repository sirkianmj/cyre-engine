import { useEffect, useMemo, useRef, useState } from 'react';

import type {
  EditorNotification,
  InspectorTarget,
  ProjectNode,
} from '@cyre/engine';

import { useStudio } from '../studio/StudioContext';
import { Viewport } from './Viewport';

type StudioPhase = 'boot' | 'home' | 'editor';

const nodeIcons: Record<string, string> = {
  folder: '▾',
  scene: '◈',
  mission: '◆',
  asset: '□',
  scenario: '◇',
};

function BootScreen(): JSX.Element {
  return (
    <div className="studio-phase boot-screen">
      <div className="boot-mark-wrap">
        <div className="boot-mark-ring" />
        <div className="boot-mark">C</div>
      </div>

      <h1 className="boot-title">CYRE STUDIO</h1>
      <p className="boot-subtitle">
        CYBERSECURITY REALITY ENGINE
      </p>

      <div className="boot-progress">
        <span />
      </div>

      <span className="boot-version">v1.0.0</span>
    </div>
  );
}

function HomeScreen({
  projectTitle,
  statusMessage,
  onEnter,
  onNewProject,
}: {
  projectTitle: string;
  statusMessage: string;
  onEnter: () => void;
  onNewProject: () => void;
}): JSX.Element {
  return (
    <div className="studio-phase home-screen">
      <nav className="home-nav">
        <div className="home-brand">
          <div className="home-brand-mark">C</div>
          <div>
            <strong>CYRE STUDIO</strong>
            <span>PROFESSIONAL CYBER DEVELOPMENT</span>
          </div>
        </div>

        <button className="btn" onClick={onEnter}>
          Enter Studio
        </button>
      </nav>

      <main className="home-main">
        <div className="home-hero">
          <h1>
            Build the world&apos;s most{' '}
            <span>advanced cyber simulations.</span>
          </h1>

          <p>
            Design networks, missions, attacks, evidence, and
            training scenarios with a production-grade engine.
          </p>

          <div className="home-card">
            <div>
              <div className="home-card-title">
                Last project
              </div>
              <div className="home-card-name">
                {projectTitle}
              </div>
              <div className="home-card-status">
                {statusMessage}
              </div>
            </div>

            <button
              className="btn btn-primary"
              onClick={onEnter}
            >
              Continue
            </button>
          </div>

          <div className="home-actions">
            <button
              className="btn btn-primary"
              onClick={onNewProject}
            >
              New Project
            </button>

            <button className="btn" onClick={onEnter}>
              Open Project
            </button>
          </div>
        </div>
      </main>

      <footer className="home-footer">
        <span>CYRE ENGINE</span>
        <span>v1.0.0</span>
      </footer>
    </div>
  );
}

function ProjectTreeNode({
  node,
  nodes,
  depth,
  selectedNodeId,
  onSelect,
}: {
  node: ProjectNode;
  nodes: ProjectNode[];
  depth: number;
  selectedNodeId: string | null;
  onSelect: (nodeId: string) => void;
}): JSX.Element {
  const [expanded, setExpanded] = useState(true);
  const children = nodes.filter(
    (child) => child.parentId === node.id,
  );

  return (
    <div>
      <button
        className={`tree-item ${
          selectedNodeId === node.id ? 'selected' : ''
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={() => onSelect(node.id)}
        onDoubleClick={() => setExpanded(!expanded)}
        aria-expanded={children.length > 0 ? expanded : undefined}
      >
        <span>
          {children.length > 0
            ? expanded
              ? '▾'
              : '▸'
            : '·'}
        </span>
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
            selectedNodeId={selectedNodeId}
            onSelect={onSelect}
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
  const [selectedNodeId, setSelectedNodeId] = useState<
    string | null
  >(null);

  return (
    <aside className="project-panel layout-panel">
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
            selectedNodeId={selectedNodeId}
            onSelect={setSelectedNodeId}
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
      <aside className="inspector-panel layout-panel">
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
    <aside className="inspector-panel layout-panel">
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
              <span>{notification.message}</span>
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

  const [phase, setPhase] = useState<StudioPhase>('boot');
  const [openMenuId, setOpenMenuId] = useState<string | null>(
    null,
  );
  const menuTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPhase('home');
    }, 1500);

    return () => window.clearTimeout(timer);
  }, []);

  const handleMenuOpen = (menuId: string): void => {
    if (menuTimerRef.current) {
      window.clearTimeout(menuTimerRef.current);
      menuTimerRef.current = null;
    }
    setOpenMenuId(menuId);
  };

  const handleMenuCloseSoon = (): void => {
    if (menuTimerRef.current) {
      window.clearTimeout(menuTimerRef.current);
    }

    menuTimerRef.current = window.setTimeout(() => {
      setOpenMenuId(null);
      menuTimerRef.current = null;
    }, 180);
  };

  const handleMenuTrigger = (menuId: string): void => {
    setOpenMenuId((current) =>
      current === menuId ? null : menuId,
    );
  };

  const handleMenuAction = (action?: string): void => {
    if (action) {
      application.executeCommand(action);
    }
    setOpenMenuId(null);
  };

  const simulationLabel = useMemo(() => {
    if (!state.isPlaying) return 'STOPPED';
    if (state.isPaused) return 'PAUSED';
    return 'RUNNING';
  }, [state.isPlaying, state.isPaused]);

  const panelVisible = (panelId: string): boolean =>
    state.panels.find((panel) => panel.id === panelId)
      ?.isVisible ?? false;

  if (phase === 'boot') {
    return <BootScreen />;
  }

  if (phase === 'home') {
    return (
      <HomeScreen
        projectTitle={state.projectTitle}
        statusMessage={state.statusMessage}
        onEnter={() => setPhase('editor')}
        onNewProject={() => {
          application.createProject(
            'Untitled CYRE Project',
            'soc-game',
          );
          setPhase('editor');
        }}
      />
    );
  }

  return (
    <div className="studio-phase editor-shell">
      <header className="studio-titlebar">
        <div className="brand">
          <div className="brand-mark">C</div>
          <div>
            <strong>CYRE</strong>
            <span>CYBERSECURITY REALITY ENGINE</span>
          </div>
        </div>

        <div className="project-title">
          <span>{state.projectTitle}</span>
          <span>•</span>
          <span className="saved">{state.statusMessage}</span>
        </div>

        <div className="title-actions">
          <button onClick={clearNotifications}>
            ◉ {state.notifications.length}
          </button>
        </div>
      </header>

      <nav className="studio-menubar">
        {state.menuGroups.map((group) => (
          <div
            key={group.id}
            className="menu-wrapper"
            onMouseEnter={() => handleMenuOpen(group.id)}
            onMouseLeave={handleMenuCloseSoon}
          >
            <button
              className="menu-trigger"
              aria-expanded={openMenuId === group.id}
              onClick={() => handleMenuTrigger(group.id)}
            >
              {group.label}
            </button>

            {openMenuId === group.id && (
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
            )}
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
            title={state.isPlaying ? 'Stop' : 'Play'}
          >
            {state.isPlaying ? '■' : '▶'}
          </button>

          <button
            disabled={!state.isPlaying}
            onClick={state.isPaused ? resume : pause}
            title={state.isPaused ? 'Resume' : 'Pause'}
          >
            {state.isPaused ? '▶' : 'Ⅱ'}
          </button>

          <button onClick={restart} title="Restart">
            ↻
          </button>

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
        {panelVisible('project-explorer') && (
          <ProjectExplorerPanel
            nodes={state.projectExplorerNodes}
          />
        )}

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

          {panelVisible('console') && (
            <ConsolePanel
              notifications={state.notifications}
            />
          )}
        </section>

        {panelVisible('inspector') && (
          <InspectorPanel target={state.inspectorTarget} />
        )}
      </main>

      <footer className="studio-statusbar">
        <div>
          <span className="status-online" />
          CYRE ENGINE
        </div>

        <div className="status-center">
          <span>Simulation: {simulationLabel}</span>
          <span>Speed: {state.simulationSpeed}×</span>
          <span>Entities: {state.networkNodes.length}</span>
          <span>Edges: {state.networkEdges.length}</span>
        </div>

        <div>
          <span>{state.statusMessage}</span>
        </div>
      </footer>
    </div>
  );
}
