import { useEffect, useMemo, useState } from 'react';

import type {
  DragEvent,
  MouseEvent as ReactMouseEvent,
} from 'react';

import type {
  EditorNotification,
  InspectorTarget,
  ProjectNode,
  ProjectNodeType,
} from '@cyre/engine';

import { useStudio } from '../studio/StudioContext';
import { visualForType } from '../rendering/entityVisuals';
import type { ViewportSettings } from './CyreViewport';
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
import { AssetFilePanel } from './AssetFilePanel';
import {
  EventTriggerPanel,
  MissionDesignerPanel,
  ObjectiveGraphPanel,
  ScenarioDesignerPanel,
  ScenarioGeneratorPanel,
} from './AuthoringPanels';

const NODE_ICONS: Record<string, string> = {
  folder: '▣',
  scene: '◈',
  mission: '◆',
  asset: '□',
  scenario: '◇',
};

interface ContextMenuState {
  x: number;
  y: number;
  items: Array<{ label: string; danger?: boolean; action: () => void }>;
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
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('pointerdown', close);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', close);
      window.removeEventListener('keydown', onKey);
    };
  }, [menu, onClose]);

  if (!menu) return null;

  return (
    <div
      className="context-menu"
      style={{ left: menu.x, top: menu.y }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {menu.items.map((item) => (
        <button
          key={item.label}
          type="button"
          className={`context-menu-item${item.danger ? ' danger' : ''}`}
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

function ProjectTreeNode({
  node,
  nodes,
  depth,
  selectedNodeId,
  expandedIds,
  dropTargetId,
  onToggle,
  onSelect,
  onContextMenu,
  onDragStart,
  onDropOnNode,
  onDragOverNode,
}: {
  node: ProjectNode;
  nodes: ProjectNode[];
  depth: number;
  selectedNodeId: string | null;
  expandedIds: Set<string>;
  dropTargetId: string | null;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  onContextMenu: (event: ReactMouseEvent<HTMLElement>, node: ProjectNode) => void;
  onDragStart: (event: DragEvent<HTMLElement>, nodeId: string) => void;
  onDropOnNode: (event: DragEvent<HTMLElement>, nodeId: string) => void;
  onDragOverNode: (nodeId: string | null) => void;
}): JSX.Element {
  const children = nodes.filter((child) => child.parentId === node.id);
  const expanded = expandedIds.has(node.id);

  return (
    <div>
      <button
        type="button"
        className={`tree-row${selectedNodeId === node.id ? ' selected' : ''}${
          dropTargetId === node.id ? ' drop-target' : ''
        }`}
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
        draggable
        onDragStart={(event) => onDragStart(event, node.id)}
        onDragOver={(event) => {
          event.preventDefault();
          onDragOverNode(node.id);
        }}
        onDragLeave={() => onDragOverNode(null)}
        onDrop={(event) => onDropOnNode(event, node.id)}
        onClick={() => onSelect(node.id)}
        onDoubleClick={() => children.length > 0 && onToggle(node.id)}
        onContextMenu={(event) => {
          event.preventDefault();
          onContextMenu(event, node);
        }}
      >
        <span className="tree-expander">
          {children.length > 0 ? (expanded ? '▾' : '▸') : '·'}
        </span>
        <span className="tree-icon">{NODE_ICONS[node.type] ?? '·'}</span>
        <span className="tree-name">{node.name}</span>
      </button>
      {expanded &&
        children.map((child) => (
          <ProjectTreeNode
            key={child.id}
            node={child}
            nodes={nodes}
            depth={depth + 1}
            selectedNodeId={selectedNodeId}
            expandedIds={expandedIds}
            dropTargetId={dropTargetId}
            onToggle={onToggle}
            onSelect={onSelect}
            onContextMenu={onContextMenu}
            onDragStart={onDragStart}
            onDropOnNode={onDropOnNode}
            onDragOverNode={onDragOverNode}
          />
        ))}
    </div>
  );
}

export function ProjectExplorerPanel(): JSX.Element {
  const {
    state,
    addProjectNode,
    renameProjectNode,
    deleteProjectNode,
    duplicateProjectNode,
    moveProjectNode,
    selectProjectNode,
  } = useStudio();

  const nodes = state.projectExplorerNodes;
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<ProjectNodeType | 'all'>('all');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => new Set(nodes.filter((node) => !node.parentId).map((node) => node.id)),
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [creating, setCreating] = useState<{ parentId?: string; type: ProjectNodeType } | null>(null);
  const [createName, setCreateName] = useState('');
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [menu, setMenu] = useState<ContextMenuState | null>(null);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return nodes.filter((node) => {
      const matchesType = filterType === 'all' || node.type === filterType;
      const matchesSearch =
        query === '' ||
        node.name.toLowerCase().includes(query) ||
        node.id.toLowerCase().includes(query);
      return matchesType && matchesSearch;
    });
  }, [filterType, nodes, search]);

  const roots = visible.filter((node) => !node.parentId);

  const commitCreate = (): void => {
    if (!creating || !createName.trim()) {
      setCreating(null);
      setCreateName('');
      return;
    }
    addProjectNode(creating.parentId, creating.type, createName.trim());
    if (creating.parentId) {
      setExpandedIds((current) => new Set(current).add(creating.parentId!));
    }
    setCreating(null);
    setCreateName('');
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
          onChange={(event) => setFilterType(event.target.value as ProjectNodeType | 'all')}
        >
          <option value="all">All</option>
          <option value="folder">Folders</option>
          <option value="scene">Scenes</option>
          <option value="mission">Missions</option>
          <option value="asset">Assets</option>
          <option value="scenario">Scenarios</option>
        </select>
      </div>

      <div className="project-toolbar-buttons">
        <button type="button" onClick={() => setCreating({ type: 'folder' })}>+ Folder</button>
        <button type="button" onClick={() => setCreating({ type: 'scene' })}>+ Scene</button>
        <button type="button" onClick={() => setCreating({ type: 'mission' })}>+ Mission</button>
        <button type="button" onClick={() => setCreating({ type: 'asset' })}>+ Asset</button>
      </div>

      {(creating || editingId) && (
        <div className="project-rename-bar">
          <input
            autoFocus
            value={creating ? createName : editingName}
            placeholder={creating ? `${creating.type} name` : 'Rename'}
            onChange={(event) => {
              if (creating) setCreateName(event.target.value);
              else setEditingName(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                if (creating) commitCreate();
                else if (editingId) {
                  renameProjectNode(editingId, editingName);
                  setEditingId(null);
                }
              }
              if (event.key === 'Escape') {
                setCreating(null);
                setEditingId(null);
              }
            }}
          />
          <button
            type="button"
            onClick={() => {
              if (creating) commitCreate();
              else if (editingId) {
                renameProjectNode(editingId, editingName);
                setEditingId(null);
              }
            }}
          >
            Save
          </button>
        </div>
      )}

      <div
        className="tree"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          const nodeId = event.dataTransfer.getData('application/x-cyre-project-node');
          if (nodeId) moveProjectNode(nodeId, undefined);
          setDropTargetId(null);
        }}
      >
        {roots.map((node) => (
          <ProjectTreeNode
            key={node.id}
            node={node}
            nodes={visible}
            depth={0}
            selectedNodeId={selectedNodeId}
            expandedIds={expandedIds}
            dropTargetId={dropTargetId}
            onToggle={(id) => {
              setExpandedIds((current) => {
                const next = new Set(current);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
              });
            }}
            onSelect={(id) => {
              setSelectedNodeId(id);
              selectProjectNode(id);
            }}
            onContextMenu={(event, node) => {
              setSelectedNodeId(node.id);
              setMenu({
                x: event.clientX,
                y: event.clientY,
                items: [
                  ...(node.type === 'folder'
                    ? [
                        {
                          label: 'New Folder',
                          action: () => setCreating({ parentId: node.id, type: 'folder' as const }),
                        },
                        {
                          label: 'New Scene',
                          action: () => setCreating({ parentId: node.id, type: 'scene' as const }),
                        },
                      ]
                    : []),
                  {
                    label: 'Rename',
                    action: () => {
                      setEditingId(node.id);
                      setEditingName(node.name);
                    },
                  },
                  { label: 'Duplicate', action: () => duplicateProjectNode(node.id) },
                  {
                    label: 'Delete',
                    danger: true,
                    action: () => deleteProjectNode(node.id),
                  },
                ],
              });
            }}
            onDragStart={(event, nodeId) => {
              event.dataTransfer.setData('application/x-cyre-project-node', nodeId);
              event.dataTransfer.effectAllowed = 'move';
            }}
            onDropOnNode={(event, targetId) => {
              event.preventDefault();
              const nodeId = event.dataTransfer.getData('application/x-cyre-project-node');
              const target = nodes.find((entry) => entry.id === targetId);
              if (!nodeId || !target || nodeId === targetId) return;
              moveProjectNode(nodeId, target.type === 'folder' ? targetId : target.parentId);
              setDropTargetId(null);
            }}
            onDragOverNode={setDropTargetId}
          />
        ))}
      </div>

      <ContextMenu menu={menu} onClose={() => setMenu(null)} />
    </div>
  );
}

export function HierarchyPanel(): JSX.Element {
  const { state, selectNetworkNode, addNetworkNodeFromPalette, removeNetworkNode } = useStudio();
  const [query, setQuery] = useState('');

  const nodes = state.networkNodes.filter((node) => {
    const value = query.trim().toLowerCase();
    return value === '' || node.label.toLowerCase().includes(value) || node.type.includes(value);
  });

  return (
    <div className="project-explorer">
      <div className="project-toolbar">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter entities…"
        />
        <button type="button" onClick={() => addNetworkNodeFromPalette('server')}>
          + Server
        </button>
      </div>
      <div className="tree">
        {nodes.map((node) => {
          const visual = visualForType(node.type);
          const selected = state.inspectorTarget?.id === node.id;
          return (
            <div key={node.id} className={`tree-row${selected ? ' selected' : ''}`}>
              <button
                type="button"
                className="tree-row"
                style={{ flex: 1, paddingLeft: 8 }}
                onClick={() => selectNetworkNode(node.id)}
              >
                <span className="tree-icon" style={{ color: visual.color }}>●</span>
                <span className="tree-name">{node.label}</span>
                <span className="graph-node-meta">{node.type}</span>
              </button>
              <button
                type="button"
                className="tree-icon"
                title="Delete"
                onClick={() => removeNetworkNode(node.id)}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function EntityPalettePanel(): JSX.Element {
  const { state, addNetworkNodeFromPalette } = useStudio();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  const items = state.entityPaletteItems.filter((item) => {
    const matchesCategory = category === 'all' || item.category === category;
    const query = search.trim().toLowerCase();
    const matchesSearch =
      query === '' || item.label.toLowerCase().includes(query) || item.id.toLowerCase().includes(query);
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
        <select value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="all">All</option>
          {state.entityPaletteCategories.map((entry) => (
            <option key={entry} value={entry}>
              {entry}
            </option>
          ))}
        </select>
      </div>
      <div className="entity-grid">
        {items.map((item) => {
          const visual = visualForType(item.id);
          return (
            <button
              key={item.id}
              type="button"
              className="entity-palette-item"
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData('application/x-cyre-entity', item.id);
                event.dataTransfer.effectAllowed = 'copy';
              }}
              onClick={() => addNetworkNodeFromPalette(item.id)}
            >
              <span className="entity-swatch" style={{ background: visual.color }} />
              <span className="entity-item-label">{item.label}</span>
              <span className="entity-item-category">{item.category}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function InspectorPanel(): JSX.Element {
  const {
    state,
    setInspectorPropertyValue,
    resetInspectorProperties,
  } = useStudio();
  const target = state.inspectorTarget;
  const [values, setValues] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (!target) {
      setValues({});
      return;
    }
    const next: Record<string, unknown> = {};
    for (const property of target.properties) {
      next[property.key] = property.value;
    }
    setValues(next);
  }, [target]);

  if (!target) {
    return <div className="inspector-empty">Select an entity, asset, or project node.</div>;
  }

  const categories = Array.from(
    new Set(target.properties.map((property) => property.category ?? 'General')),
  ).sort();

  const commit = (key: string, value: unknown): void => {
    setValues((current) => ({ ...current, [key]: value }));
    setInspectorPropertyValue(key, value);
  };

  return (
    <div className="inspector-body">
      <div className="unreal-inspector-header">
        <span>DETAILS</span>
        <strong>{target.name}</strong>
      </div>
      <div className="inspector-toolbar">
        <button type="button" onClick={resetInspectorProperties}>
          Reset
        </button>
      </div>
      {categories.map((category) => (
        <section key={category} className="inspector-section">
          <div className="section-title">{category.toUpperCase()}</div>
          {target.properties
            .filter((property) => (property.category ?? 'General') === category)
            .map((property) => {
              const value = values[property.key] ?? property.value;
              if (property.type === 'boolean') {
                return (
                  <label key={property.key} className="property-row">
                    <span>{property.label}</span>
                    <input
                      type="checkbox"
                      checked={Boolean(value)}
                      onChange={(event) => commit(property.key, event.target.checked)}
                    />
                  </label>
                );
              }
              if (property.type === 'number') {
                return (
                  <label key={property.key} className="property-row">
                    <span>{property.label}</span>
                    <input
                      type="number"
                      value={Number(value)}
                      onChange={(event) => commit(property.key, Number(event.target.value))}
                    />
                  </label>
                );
              }
              if (property.type === 'object' || property.type === 'array') {
                return (
                  <label key={property.key} className="property-row vertical">
                    <span>{property.label}</span>
                    <textarea
                      value={
                        typeof value === 'string' ? value : JSON.stringify(value, null, 2)
                      }
                      onChange={(event) => {
                        try {
                          commit(property.key, JSON.parse(event.target.value));
                        } catch {
                          setValues((current) => ({
                            ...current,
                            [property.key]: event.target.value,
                          }));
                        }
                      }}
                    />
                  </label>
                );
              }
              return (
                <label key={property.key} className="property-row">
                  <span>{property.label}</span>
                  <input
                    type="text"
                    value={String(value ?? '')}
                    onChange={(event) => commit(property.key, event.target.value)}
                  />
                </label>
              );
            })}
        </section>
      ))}
    </div>
  );
}

export function ConsolePanel(): JSX.Element {
  const { state, clearNotifications } = useStudio();
  const notifications: EditorNotification[] = state.notifications;

  return (
    <div className="console-output">
      <div className="inspector-toolbar">
        <button type="button" onClick={clearNotifications}>
          Clear
        </button>
      </div>
      {notifications.length === 0 ? (
        <div className="console-empty">Engine ready. No messages.</div>
      ) : (
        notifications.slice(-80).map((notification) => (
          <div key={notification.id} className={`console-line console-${notification.type}`}>
            <span>{notification.timestamp}</span>
            <strong>{notification.type.toUpperCase()}</strong>
            <span>{notification.message}</span>
          </div>
        ))
      )}
    </div>
  );
}

export function ViewportSettingsPanel({
  settings,
  onChange,
}: {
  settings: ViewportSettings;
  onChange: (settings: ViewportSettings) => void;
}): JSX.Element {
  const { state, setRenderMode, setActiveRenderingBackend, renderScene } = useStudio();

  return (
    <div className="authoring-panel">
      <h4>Viewport</h4>
      <div className="authoring-card">
        <label>
          Render Mode
          <select
            value={state.renderMode}
            onChange={(event) => setRenderMode(event.target.value)}
          >
            <option value="2d">2D Engine</option>
            <option value="2.5d">2.5D Engine</option>
            <option value="3d">3D Engine</option>
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={settings.showGrid}
            onChange={(event) => onChange({ ...settings, showGrid: event.target.checked })}
          />
          Show Grid
        </label>
        <label>
          <input
            type="checkbox"
            checked={settings.showWireframe}
            onChange={(event) => onChange({ ...settings, showWireframe: event.target.checked })}
          />
          Show Wireframe
        </label>
        <label>
          <input
            type="checkbox"
            checked={settings.showLabels}
            onChange={(event) => onChange({ ...settings, showLabels: event.target.checked })}
          />
          Show Labels
        </label>
        <label>
          Light Intensity
          <input
            type="range"
            min={0.2}
            max={6}
            step={0.1}
            value={settings.lightIntensity}
            onChange={(event) =>
              onChange({ ...settings, lightIntensity: Number(event.target.value) })
            }
          />
        </label>
      </div>

      <h4>Engine Backend</h4>
      <div className="authoring-card">
        <select
          value={state.activeRenderingBackendId ?? ''}
          onChange={(event) => setActiveRenderingBackend(event.target.value)}
        >
          {state.renderingBackends.map((backend) => (
            <option key={backend.id} value={backend.id}>
              {backend.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => renderScene(1920, 1080, state.renderMode)}
        >
          Submit Engine Frame
        </button>
      </div>

      {state.renderResult && (
        <pre className="authoring-preview">
          {JSON.stringify(state.renderResult, null, 2).slice(0, 1600)}
        </pre>
      )}
    </div>
  );
}

export function ContentBrowserPanel(): JSX.Element {
  const { state, importAssetFromContent } = useStudio();
  const [name, setName] = useState('');

  return (
    <div className="authoring-panel">
      <div className="graph-toolbar">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Asset name"
        />
        <button
          type="button"
          onClick={() => {
            if (!name.trim()) return;
            importAssetFromContent(name.trim(), 'data', '{}');
            setName('');
          }}
        >
          Import JSON
        </button>
      </div>
      <div className="unreal-content-browser">
        {state.assets.length === 0 ? (
          <div className="graph-empty">No assets in the content browser.</div>
        ) : (
          state.assets.map((asset) => (
            <div key={String(asset.id)} className="unreal-content-item">
              <div className="content-thumb">□</div>
              <span>{String(asset.name)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export type LeftTabId = 'project' | 'outliner' | 'palette';
export type RightTabId = 'inspector' | 'live' | 'debugger' | 'settings';
export type BottomTabId =
  | 'console'
  | 'network'
  | 'timeline'
  | 'content'
  | 'attack'
  | 'evidence'
  | 'scenario'
  | 'mission'
  | 'objectives'
  | 'triggers'
  | 'generator'
  | 'events'
  | 'replay'
  | 'gameui'
  | 'rendering'
  | 'assets'
  | 'scripts'
  | 'build'
  | 'import'
  | 'presentation';

export const LEFT_TABS: Array<{ id: LeftTabId; label: string }> = [
  { id: 'project', label: 'Project' },
  { id: 'outliner', label: 'Outliner' },
  { id: 'palette', label: 'Palette' },
];

export const RIGHT_TABS: Array<{ id: RightTabId; label: string }> = [
  { id: 'inspector', label: 'Details' },
  { id: 'live', label: 'Live' },
  { id: 'debugger', label: 'Debugger' },
  { id: 'settings', label: 'Viewport' },
];

export const BOTTOM_TABS: Array<{ id: BottomTabId; label: string }> = [
  { id: 'console', label: 'Output' },
  { id: 'network', label: 'Network Graph' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'content', label: 'Content' },
  { id: 'attack', label: 'Attack' },
  { id: 'evidence', label: 'Evidence' },
  { id: 'scenario', label: 'Scenario' },
  { id: 'mission', label: 'Mission' },
  { id: 'objectives', label: 'Objectives' },
  { id: 'triggers', label: 'Triggers' },
  { id: 'generator', label: 'Generator' },
  { id: 'events', label: 'Events' },
  { id: 'replay', label: 'Replay' },
  { id: 'gameui', label: 'Game UI' },
  { id: 'rendering', label: 'Rendering' },
  { id: 'assets', label: 'Assets' },
  { id: 'scripts', label: 'Scripts' },
  { id: 'build', label: 'Build' },
  { id: 'import', label: 'Import' },
  { id: 'presentation', label: 'Presentation' },
];

export function renderLeftTab(tab: LeftTabId): JSX.Element {
  if (tab === 'project') return <ProjectExplorerPanel />;
  if (tab === 'outliner') return <HierarchyPanel />;
  return <EntityPalettePanel />;
}

export function renderRightTab(
  tab: RightTabId,
  settings: ViewportSettings,
  onSettingsChange: (settings: ViewportSettings) => void,
): JSX.Element {
  if (tab === 'inspector') return <InspectorPanel />;
  if (tab === 'live') return <LiveInspectorPanel />;
  if (tab === 'debugger') return <DebuggerPanel />;
  return <ViewportSettingsPanel settings={settings} onChange={onSettingsChange} />;
}

export function BottomTabBody({ tab }: { tab: BottomTabId }): JSX.Element {
  const {
    state,
    selectNetworkNode,
    addNetworkNodeFromPalette,
    moveNetworkNode,
    connectNetworkNodes,
    removeNetworkNode,
    removeNetworkEdge,
    searchNetworkNodes,
    validateNetworkGraph,
  } = useStudio();

  switch (tab) {
    case 'console':
      return <ConsolePanel />;
    case 'network':
      return (
        <Viewport
          nodes={state.networkNodes}
          edges={state.networkEdges}
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
    case 'timeline':
      return <TimelinePanel />;
    case 'content':
      return <ContentBrowserPanel />;
    case 'attack':
      return <AttackGraphPanel />;
    case 'evidence':
      return <EvidenceGraphPanel />;
    case 'scenario':
      return <ScenarioDesignerPanel />;
    case 'mission':
      return <MissionDesignerPanel />;
    case 'objectives':
      return <ObjectiveGraphPanel />;
    case 'triggers':
      return <EventTriggerPanel />;
    case 'generator':
      return <ScenarioGeneratorPanel />;
    case 'events':
      return <LiveEventsPanel />;
    case 'replay':
      return <ReplayPanel />;
    case 'gameui':
      return <GameUIPanel />;
    case 'rendering':
      return <RenderingPanel />;
    case 'assets':
      return <AssetPipelinePanel />;
    case 'scripts':
      return <ScriptingPluginPanel />;
    case 'build':
      return <BuildDeployPanel />;
    case 'import':
      return <AssetFilePanel />;
    case 'presentation':
      return <PresentationPanel />;
    default:
      return <ConsolePanel />;
  }
}

export type { InspectorTarget };
