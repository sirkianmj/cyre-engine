import {
  useMemo,
  useState,
} from 'react';

import type {
  DragEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from 'react';

import type {
  DockArea,
  DockPanel,
  EditorNotification,
  InspectorTarget,
  NetworkGraphEdge,
  NetworkGraphNode,
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

interface PanelChromeProps {
  panel: DockPanel;
  active: boolean;
  maximized: boolean;
  onActivate: () => void;
  onClose: () => void;
  onFloat: () => void;
  onMaximize: () => void;
  onDragStart: (event: DragEvent<HTMLElement>) => void;
  onHeaderPointerDown?: (
    event: ReactPointerEvent<HTMLElement>,
  ) => void;
  onMoveHandlePointerDown?: (
    event: ReactPointerEvent<HTMLElement>,
  ) => void;
  children: ReactNode;
}

function PanelChrome({
  panel,
  active,
  maximized,
  onActivate,
  onClose,
  onFloat,
  onMaximize,
  onDragStart,
  onHeaderPointerDown,
  onMoveHandlePointerDown,
  children,
}: PanelChromeProps): JSX.Element {
  return (
    <section
      className={`dock-panel ${active ? 'active' : ''} ${
        maximized ? 'maximized' : ''
      }`}
      onMouseDown={onActivate}
    >
      <header
        className="dock-panel-header"
        draggable
        onDragStart={onDragStart}
        onPointerDown={onHeaderPointerDown}
      >
        <span className="dock-panel-title">
          {onMoveHandlePointerDown && (
            <span
              className="dock-panel-move-handle"
              title="Drag to move"
              onPointerDown={onMoveHandlePointerDown}
            >
              ✥
            </span>
          )}
          {panel.title}
        </span>

        <div
          className="dock-panel-actions"
          onMouseDown={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="dock-action"
            title="Float"
            onClick={(event) => {
              event.stopPropagation();
              onFloat();
            }}
            onPointerDown={(event) => {
              event.stopPropagation();
            }}
          >
            ⧉
          </button>

          <button
            type="button"
            className="dock-action"
            title={maximized ? 'Restore' : 'Maximize'}
            onClick={(event) => {
              event.stopPropagation();
              onMaximize();
            }}
            onPointerDown={(event) => {
              event.stopPropagation();
            }}
          >
            {maximized ? '❐' : '□'}
          </button>

          <button
            type="button"
            className="dock-action"
            title="Close"
            onClick={(event) => {
              event.stopPropagation();
              onClose();
            }}
            onPointerDown={(event) => {
              event.stopPropagation();
            }}
          >
            ×
          </button>
        </div>
      </header>

      <div className="dock-panel-body">{children}</div>
    </section>
  );
}

interface ProjectTreeNodeProps {
  node: ProjectNode;
  nodes: ProjectNode[];
  depth: number;
  selectedNodeId: string | null;
  onSelect: (nodeId: string) => void;
}

function ProjectTreeNode({
  node,
  nodes,
  depth,
  selectedNodeId,
  onSelect,
}: ProjectTreeNodeProps): JSX.Element {
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

function ProjectTree({
  nodes,
}: {
  nodes: ProjectNode[];
}): JSX.Element {
  const [selectedNodeId, setSelectedNodeId] = useState<
    string | null
  >(null);
  const roots = nodes.filter((node) => !node.parentId);

  return (
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
  );
}

function InspectorBody({
  target,
}: {
  target: InspectorTarget | null;
}): JSX.Element {
  if (!target) {
    return (
      <div className="inspector-empty">No selection</div>
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
    <div>
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
    </div>
  );
}

function ConsoleBody({
  notifications,
}: {
  notifications: EditorNotification[];
}): JSX.Element {
  return (
    <div className="console-output">
      {notifications.length === 0 ? (
        <div className="console-empty">No notifications.</div>
      ) : (
        notifications.slice(-30).map((notification) => (
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
  );
}

function NetworkBody({
  nodes,
  edges,
}: {
  nodes: NetworkGraphNode[];
  edges: NetworkGraphEdge[];
}): JSX.Element {
  return <Viewport nodes={nodes} edges={edges} />;
}

function getPanelBody(
  panelId: string,
  state: ReturnType<typeof useStudio>['state'],
): JSX.Element {
  switch (panelId) {
    case 'project-explorer':
      return (
        <ProjectTree
          nodes={state.projectExplorerNodes}
        />
      );

    case 'network-viewport':
      return (
        <NetworkBody
          nodes={state.networkNodes}
          edges={state.networkEdges}
        />
      );

    case 'inspector':
      return <InspectorBody target={state.inspectorTarget} />;

    case 'console':
      return (
        <ConsoleBody notifications={state.notifications} />
      );

    default:
      return (
        <div className="dock-panel-empty">
          No content configured for &quot;{panelId}&quot;
        </div>
      );
  }
}

interface DockZoneProps {
  area: DockArea;
  panels: DockPanel[];
  activePanelId: string | null;
  maximizedPanelId: string | null;
  draggedPanelId: string | null;
  dragOverArea: DockArea | null;
  onDragStart: (
    panelId: string,
    event: DragEvent<HTMLElement>,
  ) => void;
  onDragOverArea?: (area: DockArea) => void;
  onDropPanel: (
    area: DockArea,
    event: DragEvent<HTMLElement>,
  ) => void;
  onActivate: (panelId: string) => void;
  onClose: (panelId: string) => void;
  onFloat: (panelId: string) => void;
  onMaximize: (panelId: string) => void;
  onRestore: () => void;
  renderBody: (panelId: string) => JSX.Element;
}

function DockZone({
  area,
  panels,
  activePanelId,
  maximizedPanelId,
  dragOverArea,
  onDragStart,
  onDragOverArea,
  onDropPanel,
  onActivate,
  onClose,
  onFloat,
  onMaximize,
  onRestore,
  renderBody,
}: DockZoneProps): JSX.Element {
  const visiblePanels = panels.filter(
    (panel) => panel.visible && !panel.floating,
  );

  const groups = useMemo(() => {
    const result: DockPanel[][] = [];

    for (const panel of visiblePanels) {
      const previous = result[result.length - 1];
      const previousGroupId = previous?.[0]?.tabGroupId;

      if (
        panel.tabGroupId &&
        panel.tabGroupId === previousGroupId
      ) {
        previous.push(panel);
      } else {
        result.push([panel]);
      }
    }

    return result;
  }, [visiblePanels]);

  return (
    <div
      className={`dock-zone dock-zone-${area} ${
        dragOverArea === area ? 'drag-over' : ''
      } ${visiblePanels.length === 0 ? 'empty' : ''}`}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        onDragOverArea?.(area);
      }}
      onDrop={(event) => onDropPanel(area, event)}
    >
      {visiblePanels.length === 0 ? (
        <span>Drop panel here</span>
      ) : (
        groups.map((group) => {
          const activeGroupPanel =
            group.find((panel) => panel.id === activePanelId) ??
            group[0];

          return (
            <div
              key={group[0].id}
              className="dock-group"
            >
              {group.length > 1 && (
                <div className="dock-tabs">
                  {group.map((panel) => (
                    <button
                      key={panel.id}
                      className={
                        activePanelId === panel.id
                          ? 'active'
                          : ''
                      }
                      onClick={() => onActivate(panel.id)}
                    >
                      {panel.title}
                    </button>
                  ))}
                </div>
              )}

              <PanelChrome
                panel={activeGroupPanel}
                active={activePanelId === activeGroupPanel.id}
                maximized={
                  maximizedPanelId === activeGroupPanel.id
                }
                onActivate={() =>
                  onActivate(activeGroupPanel.id)
                }
                onClose={() => onClose(activeGroupPanel.id)}
                onFloat={() => onFloat(activeGroupPanel.id)}
                onMaximize={() => {
                  if (maximizedPanelId === activeGroupPanel.id) {
                    onRestore();
                  } else {
                    onMaximize(activeGroupPanel.id);
                  }
                }}
                onDragStart={(event) =>
                  onDragStart(activeGroupPanel.id, event)
                }
              >
                {renderBody(activeGroupPanel.id)}
              </PanelChrome>
            </div>
          );
        })
      )}
    </div>
  );
}

export function DockShell(): JSX.Element {
  const {
    state,
    dockPanel,
    undockPanel,
    setActivePanel,
    setPanelVisible,
    maximizePanel,
    restorePanel,
    saveDockLayout,
    loadDockLayout,
  } = useStudio();

  const [draggedPanelId, setDraggedPanelId] = useState<
    string | null
  >(null);
  const [dragOverArea, setDragOverArea] = useState<
    DockArea | null
  >(null);
  const [floatingPositions, setFloatingPositions] = useState<
    Record<string, { x: number; y: number }>
  >({});

  const defaultFloatingPositions = [
    { x: 80, y: 80 },
    { x: 200, y: 180 },
    { x: 320, y: 280 },
    { x: 440, y: 380 },
  ];

  const getFloatingPosition = (
    panelId: string,
    index: number,
  ): { x: number; y: number } => {
    const fallback =
      defaultFloatingPositions[
        index % defaultFloatingPositions.length
      ] ?? defaultFloatingPositions[0];

    return floatingPositions[panelId] ?? fallback;
  };

  const startFloatingDrag = (
    panelId: string,
    event: ReactPointerEvent<HTMLElement>,
  ): void => {
    event.preventDefault();

    const startX = event.clientX;
    const startY = event.clientY;
    const initial = getFloatingPosition(
      panelId,
      floatingPanels.findIndex((panel) => panel.id === panelId),
    );

    const onPointerMove = (moveEvent: PointerEvent): void => {
      const panelWidth = 360;
      const panelHeight = 260;

      const nextX = Math.min(
        window.innerWidth - panelWidth,
        Math.max(0, initial.x + moveEvent.clientX - startX),
      );

      const nextY = Math.min(
        window.innerHeight - panelHeight,
        Math.max(0, initial.y + moveEvent.clientY - startY),
      );

      setFloatingPositions((current) => ({
        ...current,
        [panelId]: { x: nextX, y: nextY },
      }));
    };

    const onPointerUp = (): void => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const panelsInArea = (area: DockArea): DockPanel[] =>
    state.dockPanels
      .filter(
        (panel) =>
          panel.area === area &&
          !panel.floating &&
          panel.visible,
      )
      .sort((a, b) => a.order - b.order);

  const floatingPanels = state.dockPanels.filter(
    (panel) => panel.floating && panel.visible,
  );

  const renderBody = (panelId: string): JSX.Element =>
    getPanelBody(panelId, state);

  const handleDragStart = (
    panelId: string,
    event: DragEvent<HTMLElement>,
  ): void => {
    event.dataTransfer.setData('text/plain', panelId);
    event.dataTransfer.effectAllowed = 'move';
    setDraggedPanelId(panelId);
  };

  const handleDropPanel = (
    area: DockArea,
    event: DragEvent<HTMLElement>,
  ): void => {
    event.preventDefault();
    const panelId =
      event.dataTransfer.getData('text/plain') || draggedPanelId;

    if (panelId) {
      dockPanel(panelId, area);
    }

    setDraggedPanelId(null);
    setDragOverArea(null);
  };

  const handleDropFloating = (
    event: DragEvent<HTMLElement>,
  ): void => {
    event.preventDefault();
    const panelId =
      event.dataTransfer.getData('text/plain') || draggedPanelId;

    if (panelId) {
      undockPanel(panelId);
    }

    setDraggedPanelId(null);
    setDragOverArea(null);
  };

  const zoneProps = {
    activePanelId: state.activePanelId,
    maximizedPanelId: state.maximizedPanelId,
    draggedPanelId,
    dragOverArea,
    onDragStart: handleDragStart,
    onDragOverArea: setDragOverArea,
    onDropPanel: handleDropPanel,
    onActivate: setActivePanel,
    onClose: (panelId: string) =>
      setPanelVisible(panelId, false),
    onFloat: undockPanel,
    onMaximize: maximizePanel,
    onRestore: restorePanel,
    renderBody,
  };

  if (state.maximizedPanelId) {
    const maximizedPanel = state.dockPanels.find(
      (panel) => panel.id === state.maximizedPanelId,
    );

    if (maximizedPanel) {
      return (
        <div className="dock-maximized">
          <PanelChrome
            panel={maximizedPanel}
            active
            maximized
            onActivate={() => setActivePanel(maximizedPanel.id)}
            onClose={() =>
              setPanelVisible(maximizedPanel.id, false)
            }
            onFloat={() => undockPanel(maximizedPanel.id)}
            onMaximize={() => restorePanel()}
            onDragStart={(event) =>
              handleDragStart(maximizedPanel.id, event)
            }
          >
            {renderBody(maximizedPanel.id)}
          </PanelChrome>
        </div>
      );
    }
  }

  return (
    <div className="dock-root">
      <div className="dock-layout-toolbar">
        <button
          onClick={() => {
            const name = window.prompt('Save layout as:');
            if (name) {
              saveDockLayout(name);
            }
          }}
        >
          Save Layout
        </button>

        <select
          value=""
          onChange={(event) => {
            if (event.target.value) {
              loadDockLayout(event.target.value);
              event.target.value = '';
            }
          }}
        >
          <option value="">Load Layout…</option>
          {(state.savedDockLayouts ?? []).map((layout) => (
            <option key={layout.id} value={layout.id}>
              {layout.name}
            </option>
          ))}
        </select>
      </div>

      {panelsInArea('top').length > 0 && (
        <div className="dock-top">
          <DockZone
            area="top"
            panels={panelsInArea('top')}
            {...zoneProps}
          />
        </div>
      )}

      <div className="dock-middle">
        <div className="dock-left">
          <DockZone
            area="left"
            panels={panelsInArea('left')}
            {...zoneProps}
          />
        </div>

        <div className="dock-center">
          <DockZone
            area="center"
            panels={panelsInArea('center')}
            {...zoneProps}
          />
        </div>

        <div className="dock-right">
          <DockZone
            area="right"
            panels={panelsInArea('right')}
            {...zoneProps}
          />
        </div>
      </div>

      {panelsInArea('bottom').length > 0 && (
        <div className="dock-bottom">
          <DockZone
            area="bottom"
            panels={panelsInArea('bottom')}
            {...zoneProps}
          />
        </div>
      )}

      <div
        className="dock-floating-drop"
        onDragOver={(event) => {
          event.preventDefault();
          setDragOverArea(null);
        }}
        onDrop={handleDropFloating}
      >
        Float here
      </div>

      {floatingPanels.map((panel, index) => {
        const position = getFloatingPosition(
          panel.id,
          index,
        );

        return (
          <div
            key={panel.id}
            className="dock-floating-panel"
            style={{
              transform: `translate(${position.x}px, ${position.y}px)`,
            }}
          >
            <PanelChrome
              panel={panel}
              active={state.activePanelId === panel.id}
              maximized={false}
              onActivate={() => setActivePanel(panel.id)}
              onClose={() => setPanelVisible(panel.id, false)}
              onFloat={() => undockPanel(panel.id)}
              onMaximize={() => maximizePanel(panel.id)}
              onDragStart={(event) =>
                handleDragStart(panel.id, event)
              }
              onHeaderPointerDown={undefined}
              onMoveHandlePointerDown={(event) =>
                startFloatingDrag(panel.id, event)
              }
            >
              {renderBody(panel.id)}
            </PanelChrome>
          </div>
        );
      })}
    </div>
  );
}
