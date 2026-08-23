import { useMemo, useState } from 'react';
import { useStudio } from '../studio/StudioContext';
import { WebGLViewport } from './WebGLViewport';

type LeftTab = 'project' | 'hierarchy';
type BottomTab = 'content' | 'console' | 'timeline';
type RightTab = 'inspector' | 'entities';

const nodeIcons: Record<string, string> = {
  folder: '▾',
  scene: '◈',
  mission: '◆',
  asset: '□',
  scenario: '◇',
};

export function UnrealEditorLayout(): JSX.Element {
  const { state, play, pause, resume, stop, restart, setSimulationSpeed } = useStudio();
  const [leftTab, setLeftTab] = useState<LeftTab>('project');
  const [bottomTab, setBottomTab] = useState<BottomTab>('console');
  const [rightTab, setRightTab] = useState<RightTab>('inspector');

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
      <div className="unreal-center-layout">
        <aside className="unreal-sidebar left">
          <div className="unreal-sidebar-tabs">
            <button
              className={leftTab === 'project' ? 'active' : ''}
              onClick={() => setLeftTab('project')}
            >
              Project
            </button>
            <button
              className={leftTab === 'hierarchy' ? 'active' : ''}
              onClick={() => setLeftTab('hierarchy')}
            >
              Hierarchy
            </button>
          </div>

          <div className="unreal-sidebar-body">
            {leftTab === 'project' ? (
              <div className="unreal-tree">
                {roots.map((node) => (
                  <div key={node.id} className="unreal-tree-item">
                    <span>{nodeIcons[node.type] ?? '·'}</span>
                    <span>{node.name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="unreal-tree">
                {state.networkNodes.map((node) => (
                  <div key={node.id} className="unreal-tree-item">
                    <span>▣</span>
                    <span>{node.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        <main className="unreal-viewport-region">
          <div className="unreal-toolbar">
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
          </div>

          <div className="unreal-webgl-area">
            <WebGLViewport />
          </div>

          <div className="unreal-bottom-region">
            <div className="unreal-bottom-tabs">
              <button
                className={bottomTab === 'content' ? 'active' : ''}
                onClick={() => setBottomTab('content')}
              >
                Content Browser
              </button>
              <button
                className={bottomTab === 'console' ? 'active' : ''}
                onClick={() => setBottomTab('console')}
              >
                Console
              </button>
              <button
                className={bottomTab === 'timeline' ? 'active' : ''}
                onClick={() => setBottomTab('timeline')}
              >
                Timeline
              </button>
            </div>

            <div className="unreal-bottom-body">
              {bottomTab === 'console' && (
                <div className="unreal-console">
                  {state.notifications.slice(-8).reverse().map((notification) => (
                    <div key={notification.id} className={`unreal-console-line ${notification.type}`}>
                      <span>{notification.timestamp}</span>
                      <strong>{notification.type.toUpperCase()}</strong>
                      <span>{notification.message}</span>
                    </div>
                  ))}
                </div>
              )}

              {bottomTab === 'content' && (
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
              )}

              {bottomTab === 'timeline' && (
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
              )}
            </div>
          </div>
        </main>

        <aside className="unreal-sidebar right">
          <div className="unreal-sidebar-tabs">
            <button
              className={rightTab === 'inspector' ? 'active' : ''}
              onClick={() => setRightTab('inspector')}
            >
              Details
            </button>
            <button
              className={rightTab === 'entities' ? 'active' : ''}
              onClick={() => setRightTab('entities')}
            >
              Entities
            </button>
          </div>

          <div className="unreal-sidebar-body">
            {rightTab === 'inspector' ? (
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
            ) : (
              <div className="unreal-entity-list">
                {state.networkNodes.map((node) => (
                  <div key={node.id} className="unreal-tree-item">
                    <span>▣</span>
                    <span>{node.label}</span>
                    <span className="unreal-meta">{node.type}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>

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
