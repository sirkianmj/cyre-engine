import { useCallback, useEffect, useMemo, useState } from 'react';

import type { MenuGroup } from '@cyre/engine';

import { useStudio } from '../studio/StudioContext';
import { CommandPaletteOverlay } from './CommandPaletteOverlay';
import { CyreViewport } from './CyreViewport';
import type { ViewportSettings } from './CyreViewport';
import { SplitPane } from './SplitPane';
import {
  BOTTOM_TABS,
  BottomTabBody,
  LEFT_TABS,
  RIGHT_TABS,
  renderLeftTab,
  renderRightTab,
  type BottomTabId,
  type LeftTabId,
  type RightTabId,
} from './WorkspacePanels';

interface EditorWorkspaceProps {
  onGoHome: () => void;
}

type LayoutPreset = 'main' | 'authoring' | 'simulation' | 'debug' | 'rendering';

const PRESETS: Array<{ id: LayoutPreset; label: string; left: LeftTabId; right: RightTabId; bottom: BottomTabId }> = [
  { id: 'main', label: 'Main', left: 'project', right: 'inspector', bottom: 'console' },
  { id: 'authoring', label: 'Authoring', left: 'palette', right: 'inspector', bottom: 'scenario' },
  { id: 'simulation', label: 'Simulation', left: 'outliner', right: 'live', bottom: 'timeline' },
  { id: 'debug', label: 'Debug', left: 'outliner', right: 'debugger', bottom: 'replay' },
  { id: 'rendering', label: 'Rendering', left: 'outliner', right: 'settings', bottom: 'rendering' },
];

const LAYOUT_KEY = 'cyre.studio.editor.layout';

interface PersistedLayout {
  leftWidth: number;
  rightWidth: number;
  bottomHeight: number;
  leftTab: LeftTabId;
  rightTab: RightTabId;
  bottomTab: BottomTabId;
  preset: LayoutPreset;
  settings: ViewportSettings;
  leftVisible: boolean;
  rightVisible: boolean;
  bottomVisible: boolean;
  viewportVisible: boolean;
}

function readLayout(): PersistedLayout | null {
  try {
    const raw = window.localStorage.getItem(LAYOUT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedLayout;
  } catch {
    return null;
  }
}

export function EditorWorkspace({ onGoHome }: EditorWorkspaceProps): JSX.Element {
  const {
    state,
    play,
    pause,
    resume,
    stop,
    restart,
    setSimulationSpeed,
    setRenderMode,
    executeCommand,
    saveProject,
    loadSavedProject,
    removeNetworkNode,
  } = useStudio();

  const stored = useMemo(() => readLayout(), []);
  const [leftWidth, setLeftWidth] = useState(stored?.leftWidth ?? 280);
  const [rightWidth, setRightWidth] = useState(stored?.rightWidth ?? 320);
  const [bottomHeight, setBottomHeight] = useState(stored?.bottomHeight ?? 236);
  const [leftVisible, setLeftVisible] = useState(stored?.leftVisible ?? true);
  const [rightVisible, setRightVisible] = useState(stored?.rightVisible ?? true);
  const [bottomVisible, setBottomVisible] = useState(stored?.bottomVisible ?? true);
  const [viewportVisible, setViewportVisible] = useState(stored?.viewportVisible ?? true);
  const [leftTab, setLeftTab] = useState<LeftTabId>(stored?.leftTab ?? 'project');
  const [rightTab, setRightTab] = useState<RightTabId>(stored?.rightTab ?? 'inspector');
  const [bottomTab, setBottomTab] = useState<BottomTabId>(stored?.bottomTab ?? 'console');
  const [preset, setPreset] = useState<LayoutPreset>(stored?.preset ?? 'main');
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [settings, setSettings] = useState<ViewportSettings>(
    stored?.settings ?? {
      showGrid: true,
      showWireframe: true,
      showLabels: true,
      lightIntensity: 2.6,
    },
  );

  useEffect(() => {
    const payload: PersistedLayout = {
      leftWidth,
      rightWidth,
      bottomHeight,
      leftTab,
      rightTab,
      bottomTab,
      preset,
      settings,
      leftVisible,
      rightVisible,
      bottomVisible,
      viewportVisible,
    };
    window.localStorage.setItem(LAYOUT_KEY, JSON.stringify(payload));
  }, [bottomHeight, bottomTab, leftTab, leftWidth, preset, rightTab, rightWidth, settings, leftVisible, rightVisible, bottomVisible, viewportVisible]);

  const applyPreset = (id: LayoutPreset): void => {
    const next = PRESETS.find((entry) => entry.id === id);
    if (!next) return;
    setPreset(id);
    setLeftTab(next.left);
    setRightTab(next.right);
    setBottomTab(next.bottom);
  };

  const handleMenuAction = (action?: string): void => {
    setOpenMenu(null);
    if (!action) return;
    if (action === 'studio.home') {
      onGoHome();
      return;
    }
    if (action === 'project.open-saved') {
      loadSavedProject();
      return;
    }
    if (action === 'windows.toggle-left') { setLeftVisible((visible) => !visible); return; }
    if (action === 'windows.toggle-right') { setRightVisible((visible) => !visible); return; }
    if (action === 'windows.toggle-bottom') { setBottomVisible((visible) => !visible); return; }
    if (action === 'windows.toggle-viewport') { setViewportVisible((visible) => !visible); return; }
    executeCommand(action);
  };

  const simulationLabel = state.isPaused ? 'PAUSED' : state.isPlaying ? 'RUNNING' : 'STOPPED';

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      const target = event.target as HTMLElement | null;
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable;

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((open) => !open);
        return;
      }
      if (event.key === 'Escape') {
        setPaletteOpen(false);
        setOpenMenu(null);
        return;
      }
      if (typing) return;

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        saveProject();
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        executeCommand('project.new');
        return;
      }
      if (event.key === 'F6') {
        event.preventDefault();
        play();
      }
      if (event.key === 'F7') {
        event.preventDefault();
        state.isPaused ? resume() : pause();
      }
      if (event.key === 'F8') {
        event.preventDefault();
        stop();
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        const selected = state.inspectorTarget?.id;
        if (selected && state.networkNodes.some((node) => node.id === selected)) {
          event.preventDefault();
          removeNetworkNode(selected);
        }
      }
      if (event.key === '1') setRenderMode('2d');
      if (event.key === '2') setRenderMode('2.5d');
      if (event.key === '3') setRenderMode('3d');
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    executeCommand,
    loadSavedProject,
    pause,
    play,
    removeNetworkNode,
    resume,
    saveProject,
    setRenderMode,
    state.inspectorTarget?.id,
    state.isPaused,
    state.networkNodes,
    stop,
  ]);

  const menuGroups = useMemo(() => {
    const baseGroups = state.menuGroups.map((group) =>
      group.id === 'file'
        ? {
            ...group,
            items: [
              ...group.items,
              { id: 'project.open-saved', label: 'Open Last Project', action: 'project.open-saved', enabled: true },
              { id: 'studio.home', label: 'Back to Home', action: 'studio.home', enabled: true },
            ],
          }
        : group,
    );

    const windowsGroup: MenuGroup = {
      id: 'windows',
      label: 'Windows',
      items: [
        {
          id: 'windows.toggle-left',
          label: leftVisible ? 'Hide Left Panel' : 'Show Left Panel',
          action: 'windows.toggle-left',
          enabled: true,
        },
        {
          id: 'windows.toggle-right',
          label: rightVisible ? 'Hide Right Panel' : 'Show Right Panel',
          action: 'windows.toggle-right',
          enabled: true,
        },
        {
          id: 'windows.toggle-bottom',
          label: bottomVisible ? 'Hide Bottom Panel' : 'Show Bottom Panel',
          action: 'windows.toggle-bottom',
          enabled: true,
        },
        {
          id: 'windows.toggle-viewport',
          label: viewportVisible ? 'Hide Viewport' : 'Show Viewport',
          action: 'windows.toggle-viewport',
          enabled: true,
        },
      ],
    };

    return [...baseGroups, windowsGroup];
  }, [state.menuGroups, leftVisible, rightVisible, bottomVisible, viewportVisible]);

  const closeMenus = useCallback(() => setOpenMenu(null), []);

  return (
    <div className="editor-root">
      <header className="editor-titlebar glass-bar">
        <button type="button" className="brand" onClick={onGoHome} title="Home">
          <span className="brand-mark">C</span>
          <span>
            <strong>CYRE Studio</strong>
            <em>Cybersecurity Reality Engine</em>
          </span>
        </button>

        <div className="title-project">
          <span>{state.projectTitle}</span>
          <span className="saved">{state.statusMessage}</span>
        </div>

        <nav className="menubar">
          {menuGroups.map((group) => (
            <div key={group.id} className="menu-wrapper">
              <button
                type="button"
                className={`menu-trigger${openMenu === group.id ? ' open' : ''}`}
                onClick={() => setOpenMenu((current) => (current === group.id ? null : group.id))}
              >
                {group.label}
              </button>
              {openMenu === group.id && (
                <div className="menu-dropdown glass-strong">
                  {group.items.map((item) => (
                    <button key={item.id} type="button" onClick={() => handleMenuAction(item.action)}>
                      <span>{item.label}</span>
                      {item.shortcut && <kbd>{item.shortcut}</kbd>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="title-end">
          <button type="button" className="ghost-btn" onClick={() => setPaletteOpen(true)}>
            ⌘K
          </button>
          <div className="engine-pill">
            <span className="engine-dot" />
            {state.engineState.toUpperCase()}
          </div>
        </div>
      </header>

      <div className="editor-toolbar glass-bar">
        <div className="transport">
          <button
            type="button"
            className={!state.isPlaying && !state.isPaused ? 'active' : ''}
            title={state.isPlaying || state.isPaused ? 'Stop' : 'Play'}
            onClick={state.isPlaying || state.isPaused ? stop : play}
          >
            {state.isPlaying || state.isPaused ? '■' : '▶'}
          </button>
          <button
            type="button"
            disabled={!state.isPlaying}
            title={state.isPaused ? 'Resume' : 'Pause'}
            onClick={state.isPaused ? resume : pause}
          >
            {state.isPaused ? '▶' : 'Ⅱ'}
          </button>
          <button type="button" title="Restart" onClick={restart}>
            ↻
          </button>
        </div>

        <label className="speed-control">
          Speed
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
        </label>

        <div className="mode-switch">
          {(['2d', '2.5d', '3d'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              className={state.renderMode === mode ? 'active' : ''}
              onClick={() => setRenderMode(mode)}
            >
              {mode === '2d' ? '2D' : mode === '2.5d' ? '2.5D' : '3D'}
            </button>
          ))}
        </div>

        <div className="preset-tabs">
          {PRESETS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className={preset === entry.id ? 'active' : ''}
              onClick={() => applyPreset(entry.id)}
            >
              {entry.label}
            </button>
          ))}
        </div>

        <div className={`sim-badge ${simulationLabel.toLowerCase()}`}>
          ● {simulationLabel}
        </div>
      </div>

      <div className="editor-body" onClick={closeMenus}>
        <SplitPane
          orientation="vertical"
          primary="second"
          value={bottomHeight}
          min={160}
          max={460}
          onChange={setBottomHeight}
          secondVisible={bottomVisible}
          first={
            <SplitPane
              orientation="horizontal"
              value={leftWidth}
              min={220}
              max={420}
              onChange={setLeftWidth}
              firstVisible={leftVisible}
              first={
                <section className="dock-card">
                  <div className="dock-tabs">
                    {LEFT_TABS.map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        className={leftTab === tab.id ? 'active' : ''}
                        onClick={() => setLeftTab(tab.id)}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                  <div className="dock-body">{renderLeftTab(leftTab)}</div>
                </section>
              }
              second={
                <SplitPane
                  orientation="horizontal"
                  primary="second"
                  value={rightWidth}
                  min={240}
                  max={460}
                  onChange={setRightWidth}
                  firstVisible={viewportVisible}
                  secondVisible={rightVisible}
                  first={
                    <section className="viewport-card">
                      <CyreViewport settings={settings} />
                    </section>
                  }
                  second={
                    <section className="dock-card">
                      <div className="dock-tabs">
                        {RIGHT_TABS.map((tab) => (
                          <button
                            key={tab.id}
                            type="button"
                            className={rightTab === tab.id ? 'active' : ''}
                            onClick={() => setRightTab(tab.id)}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>
                      <div className="dock-body">
                        {renderRightTab(rightTab, settings, setSettings)}
                      </div>
                    </section>
                  }
                />
              }
            />
          }
          second={
            <section className="dock-card bottom-card">
              <div className="dock-tabs scroll-tabs">
                {BOTTOM_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    className={bottomTab === tab.id ? 'active' : ''}
                    onClick={() => setBottomTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="dock-body">
                <BottomTabBody tab={bottomTab} />
              </div>
            </section>
          }
        />
      </div>

      <footer className="editor-status glass-bar">
        <span className="engine-dot" />
        <span>CYRE ENGINE</span>
        <span>Sim {simulationLabel}</span>
        <span>{state.renderMode.toUpperCase()}</span>
        <span>{state.networkNodes.length} entities</span>
        <span>{state.networkEdges.length} links</span>
        <span>{state.selectionCount} selected</span>
        <span className="status-message">{state.statusMessage}</span>
      </footer>

      <CommandPaletteOverlay open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
