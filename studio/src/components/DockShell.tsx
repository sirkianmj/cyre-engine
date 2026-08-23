import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import type {
  DragEvent,
  MouseEvent as ReactMouseEvent,
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
  ProjectNodeType,
} from '@cyre/engine';

import { useStudio } from '../studio/StudioContext';
import { Viewport } from './Viewport';
import { AttackGraphPanel, EvidenceGraphPanel, TimelinePanel } from './CyberGraphPanels';
import { LiveInspectorPanel, LiveEventsPanel } from './LivePanels';
import { DebuggerPanel, ReplayPanel } from './DebugReplayPanels';
import { PresentationPanel } from './PresentationPanel';
import { GameUIPanel } from './GameUIPanel';
import { RenderingPanel } from './RenderingPanel';
import { AssetPipelinePanel } from './AssetPipelinePanel';
import { ScriptingPluginPanel } from './ScriptingPluginPanel';
import { BuildDeployPanel } from './BuildDeployPanel';
import { ScenarioDesignerPanel, MissionDesignerPanel, ObjectiveGraphPanel, EventTriggerPanel, ScenarioGeneratorPanel } from './AuthoringPanels';

const nodeIcons: Record<string, string> = {
  folder: '▾',
  scene: '◈',
  mission: '◆',
  asset: '□',
  scenario: '◇',
};

interface ContextMenuItem {
  label: string;
  danger?: boolean;
  action: () => void;
}

interface ContextMenuState {
  x: number;
  y: number;
  items: ContextMenuItem[];
}

function ContextMenu({
  menu,
  onClose,
}: {
  menu: ContextMenuState | null;
  onClose: () => void;
}): JSX.Element | null {
  useEffect(() => {
    if (!menu) return;

    const close = (): void => onClose();
    const keyClose = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('pointerdown', close);
    window.addEventListener('keydown', keyClose);

    return () => {
      window.removeEventListener('pointerdown', close);
      window.removeEventListener('keydown', keyClose);
    };
  }, [menu, onClose]);

  if (!menu) return null;

  return (
    <div
      className="context-menu"
      style={{
        left: `${menu.x}px`,
        top: `${menu.y}px`,
      }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {menu.items.map((item) => (
        <button
          key={item.label}
          className={`context-menu-item ${
            item.danger ? 'danger' : ''
          }`}
          onClick={() => {
            item.action();
            onClose();
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

interface PanelChromeProps {
  panel: DockPanel;
  active: boolean;
  maximized: boolean;
  onActivate: () => void;
  onClose: () => void;
  onFloat: () => void;
  onMaximize: () => void;
  onDragStart: (event: DragEvent<HTMLElement>) => void;
  onMoveHandlePointerDown?: (
    event: ReactPointerEvent<HTMLElement>,
  ) => void;
  onContextMenu?: (
    event: ReactMouseEvent<HTMLElement>,
    panel: DockPanel,
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
  onMoveHandlePointerDown,
  onContextMenu,
  children,
}: PanelChromeProps): JSX.Element {
  return (
    <section
      className={`dock-panel ${active ? 'active' : ''} ${
        maximized ? 'maximized' : ''
      }`}
      onMouseDown={onActivate}
      onContextMenu={(event) => {
        event.preventDefault();
        onContextMenu?.(event, panel);
      }}
    >
      <header
        className="dock-panel-header"
        draggable
        onDragStart={onDragStart}
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
          onMouseDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onDragStart={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
        >
          <button
            type="button"
            draggable={false}
            className="dock-action"
            title="Float"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onFloat();
            }}
          >
            ⧉
          </button>

          <button
            type="button"
            draggable={false}
            className="dock-action"
            title={maximized ? 'Restore' : 'Maximize'}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onMaximize();
            }}
          >
            {maximized ? '❐' : '□'}
          </button>

          <button
            type="button"
            draggable={false}
            className="dock-action"
            title="Close"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onClose();
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
  expandedIds: Set<string>;
  onToggleExpand: (nodeId: string) => void;
  onSelect: (nodeId: string) => void;
  onCreateChild: (parentId: string) => void;
  onRename: (nodeId: string) => void;
  onDuplicate: (nodeId: string) => void;
  onDelete: (nodeId: string) => void;
  onMoveToRoot: (nodeId: string) => void;
  onDragStart: (
    event: DragEvent<HTMLElement>,
    nodeId: string,
  ) => void;
  onDropOnNode: (
    event: DragEvent<HTMLElement>,
    nodeId: string,
  ) => void;
  onContextMenu: (
    event: ReactMouseEvent<HTMLElement>,
    node: ProjectNode,
  ) => void;
  dropTargetId: string | null;
  onDragOverNode: (nodeId: string) => void;
  onDragLeaveNode: (nodeId: string) => void;
}

function ProjectTreeNode({
  node,
  nodes,
  depth,
  selectedNodeId,
  expandedIds,
  onToggleExpand,
  onSelect,
  onCreateChild,
  onRename,
  onDuplicate,
  onDelete,
  onMoveToRoot,
  onDragStart,
  onDropOnNode,
  onContextMenu,
  dropTargetId,
  onDragOverNode,
  onDragLeaveNode,
}: ProjectTreeNodeProps): JSX.Element {
  const [hovered, setHovered] = useState(false);
  const children = nodes.filter(
    (child) => child.parentId === node.id,
  );
  const expanded = expandedIds.has(node.id);

  return (
    <div>
      <div
        className={`tree-row ${
          selectedNodeId === node.id ? 'selected' : ''
        } ${node.type === 'folder' ? 'is-folder' : ''} ${
          dropTargetId === node.id ? 'drop-target' : ''
        }`}
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
        draggable
        onDragStart={(event) => onDragStart(event, node.id)}
        onDragOver={(event) => {
          event.preventDefault();
          event.stopPropagation();
          event.dataTransfer.dropEffect = 'move';
          onDragOverNode(node.id);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onDragLeaveNode(node.id);
        }}
        onDrop={(event) => onDropOnNode(event, node.id)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => onSelect(node.id)}
        onContextMenu={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onContextMenu(event, node);
        }}
      >
        <button
          type="button"
          className="tree-expander"
          onClick={(event) => {
            event.stopPropagation();
            if (children.length > 0) {
              onToggleExpand(node.id);
            }
          }}
        >
          {children.length > 0
            ? expanded
              ? '▾'
              : '▸'
            : '·'}
        </button>

        <span className="tree-icon">
          {nodeIcons[node.type] ?? '·'}
        </span>

        <span className="tree-name">{node.name}</span>

        {hovered && (
          <span className="tree-actions">
            {node.type === 'folder' && (
              <button
                type="button"
                title="New child"
                onClick={(event) => {
                  event.stopPropagation();
                  onCreateChild(node.id);
                }}
              >
                +
              </button>
            )}

            <button
              type="button"
              title="Rename"
              onClick={(event) => {
                event.stopPropagation();
                onRename(node.id);
              }}
            >
              ✏
            </button>

            <button
              type="button"
              title="Duplicate"
              onClick={(event) => {
                event.stopPropagation();
                onDuplicate(node.id);
              }}
            >
              ⧉
            </button>

            <button
              type="button"
              title="Delete"
              onClick={(event) => {
                event.stopPropagation();
                onDelete(node.id);
              }}
            >
              ×
            </button>
          </span>
        )}
      </div>

      {expanded &&
        children.map((child) => (
          <ProjectTreeNode
            key={child.id}
            node={child}
            nodes={nodes}
            depth={depth + 1}
            selectedNodeId={selectedNodeId}
            expandedIds={expandedIds}
            onToggleExpand={onToggleExpand}
            onSelect={onSelect}
            onCreateChild={onCreateChild}
            onRename={onRename}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
            onMoveToRoot={onMoveToRoot}
            onDragStart={onDragStart}
            onDropOnNode={onDropOnNode}
            onContextMenu={onContextMenu}
            dropTargetId={dropTargetId}
            onDragOverNode={onDragOverNode}
            onDragLeaveNode={onDragLeaveNode}
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
  const {
    addProjectNode,
    renameProjectNode,
    deleteProjectNode,
    duplicateProjectNode,
    moveProjectNode,
    selectProjectNode,
  } = useStudio();

  const [selectedNodeId, setSelectedNodeId] = useState<
    string | null
  >(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<
    ProjectNodeType | 'all'
  >('all');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => new Set(nodes.filter((node) => !node.parentId).map((node) => node.id)),
  );
  const [editingNodeId, setEditingNodeId] = useState<
    string | null
  >(null);
  const [editingName, setEditingName] = useState('');
  const [contextMenu, setContextMenu] =
    useState<ContextMenuState | null>(null);
  const [dropTargetId, setDropTargetId] = useState<
    string | null
  >(null);

  const filteredNodes = nodes.filter((node) => {
    const matchesType =
      filterType === 'all' || node.type === filterType;
    const query = search.trim().toLowerCase();
    const matchesSearch =
      query === '' ||
      node.name.toLowerCase().includes(query) ||
      node.id.toLowerCase().includes(query);
    return matchesType && matchesSearch;
  });

  const roots = filteredNodes.filter((node) => !node.parentId);

  const toggleExpand = (nodeId: string): void => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const createNode = (
    parentId: string | undefined,
    type: ProjectNodeType,
    title: string,
  ): void => {
    const name = window.prompt(title);
    if (!name || !name.trim()) return;
    addProjectNode(parentId, type, name.trim());

    if (parentId) {
      setExpandedIds((current) => new Set(current).add(parentId));
    }
  };

  const startEditing = (nodeId: string): void => {
    const node = nodes.find((entry) => entry.id === nodeId);
    if (!node) return;
    setEditingNodeId(nodeId);
    setEditingName(node.name);
  };

  const finishEditing = (): void => {
    if (editingNodeId) {
      renameProjectNode(editingNodeId, editingName);
      setEditingNodeId(null);
      setEditingName('');
    }
  };

  const confirmDelete = (nodeId: string): void => {
    if (!window.confirm('Delete this project node?')) return;
    deleteProjectNode(nodeId);
  };

  const handleDragStart = (
    event: DragEvent<HTMLElement>,
    nodeId: string,
  ): void => {
    event.dataTransfer.setData(
      'application/x-cyre-project-node',
      nodeId,
    );
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleDropOnNode = (
    event: DragEvent<HTMLElement>,
    targetNodeId: string,
  ): void => {
    event.preventDefault();
    event.stopPropagation();

    const nodeId = event.dataTransfer.getData(
      'application/x-cyre-project-node',
    );
    if (!nodeId || nodeId === targetNodeId) return;

    const targetNode = nodes.find(
      (entry) => entry.id === targetNodeId,
    );

    if (!targetNode) return;

    if (targetNode.type === 'folder') {
      moveProjectNode(nodeId, targetNodeId);
    } else {
      moveProjectNode(nodeId, targetNode.parentId);
    }

    setDropTargetId(null);
  };

  const handleDropOnRoot = (
    event: DragEvent<HTMLDivElement>,
  ): void => {
    event.preventDefault();
    const nodeId = event.dataTransfer.getData(
      'application/x-cyre-project-node',
    );
    if (!nodeId) return;
    moveProjectNode(nodeId, undefined);
    setDropTargetId(null);
  };

  const openNodeContextMenu = (
    event: ReactMouseEvent<HTMLElement>,
    node: ProjectNode,
  ): void => {
    setSelectedNodeId(node.id);
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      items: [
        ...(node.type === 'folder'
          ? [
              {
                label: 'New Subfolder',
                action: () =>
                  createNode(
                    node.id,
                    'folder',
                    'Folder name:',
                  ),
              },
              {
                label: 'New Scene',
                action: () =>
                  createNode(
                    node.id,
                    'scene',
                    'Scene name:',
                  ),
              },
              {
                label: 'New Mission',
                action: () =>
                  createNode(
                    node.id,
                    'mission',
                    'Mission name:',
                  ),
              },
              {
                label: 'New Asset',
                action: () =>
                  createNode(
                    node.id,
                    'asset',
                    'Asset name:',
                  ),
              },
            ]
          : []),
        {
          label: 'Rename',
          action: () => startEditing(node.id),
        },
        {
          label: 'Duplicate',
          action: () => duplicateProjectNode(node.id),
        },
        ...(node.parentId
          ? [
              {
                label: 'Move to Root',
                action: () =>
                  moveProjectNode(node.id, undefined),
              },
            ]
          : []),
        {
          label: 'Delete',
          danger: true,
          action: () => confirmDelete(node.id),
        },
      ],
    });
  };

  return (
    <div className="project-explorer">
      <div className="project-toolbar">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search project…"
        />

        <select
          value={filterType}
          onChange={(event) =>
            setFilterType(
              event.target.value as ProjectNodeType | 'all',
            )
          }
        >
          <option value="all">All</option>
          <option value="folder">Folders</option>
          <option value="scene">Scenes</option>
          <option value="mission">Missions</option>
          <option value="asset">Assets</option>
          <option value="scenario">Scenarios</option>
        </select>

        <div className="project-toolbar-buttons">
          <button
            type="button"
            title="New Folder"
            onClick={() =>
              createNode(undefined, 'folder', 'Folder name:')
            }
          >
            + Folder
          </button>

          <button
            type="button"
            title="New Scene"
            onClick={() =>
              createNode(undefined, 'scene', 'Scene name:')
            }
          >
            + Scene
          </button>

          <button
            type="button"
            title="New Mission"
            onClick={() =>
              createNode(undefined, 'mission', 'Mission name:')
            }
          >
            + Mission
          </button>

          <button
            type="button"
            title="New Asset"
            onClick={() =>
              createNode(undefined, 'asset', 'Asset name:')
            }
          >
            + Asset
          </button>
        </div>
      </div>

      {editingNodeId && (
        <div className="project-rename-bar">
          <input
            value={editingName}
            onChange={(event) =>
              setEditingName(event.target.value)
            }
            autoFocus
            onKeyDown={(event) => {
              if (event.key === 'Enter') finishEditing();
              if (event.key === 'Escape') {
                setEditingNodeId(null);
                setEditingName('');
              }
            }}
          />
          <button type="button" onClick={finishEditing}>
            Save
          </button>
        </div>
      )}

      <div
        className="tree"
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDropOnRoot}
      >
        {roots.map((node) => (
          <ProjectTreeNode
            key={node.id}
            node={node}
            nodes={filteredNodes}
            depth={0}
            selectedNodeId={selectedNodeId}
            expandedIds={expandedIds}
            onToggleExpand={toggleExpand}
            onSelect={(id) => {
              setSelectedNodeId(id);
              selectProjectNode(id);
            }}
            onCreateChild={(parentId) =>
              createNode(parentId, 'folder', 'Folder name:')
            }
            onRename={startEditing}
            onDuplicate={duplicateProjectNode}
            onDelete={confirmDelete}
            onMoveToRoot={(nodeId) =>
              moveProjectNode(nodeId, undefined)
            }
            onDragStart={handleDragStart}
            onDropOnNode={handleDropOnNode}
            onContextMenu={openNodeContextMenu}
            dropTargetId={dropTargetId}
            onDragOverNode={setDropTargetId}
            onDragLeaveNode={() => setDropTargetId(null)}
          />
        ))}
      </div>

      <ContextMenu
        menu={contextMenu}
        onClose={() => setContextMenu(null)}
      />
    </div>
  );
}

function EntityPalettePanel(): JSX.Element {
  const { state, addNetworkNodeFromPalette } = useStudio();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');

  const items = state.entityPaletteItems.filter((item) => {
    const matchesCategory =
      category === 'all' || item.category === category;
    const query = search.trim().toLowerCase();
    const matchesSearch =
      query === '' ||
      item.label.toLowerCase().includes(query) ||
      item.id.toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="entity-palette">
      <div className="project-toolbar">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search entities…"
        />
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          <option value="all">All</option>
          {state.entityPaletteCategories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      <div className="entity-grid">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className="entity-palette-item"
            draggable
            onDragStart={(event) => {
              event.dataTransfer.setData(
                'application/x-cyre-entity',
                item.id,
              );
              event.dataTransfer.effectAllowed = 'copy';
            }}
            onClick={() => addNetworkNodeFromPalette(item.id)}
          >
            <span className="entity-item-label">{item.label}</span>
            <span className="entity-item-category">
              {item.category}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function InspectorBody({
  target,
}: {
  target: InspectorTarget | null;
}): JSX.Element {
  const {
    setInspectorPropertyValue,
    resetInspectorProperty,
    resetInspectorProperties,
  } = useStudio();

  const [values, setValues] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (target) {
      const initial: Record<string, unknown> = {};
      for (const property of target.properties) {
        initial[property.key] = property.value;
      }
      setValues(initial);
    } else {
      setValues({});
    }
  }, [target]);

  if (!target) {
    return <div className="inspector-empty">No selection</div>;
  }

  const categories = Array.from(
    new Set(
      target.properties.map(
        (property) => property.category ?? 'General',
      ),
    ),
  ).sort();

  const commit = (key: string, value: unknown): void => {
    setValues((current) => ({ ...current, [key]: value }));
    setInspectorPropertyValue(key, value);
  };

  return (
    <div className="inspector-body">
      <div className="inspector-toolbar">
        <button type="button" onClick={resetInspectorProperties}>
          Reset All
        </button>
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
            .map((property) => {
              const value = values[property.key] ?? property.value;

              if (property.type === 'boolean') {
                return (
                  <div className="property-row" key={property.key}>
                    <span>{property.label}</span>
                    <input
                      type="checkbox"
                      checked={Boolean(value)}
                      onChange={(event) =>
                        commit(property.key, event.target.checked)
                      }
                    />
                  </div>
                );
              }

              if (property.type === 'number') {
                return (
                  <div className="property-row" key={property.key}>
                    <span>{property.label}</span>
                    <input
                      type="number"
                      value={Number(value)}
                      onChange={(event) =>
                        commit(property.key, Number(event.target.value))
                      }
                    />
                  </div>
                );
              }

              if (
                property.type === 'object' ||
                property.type === 'array'
              ) {
                const text = JSON.stringify(value, null, 2);
                return (
                  <div className="property-row vertical" key={property.key}>
                    <span>{property.label}</span>
                    <textarea
                      value={text}
                      onChange={(event) => {
                        try {
                          commit(property.key, JSON.parse(event.target.value));
                        setValues((current) => ({
                          ...current,
                          [property.key]: JSON.parse(event.target.value),
                        }));
                      } catch {
                        // keep invalid JSON locally without committing
                        setValues((current) => ({
                          ...current,
                          [property.key]: event.target.value,
                        }));
                      }
                    }}
                    />
                  </div>
                );
              }

              return (
                <div className="property-row" key={property.key}>
                  <span>{property.label}</span>
                  <input
                    type="text"
                    value={String(value)}
                    onChange={(event) =>
                      commit(property.key, event.target.value)
                    }
                  />
                </div>
              );
            })}
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
  const {
    selectNetworkNode,
    addNetworkNodeFromPalette,
    moveNetworkNode,
    connectNetworkNodes,
    removeNetworkNode,
    removeNetworkEdge,
    searchNetworkNodes,
    validateNetworkGraph,
  } = useStudio();

  return (
    <Viewport
      nodes={nodes}
      edges={edges}
      onSelectNode={selectNetworkNode}
      onDropEntity={addNetworkNodeFromPalette}
      onMoveNode={moveNetworkNode}
      onConnectNodes={connectNetworkNodes}
      onDeleteNode={removeNetworkNode}
      onDeleteEdge={removeNetworkEdge}
      onSearchNodes={searchNetworkNodes}
      onValidateGraph={validateNetworkGraph}
    />
  );
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

    case 'entity-palette':
      return <EntityPalettePanel />;

    case 'attack-graph':
      return <AttackGraphPanel />;

    case 'evidence-graph':
      return <EvidenceGraphPanel />;

    case 'timeline-editor':
      return <TimelinePanel />;

    case 'scenario-designer':
      return <ScenarioDesignerPanel />;

    case 'mission-designer':
      return <MissionDesignerPanel />;

    case 'objective-graph':
      return <ObjectiveGraphPanel />;

    case 'event-trigger-system':
      return <EventTriggerPanel />;

    case 'scenario-generator':
      return <ScenarioGeneratorPanel />;

    case 'live-inspector':
      return <LiveInspectorPanel />;

    case 'live-events':
      return <LiveEventsPanel />;

    case 'debugger-panel':
      return <DebuggerPanel />;

    case 'replay-panel':
      return <ReplayPanel />;

    case 'presentation-panel':
      return <PresentationPanel />;

    case 'game-ui-panel':
      return <GameUIPanel />;

    case 'rendering-panel':
      return <RenderingPanel />;

    case 'asset-pipeline':
      return <AssetPipelinePanel />;

    case 'scripting-panel':
      return <ScriptingPluginPanel />;

    case 'build-deployment':
      return <BuildDeployPanel />;

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
  onPanelContextMenu: (
    event: ReactMouseEvent<HTMLElement>,
    panel: DockPanel,
  ) => void;
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
  onPanelContextMenu,
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
            <div key={group[0].id} className="dock-group">
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
                onActivate={() => onActivate(activeGroupPanel.id)}
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
                onContextMenu={onPanelContextMenu}
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
    addProjectNode,
    clearNotifications,
    clearInspectorSelection,
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
  const [panelContextMenu, setPanelContextMenu] =
    useState<ContextMenuState | null>(null);

  const defaultFloatingPositions = [
    { x: 80, y: 80 },
    { x: 200, y: 180 },
    { x: 320, y: 280 },
    { x: 440, y: 380 },
  ];

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
    event.stopPropagation();

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

  const handleClosePanel = (panelId: string): void => {
    setPanelVisible(panelId, false);

    const nextActive = state.dockPanels.find(
      (panel) =>
        panel.visible &&
        panel.id !== panelId,
    );

    if (nextActive) {
      setActivePanel(nextActive.id);
    }
  };

  const openPanelContextMenu = (
    event: ReactMouseEvent<HTMLElement>,
    panel: DockPanel,
  ): void => {
    event.preventDefault();
    event.stopPropagation();

    const items: ContextMenuItem[] = [
      {
        label: panel.floating ? 'Dock to Center' : 'Float',
        action: () =>
          panel.floating
            ? dockPanel(panel.id, 'center')
            : undockPanel(panel.id),
      },
      {
        label:
          state.maximizedPanelId === panel.id
            ? 'Restore'
            : 'Maximize',
        action: () =>
          state.maximizedPanelId === panel.id
            ? restorePanel()
            : maximizePanel(panel.id),
      },
      {
        label: 'Close',
        danger: true,
        action: () => handleClosePanel(panel.id),
      },
    ];

    if (panel.id === 'project-explorer') {
      items.unshift(
        {
          label: 'New Folder',
          action: () =>
            addProjectNode(undefined, 'folder', 'New Folder'),
        },
        {
          label: 'New Scene',
          action: () =>
            addProjectNode(undefined, 'scene', 'New Scene'),
        },
        {
          label: 'New Mission',
          action: () =>
            addProjectNode(undefined, 'mission', 'New Mission'),
        },
        {
          label: 'New Asset',
          action: () =>
            addProjectNode(undefined, 'asset', 'New Asset'),
        },
      );
    }

    if (panel.id === 'inspector') {
      items.unshift({
        label: 'Clear Selection',
        action: () => clearInspectorSelection(),
      });
    }

    if (panel.id === 'console') {
      items.unshift({
        label: 'Clear Notifications',
        action: () => clearNotifications(),
      });
    }

    setPanelContextMenu({
      x: event.clientX,
      y: event.clientY,
      items,
    });
  };

  const zoneProps = {
    activePanelId: state.activePanelId,
    maximizedPanelId: state.maximizedPanelId,
    dragOverArea,
    onDragStart: handleDragStart,
    onDragOverArea: setDragOverArea,
    onDropPanel: handleDropPanel,
    onActivate: setActivePanel,
    onClose: handleClosePanel,
    onFloat: undockPanel,
    onMaximize: maximizePanel,
    onRestore: restorePanel,
    onPanelContextMenu: openPanelContextMenu,
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
            onClose={() => handleClosePanel(maximizedPanel.id)}
            onFloat={() => undockPanel(maximizedPanel.id)}
            onMaximize={() => restorePanel()}
            onDragStart={(event) =>
              handleDragStart(maximizedPanel.id, event)
            }
            onContextMenu={openPanelContextMenu}
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
        const position = getFloatingPosition(panel.id, index);

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
              onClose={() => handleClosePanel(panel.id)}
              onFloat={() => undockPanel(panel.id)}
              onMaximize={() => maximizePanel(panel.id)}
              onDragStart={(event) =>
                handleDragStart(panel.id, event)
              }
              onMoveHandlePointerDown={(event) =>
                startFloatingDrag(panel.id, event)
              }
              onContextMenu={openPanelContextMenu}
            >
              {renderBody(panel.id)}
            </PanelChrome>
          </div>
        );
      })}

      <ContextMenu
        menu={panelContextMenu}
        onClose={() => setPanelContextMenu(null)}
      />
    </div>
  );
}
