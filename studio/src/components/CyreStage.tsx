import { Suspense, lazy, useCallback, useMemo, useState } from 'react';

import { EngineViewport } from './EngineViewport';
import { ViewportContextMenu } from './ViewportContextMenu';

/**
 * The Three.js renderer is loaded on demand.
 *
 * Three.js is roughly half a megabyte minified. Users who stay on the engine GPU
 * renderer should never download it, so it is a separate chunk that is fetched
 * only the first time the renderer is switched.
 */
const ThreeViewport = lazy(() =>
  import('./ThreeViewport').then((module) => ({ default: module.ThreeViewport })),
);

import type { ViewportContextAction } from './ViewportContextMenu';

import { graphFromCyberSimulationState } from '../rendering/cyberSimulationGraph';
import { useStudio } from '../studio/StudioContext';

import type { GpuFrameStats, GpuProjectionMode, GpuRenderOptions } from '@cyre/engine';

/** A right-click pending in the viewport. */
interface PendingContextMenu {
  x: number;
  y: number;
  hostId: string | null;
}

/**
 * CyreStage
 * ----------
 * The viewport surface of the Studio.
 *
 * Rendering is delegated to `EngineViewport`, which draws through the engine's
 * `GpuSceneRenderer`. This component owns the surrounding contract the rest of
 * the Studio and the tests rely on: the `cyre-stage` element with its live
 * state attributes, the HUD, the selection and drag state, and the host
 * context menu.
 */
export function CyreStage(): JSX.Element {
  const { application, state, rendererBackend, selectCyberHost, viewportSettings } = useStudio();

  const [renderer, setRenderer] = useState<'gpu' | 'canvas2d' | 'none'>('gpu');
  const [frameStats, setFrameStats] = useState<GpuFrameStats | null>(null);
  const [selection, setSelection] = useState<string[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<
    Map<string, readonly [number, number, number]>
  >(() => new Map());
  const [contextMenu, setContextMenu] = useState<PendingContextMenu | null>(null);

  const cyberState = state.cyberSimulationState;
  const hostCount = cyberState ? Object.keys(cyberState.hosts).length : 0;
  const attackerPosition = cyberState?.attacker.position ?? 'none';

  // The engine scene graph is the single source of truth for what is drawn;
  // the projection below is only used to keep the node count in the HUD
  // consistent with the topology the renderer received.
  const projected = graphFromCyberSimulationState(cyberState);

  /**
   * The Visualization window's overlay toggles are the user-facing controls;
   * these are the engine render options they map onto. Keeping the mapping
   * here means every toggle has a real effect on what is drawn.
   */
  const renderOptions: GpuRenderOptions = useMemo(
    () => ({
      showGrid: viewportSettings.showGrid,
      showLabels: viewportSettings.showLabels,
      showWireframe: viewportSettings.showWireframe,
      showCompromised: viewportSettings.showCompromised,
      showIsolated: viewportSettings.showIsolated,
      showAlerts: viewportSettings.showAlerts,
      showEvidence: viewportSettings.showEvidence,
      brightness: viewportSettings.lightIntensity > 0 ? viewportSettings.lightIntensity / 2.4 : 1,
    }),
    [viewportSettings],
  );

  /**
   * Selecting a host in the viewport drives the same inspector the Host
   * Inspector window uses, so a click on an asset and a click in a list land in
   * the same place.
   */
  const handleSelectionChange = useCallback(
    (hostIds: string[]): void => {
      setSelection(hostIds);
      const primary = hostIds[hostIds.length - 1];
      if (primary) selectCyberHost(primary);
    },
    [selectCyberHost],
  );

  const handleMoveHosts = useCallback(
    (
      _hostIds: readonly string[],
      positions: Map<string, readonly [number, number, number]>,
    ): void => {
      setOverrides(positions);
    },
    [],
  );

  const handleContextMenu = useCallback(
    (event: { x: number; y: number; hostId: string | null }): void => {
      setContextMenu(event);
    },
    [],
  );

  const handleFrameStats = useCallback((stats: GpuFrameStats): void => {
    setFrameStats(stats);
  }, []);

  /**
   * The Three.js renderer reports the same three numbers the HUD shows; the
   * engine renderer reports more, and the extras are simply absent here rather
   * than invented.
   */
  const handleThreeFrameStats = useCallback(
    (stats: { nodeCount: number; edgeCount: number; drawCalls: number }): void => {
      setFrameStats({
        nodeCount: stats.nodeCount,
        edgeCount: stats.edgeCount,
        drawCalls: stats.drawCalls,
        // The Three.js renderer does not submit an engine triangle batch, so
        // these stay at zero rather than being estimated.
        triangleCount: 0,
        vertexCount: 0,
        projection: state.renderMode as GpuProjectionMode,
        gridDrawn: renderOptions.showGrid,
      });
    },
    [renderOptions.showGrid, state.renderMode],
  );

  const handleRendererChange = useCallback(
    (next: 'gpu' | 'canvas2d' | 'none'): void => {
      setRenderer(next);
    },
    [],
  );

  /** The host a right-click landed on, or the first selected host. */
  const contextHostId = contextMenu?.hostId ?? selection[0] ?? null;
  const contextHost = contextHostId ? cyberState?.hosts[contextHostId] : undefined;

  const contextActions: ViewportContextAction[] = useMemo(() => {
    if (!contextMenu) return [];

    const actions: ViewportContextAction[] = [];

    if (contextHostId) {
      actions.push({
        id: 'inspect',
        label: 'Inspect Host',
        onSelect: () => selectCyberHost(contextHostId),
      });

      if (contextHost && !contextHost.isolated) {
        actions.push({
          id: 'isolate',
          label: 'Isolate Host',
          onSelect: () => {
            application.executeCyberAction('isolateHost', { hostId: contextHostId });
          },
        });
      } else if (contextHost) {
        actions.push({
          id: 'restore',
          label: 'Restore Host',
          onSelect: () => {
            application.executeCyberAction('restoreHost', { hostId: contextHostId });
          },
        });
      }
    }

    if (selection.length > 0) {
      actions.push({
        id: 'clear-selection',
        label: `Clear Selection (${selection.length})`,
        onSelect: () => setSelection([]),
      });
    }

    if (overrides.size > 0) {
      actions.push({
        id: 'reset-positions',
        label: 'Reset Host Positions',
        onSelect: () => setOverrides(new Map()),
      });
    }

    actions.push({
      id: 'open-hosts',
      label: 'Open Host Inspector',
      onSelect: () => application.executeCommand('simulation.hosts'),
    });

    return actions;
  }, [application, contextHost, contextHostId, contextMenu, overrides.size, selectCyberHost, selection.length]);

  const compromisedCount = projected.nodes.filter(
    (node) => node.metadata?.compromised === true,
  ).length;
  const isolatedCount = projected.nodes.filter((node) => node.metadata?.isolated === true).length;
  const alertCount =
    cyberState?.alerts.filter((alert) => alert.status === 'new' || alert.status === 'investigating')
      .length ?? 0;

  return (
    <div
      className="cyre-stage"
      data-testid="cyre-stage"
      data-cyber-state={cyberState ? 'active' : 'inactive'}
      data-host-count={hostCount}
      data-attacker-position={attackerPosition}
      data-render-mode={state.renderMode}
      data-renderer={renderer}
      data-selection-count={selection.length}
      data-hovered-host={hoveredId ?? ''}
      data-moved-hosts={overrides.size}
      data-renderer-backend={rendererBackend}
    >
      {/*
        Both renderers take the same state, the same selection and the same
        dragged positions, so switching between them changes only which library
        draws the scene — never what the scene contains.
      */}
      {rendererBackend === 'three-webgl' ? (
        <Suspense fallback={<div className="cyre-stage-loading">Loading Three.js renderer…</div>}>
        <ThreeViewport
          state={cyberState}
          mode={state.renderMode as GpuProjectionMode}
          selection={selection}
          positionOverrides={overrides}
          options={renderOptions}
          onSelectionChange={handleSelectionChange}
          onMoveHosts={handleMoveHosts}
          onHostContextMenu={handleContextMenu}
          onHoverChange={setHoveredId}
          onFrameStats={handleThreeFrameStats}
          onRendererChange={handleRendererChange}
        />
        </Suspense>
      ) : (
        <EngineViewport
          state={cyberState}
          mode={state.renderMode as GpuProjectionMode}
          selection={selection}
          positionOverrides={overrides}
          options={renderOptions}
          onSelectionChange={handleSelectionChange}
          onMoveHosts={handleMoveHosts}
          onHostContextMenu={handleContextMenu}
          onHoverChange={setHoveredId}
          onFrameStats={handleFrameStats}
          onRendererChange={handleRendererChange}
        />
      )}

      <div className="cyre-stage-overlay">
        <div className="cyre-stage-hud">
          <div className="cyre-stage-hud-group">
            <span className="cyre-stage-chip" data-testid="stage-mode">
              <span
                className="cyre-dot"
                data-tone={state.isPlaying ? 'success' : state.isPaused ? 'warning' : undefined}
              />
              {state.renderMode.toUpperCase()}
            </span>
            <span className="cyre-stage-chip" data-testid="stage-stage">
              {cyberState?.attackStage ?? 'idle'}
            </span>
            {selection.length > 0 ? (
              <span className="cyre-stage-chip" data-testid="stage-selection">
                {selection.length} selected
              </span>
            ) : null}
            {hoveredId ? (
              <span className="cyre-stage-chip" data-testid="stage-hover">
                {cyberState?.hosts[hoveredId]?.name ?? hoveredId}
              </span>
            ) : null}
          </div>

          <div className="cyre-stage-hud-group" data-align="right">
            <span className="cyre-stage-chip" data-testid="stage-entities">
              {projected.nodes.length} entities
            </span>
            <span className="cyre-stage-chip" data-testid="stage-attacker">
              attacker: {attackerPosition}
            </span>
            <span className="cyre-stage-chip" data-testid="stage-fps">
              {frameStats ? `${frameStats.drawCalls} draws` : '—'}
            </span>
          </div>
        </div>

        <div className="cyre-stage-hud">
          <div className="cyre-stage-legend">
            {compromisedCount > 0 ? (
              <span className="cyre-stage-chip" data-testid="legend-compromised">
                <span className="cyre-dot" data-tone="danger" /> {compromisedCount} compromised
              </span>
            ) : null}
            {isolatedCount > 0 ? (
              <span className="cyre-stage-chip" data-testid="legend-isolated">
                <span className="cyre-dot" data-tone="warning" /> {isolatedCount} isolated
              </span>
            ) : null}
            {alertCount > 0 ? (
              <span className="cyre-stage-chip" data-testid="legend-alerts">
                <span className="cyre-dot" data-tone="danger" /> {alertCount} alerts
              </span>
            ) : null}
          </div>
          <span className="cyre-stage-chip" data-testid="stage-renderer">
            {rendererBackend === 'three-webgl'
              ? renderer === 'none'
                ? 'Three.js WebGL unavailable'
                : 'Three.js WebGL renderer'
              : renderer === 'gpu'
                ? 'engine GPU renderer'
                : renderer === 'canvas2d'
                  ? 'Canvas2D fallback'
                  : 'renderer unavailable'}
          </span>
        </div>
      </div>

      {contextMenu ? (
        <ViewportContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          title={contextHost?.name ?? (contextMenu.hostId ? contextMenu.hostId : 'Viewport')}
          actions={contextActions}
          onClose={() => setContextMenu(null)}
        />
      ) : null}
    </div>
  );
}
