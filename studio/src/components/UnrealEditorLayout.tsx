import { useMemo, useState } from 'react';
import { useStudio } from '../studio/StudioContext';
import { WebGLViewport } from './WebGLViewport';

type PanelId = 'project' | 'hierarchy' | 'inspector' | 'entities' | 'content' | 'console' | 'timeline' | 'rendering';

const nodeIcons: Record<string, string> = {
  folder: '▾',
  scene: '◈',
  mission: '◆',
  asset: '□',
  scenario: '◇',
};

interface RenderSettings {
  showGrid: boolean;
  showWireframe: boolean;
  lightIntensity: number;
}

const windowDefinitions: Array<{ id: PanelId; label: string }> = [
  { id: 'project', label: 'Project' },
  { id: 'hierarchy', label: 'Hierarchy' },
  { id: 'inspector', label: 'Details' },
  { id: 'entities', label: 'Entities' },
  { id: 'content', label: 'Content Browser' },
  { id: 'console', label: 'Console' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'rendering', label: 'Rendering Settings' },
];

export function UnrealEditorLayout(): JSX.Element {
  const {
    state,
    play,
    pause,
    resume,
    stop,
    restart,
    setSimulationSpeed,
    setRenderMode,
    selectProjectNode,
    selectNetworkNode,
    addProjectNode,
    clearNotifications,
    addTimelineEntry,
    importAssetFromContent,
    addNetworkNodeFromPalette,
  } = useStudio();

  const [openPanels, setOpenPanels] = useState<Set<PanelId>>(
    () => new Set<PanelId>(['project', 'hierarchy', 'inspector', 'entities', 'content', 'console', 'timeline', 'rendering']),
  );

  const [renderSettings, setRenderSettings] = useState<RenderSettings>({
    showGrid: true,
    showWireframe: true,
    lightIntensity: 2.8,
  });

  const [timelineLabel, setTimelineLabel] = useState('');
  const [assetName, setAssetName] = useState('');

  const togglePanel = (panel: PanelId): void => {
    setOpenPanels((current) => {
      const next = new Set(current);
      if (next.has(panel)) next.delete(panel);
      else next.add(panel);
      return next;
    });
  };

  const closePanel = (panel: PanelId): void => {
    setOpenPanels((current) => {
      const next = new Set(current);
      next.delete(panel);
      return next;
    });
  };

  const roots = useMemo(
    () => state.projectExplorerNodes.filter((node) => !node.parentId),
    [state.projectExplorerNodes],
  );

  const simulationLabel = !state.isPlaying
    ? 'STOPPED'
    : state.isPaused
      ? 'PAUSED'
      : 'RUNNING';

  return (
    <div className="unreal-editor-shell">
      <div className="unreal-toolbar top">
        <button className={!state.isPlaying ? 'active' : ''} onClick={state.isPlaying ? stop : play}>
          {state.isPlaying ? '■' : '▶'}
        </button>
        <button disabled={!state.isPlaying} onClick={state.isPaused ? resume : pause}>
          {state.isPaused ? '▶' : 'Ⅱ'}
        </button>
        <button onClick={restart}>↻</button>
        <span className="simulation-badge">{simulationLabel}</span>
        <select
          value={state.simulationSpeed}
          onChange={(event) => setSimulationSpeed(Number(event.target.value))}
        >
          <option value={0.25}>0.25×</option>
          <option value={0.5}>0.5×</option>
          <option value={1}>1×</option>
          <option value={2}>2×</option>
          <option value={4}>4×</option>
        </select>

        <div className="unreal-window-menu">
          <span className="window-menu-label">Windows</span>
          {windowDefinitions.map((def) => (
            <button
              key={def.id}
              className={openPanels.has(def.id) ? 'active' : ''}
              onClick={() => togglePanel(def.id)}
            >
              {def.label}
            </button>
          ))}
        </div>
      </div>

      <div className="unreal-center-layout">
        <aside className="unreal-sidebar left">
          {openPanels.has('project') && (
            <div className="unreal-window">
              <header className="unreal-window-header">
                <span>Project</span>
                <span className="unreal-window-actions">
                  <button title="New Folder" onClick={() => addProjectNode(undefined, 'folder', 'New Folder')}>+</button>
                  <button title="New Scene" onClick={() => addProjectNode(undefined, 'scene', 'New Scene')}>◈</button>
                  <button title="Close" onClick={() => closePanel('project')}>×</button>
                </span>
              </header>
              <div className="unreal-window-body">
                <div className="unreal-tree">
                  {roots.map((node) => (
                    <button
                      key={node.id}
                      className="unreal-tree-item"
                      onClick={() => selectProjectNode(node.id)}
                    >
                      <span>{nodeIcons[node.type] ?? '·'}</span>
                      <span>{node.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {openPanels.has('hierarchy') && (
            <div className="unreal-window">
              <header className="unreal-window-header">
                <span>Hierarchy</span>
                <span className="unreal-window-actions">
                  <button
                    title="Add Server"
                    onClick={() => addNetworkNodeFromPalette('server')}
                  >
                    +
                  </button>
                  <button onClick={() => closePanel('hierarchy')}>×</button>
                </span>
              </header>
              <div className="unreal-window-body">
                <div className="unreal-tree">
                  {state.networkNodes.map((node) => (
                    <button
                      key={node.id}
                      className="unreal-tree-item"
                      onClick={() => selectNetworkNode(node.id)}
                    >
                      <span>▣</span>
                      <span>{node.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </aside>

        <main className="unreal-viewport-region">
          <div className="unreal-webgl-area">
            <WebGLViewport settings={renderSettings} />
          </div>

          <div className="unreal-bottom-region">
            {openPanels.has('console') && (
              <div className="unreal-window bottom">
                <header className="unreal-window-header">
                  <span>Console</span>
                  <span className="unreal-window-actions">
                    <button onClick={clearNotifications}>Clear</button>
                    <button onClick={() => closePanel('console')}>×</button>
                  </span>
                </header>
                <div className="unreal-window-body">
                  <div className="unreal-console">
                    {state.notifications.slice(-8).reverse().map((notification) => (
                      <div key={notification.id} className={`unreal-console-line ${notification.type}`}>
                        <span>{notification.timestamp}</span>
                        <strong>{notification.type.toUpperCase()}</strong>
                        <span>{notification.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {openPanels.has('content') && (
              <div className="unreal-window bottom">
                <header className="unreal-window-header">
                  <span>Content Browser</span>
                  <span className="unreal-window-actions">
                    <input
                      value={assetName}
                      onChange={(event) => setAssetName(event.target.value)}
                      placeholder="Asset name"
                    />
                    <button
                      onClick={() => {
                        if (assetName.trim()) {
                          importAssetFromContent(assetName, 'data', '{}');
                          setAssetName('');
                        }
                      }}
                    >
                      Import JSON
                    </button>
                    <button onClick={() => closePanel('content')}>×</button>
                  </span>
                </header>
                <div className="unreal-window-body">
                  <div className="unreal-content-browser">
                    {state.assets.length === 0 ? (
                      <span>No assets imported.</span>
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
              </div>
            )}

            {openPanels.has('timeline') && (
              <div className="unreal-window bottom">
                <header className="unreal-window-header">
                  <span>Timeline</span>
                  <span className="unreal-window-actions">
                    <input
                      value={timelineLabel}
                      onChange={(event) => setTimelineLabel(event.target.value)}
                      placeholder="Event label"
                    />
                    <button
                      onClick={() => {
                        if (timelineLabel.trim()) {
                          addTimelineEntry(Date.now(), timelineLabel, 'event');
                          setTimelineLabel('');
                        }
                      }}
                    >
                      Add
                    </button>
                    <button onClick={() => closePanel('timeline')}>×</button>
                  </span>
                </header>
                <div className="unreal-window-body">
                  <div className="unreal-timeline">
                    {state.timelineEntries.length === 0 ? (
                      <span>No timeline entries.</span>
                    ) : (
                      state.timelineEntries.map((entry) => (
                        <div key={entry.id} className="unreal-timeline-entry">
                          <span>{entry.type}</span>
                          <strong>{entry.label}</strong>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>

        <aside className="unreal-sidebar right">
          {openPanels.has('inspector') && (
            <div className="unreal-window">
              <header className="unreal-window-header">
                <span>Details</span>
                <button onClick={() => closePanel('inspector')}>×</button>
              </header>
              <div className="unreal-window-body">
                <div className="unreal-inspector">
                  {state.inspectorTarget ? (
                    <>
                      <div className="unreal-inspector-header">
                        <span>INSPECTOR</span>
                        <strong>{state.inspectorTarget.name}</strong>
                      </div>
                      {state.inspectorTarget.properties.map((property) => (
                        <div key={property.key} className="unreal-property-row">
                          <span>{property.label}</span>
                          <strong>{String(property.value)}</strong>
                        </div>
                      ))}
                    </>
                  ) : (
                    <div className="unreal-empty">No selection</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {openPanels.has('entities') && (
            <div className="unreal-window">
              <header className="unreal-window-header">
                <span>Entities</span>
                <button onClick={() => closePanel('entities')}>×</button>
              </header>
              <div className="unreal-window-body">
                <div className="unreal-entity-list">
                  {state.networkNodes.map((node) => (
                    <button
                      key={node.id}
                      className="unreal-tree-item"
                      onClick={() => selectNetworkNode(node.id)}
                    >
                      <span>▣</span>
                      <span>{node.label}</span>
                      <span className="unreal-meta">{node.type}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>

      {openPanels.has('rendering') && (
        <div className="unreal-floating-window">
          <header className="unreal-window-header">
            <span>Rendering Settings</span>
            <button onClick={() => closePanel('rendering')}>×</button>
          </header>
          <div className="unreal-window-body">
            <div className="unreal-settings">
              <label>
                Mode
                <select value={state.renderMode} onChange={(event) => setRenderMode(event.target.value)}>
                  <option value="2d">2D</option>
                  <option value="2.5d">2.5D</option>
                  <option value="3d">3D</option>
                </select>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={renderSettings.showGrid}
                  onChange={(event) =>
                    setRenderSettings((current) => ({ ...current, showGrid: event.target.checked }))
                  }
                />
                Show Grid
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={renderSettings.showWireframe}
                  onChange={(event) =>
                    setRenderSettings((current) => ({ ...current, showWireframe: event.target.checked }))
                  }
                />
                Show Wireframe
              </label>
              <label>
                Light Intensity
                <input
                  type="range"
                  min={0}
                  max={6}
                  step={0.1}
                  value={renderSettings.lightIntensity}
                  onChange={(event) =>
                    setRenderSettings((current) => ({ ...current, lightIntensity: Number(event.target.value) }))
                  }
                />
              </label>
            </div>
          </div>
        </div>
      )}

      <footer className="unreal-statusbar">
        <span className="status-online" />
        <span>CYRE ENGINE</span>
        <span>Entities: {state.networkNodes.length}</span>
        <span>Edges: {state.networkEdges.length}</span>
        <span>{state.statusMessage}</span>
      </footer>
    </div>
  );
}
