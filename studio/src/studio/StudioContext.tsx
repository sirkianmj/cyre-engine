import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';

import type { ReactNode } from 'react';

import { indexCommands } from '../shell/commandModel';
import type { CommandContext, CommandRegistry } from '../shell/commandModel';
import { createCommandDescriptors } from '../shell/commandRegistry';
import { getWindowDefinition } from '../shell/windowCatalog';
import type { WindowKind } from '../shell/windowCatalog';

import type { RendererBackend } from './StudioApplication';
import type {
  DockArea,
  DockLayout,
  NetworkGraphNode,
  ProjectNodeType,
  SelectionItem,
} from '@cyre/engine';

import {
  StudioApplication,
} from './StudioApplication';

import type {
  DockLayoutSummary,
  StudioSnapshot,
} from './StudioApplication';

/** Shared viewport presentation options controlled from the Studio shell. */
export interface ViewportSettings {
  showGrid: boolean;
  showWireframe: boolean;
  showLabels: boolean;
  showCompromised: boolean;
  showIsolated: boolean;
  showAlerts: boolean;
  showEvidence: boolean;
  lightIntensity: number;
}

export const DEFAULT_VIEWPORT_SETTINGS: ViewportSettings = {
  showGrid: true,
  // Off by default: hosts read better as filled discs. Wireframe is opt-in and
  // must match the engine's own default, or the first frame renders every host
  // as a hollow ring.
  showWireframe: false,
  showLabels: true,
  showCompromised: true,
  showIsolated: true,
  showAlerts: true,
  showEvidence: true,
  lightIntensity: 2.4,
};

const VIEWPORT_SETTINGS_KEY = 'cyre.studio.viewportSettings.v2';

function readViewportSettings(): ViewportSettings {
  try {
    const raw = window.localStorage.getItem(VIEWPORT_SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_VIEWPORT_SETTINGS };
    return { ...DEFAULT_VIEWPORT_SETTINGS, ...(JSON.parse(raw) as Partial<ViewportSettings>) };
  } catch {
    return { ...DEFAULT_VIEWPORT_SETTINGS };
  }
}

export interface ConfirmRequest {
  id: number;
  title: string;
  message: string;
  resolve: (confirmed: boolean) => void;
}

export type StudioNotificationLevel =
  | 'info'
  | 'warning'
  | 'error'
  | 'success';

export interface StudioContextValue {
  application: StudioApplication;
  state: StudioSnapshot;

  /** Command registry shared by the menu bar, palette and shortcuts. */
  commands: CommandRegistry;
  /** Runs a command id; used by menus, shortcuts and window content. */
  runCommand: (commandId: string) => void;
  /** Presents (or focuses) a window. */
  openWindow: (kind: WindowKind) => void;

  /** Which renderer draws the viewport. */
  rendererBackend: RendererBackend;
  /** Switches between the engine GPU and Three.js WebGL renderers. */
  setRendererBackend: (backend: RendererBackend) => void;
  /** Creates a project from the launcher. */
  createProject: (name: string) => void;

  /** Shared viewport presentation settings. */
  viewportSettings: ViewportSettings;
  setViewportSettings: (settings: ViewportSettings) => void;

  /** Pending destructive-action confirmation, if any. */
  confirmRequest: ConfirmRequest | null;
  resolveConfirm: (confirmed: boolean) => void;

  togglePanel: (panelId: string) => void;
  setPanelVisible: (panelId: string, visible: boolean) => void;
  setWorkspace: (workspaceId: string) => void;

  dockPanel: (panelId: string, area: DockArea) => void;
  undockPanel: (panelId: string) => void;
  movePanel: (panelId: string, area: DockArea) => void;
  resizePanel: (panelId: string, size: number) => void;
  setActivePanel: (panelId: string) => void;
  maximizePanel: (panelId: string) => void;
  restorePanel: () => void;
  tabPanels: (panelIds: string[]) => void;
  untabPanels: (panelIds: string[]) => void;
  getDockLayout: () => DockLayout;
  restoreDockLayout: (layout: DockLayout) => void;
  saveDockLayout: (name: string) => void;
  listDockLayouts: () => DockLayoutSummary[];
  loadDockLayout: (name: string) => void;
  deleteDockLayout: (name: string) => void;

  addProjectNode: (
    parentId: string | undefined,
    type: ProjectNodeType,
    name: string,
  ) => void;
  renameProjectNode: (nodeId: string, name: string) => void;
  deleteProjectNode: (nodeId: string) => void;
  duplicateProjectNode: (nodeId: string) => void;
  moveProjectNode: (nodeId: string, newParentId?: string) => void;

  selectProjectNode: (nodeId: string) => void;
  selectNetworkNode: (nodeId: string) => void;
  /** Selects a live cyber-simulation host; the viewport's own selection path. */
  selectCyberHost: (hostId: string) => void;
  toggleSelection: (item: SelectionItem) => void;
  clearMultiSelection: () => void;
  setInspectorPropertyValue: (key: string, value: unknown) => void;
  resetInspectorProperty: (key: string) => void;
  resetInspectorProperties: () => void;
  clearInspectorSelection: () => void;

  addNetworkNodeFromPalette: (
    itemId: string,
    x?: number,
    y?: number,
  ) => void;
  moveNetworkNode: (nodeId: string, x: number, y: number) => void;
  connectNetworkNodes: (
    sourceId: string,
    targetId: string,
    edgeType?: string,
  ) => void;
  removeNetworkNode: (nodeId: string) => void;
  removeNetworkEdge: (edgeId: string) => void;
  searchNetworkNodes: (query: string) => NetworkGraphNode[];
  validateNetworkGraph: () => void;

  notify: (
    level: StudioNotificationLevel,
    message: string,
  ) => void;
  clearNotifications: () => void;

  play: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  restart: () => void;
  setSimulationSpeed: (speed: number) => void;
  executeCommand: (commandId: string) => void;

  acknowledgeMissionAlert: () => void;
  formMissionHypothesis: (description?: string) => void;
  identifyMissionAttackPath: (source?: string, target?: string) => void;
  containMissionIncident: () => void;
  recoverMissionIncident: () => void;
  completeMissionPlaythrough: () => void;

  addAttackGraphNode: (label: string, status?: string, stage?: string) => void;
  connectAttackGraphNodes: (sourceId: string, targetId: string) => void;
  removeAttackGraphNode: (nodeId: string) => void;

  addEvidenceGraphNode: (label: string, type?: string) => void;
  connectEvidenceGraphNodes: (
    sourceId: string,
    targetId: string,
    relationType?: string,
  ) => void;
  removeEvidenceGraphNode: (nodeId: string) => void;

  addTimelineEntry: (timestamp: number, label: string, type?: string) => void;
  removeTimelineEntry: (entryId: string) => void;

  createScenario: (name: string, description?: string) => void;
  addScenarioNetworkNode: (nodeType: string, nodeName?: string) => void;
  addScenarioAsset: (name: string, type: string, value: number) => void;
  addScenarioObjective: (description: string) => void;
  buildScenario: () => void;
  generateScenario: (options: any) => void;

  listCyberScenarios: () => Array<{ id: string; name: string; description: string; nodeCount: number }>;
  selectCyberScenario: (scenarioId: string) => void;
  exportSelectedCyberScenario: () => string;
  importCyberScenario: (json: string) => void;

  createMissionDesign: (name: string) => void;
  addMissionObjective: (description: string, type?: string) => void;
  buildMissionDesign: () => void;

  addObjectiveGraphNode: (label: string, status?: string) => void;
  connectObjectiveGraphNodes: (
    sourceId: string,
    targetId: string,
    edgeType?: string,
  ) => void;

  addEventTriggerRule: (
    name: string,
    eventType: string,
    actionType: string,
  ) => void;

  captureLiveSimulation: () => void;
  recordLiveEvent: (
    type: string,
    source?: string,
    data?: Record<string, unknown>,
  ) => void;
  clearLiveEvents: () => void;

  startDebugger: () => void;
  pauseDebugger: () => void;
  resumeDebugger: () => void;
  stopDebugger: () => void;
  refreshDebuggerSnapshot: () => void;

  recordReplayEvent: (type: string, data?: unknown) => void;
  stepReplay: () => void;
  playReplay: () => void;
  stopReplay: () => void;
  jumpReplay: (index: number) => void;
  addReplayBookmark: (label: string) => void;
  gotoReplayBookmark: (bookmarkId: string) => void;

  activateTheme: (themeId: string) => void;
  setReduceMotion: (enabled: boolean) => void;
  setMotionDuration: (durationMs: number) => void;
  setFontSizeScale: (scale: number) => void;
  setHighContrast: (enabled: boolean) => void;
  runUxAudit: () => void;
  runVisualDesignAudit: () => void;

  refreshGameUI: () => void;
  setGameUIEvidence: (items: unknown[]) => void;
  addGameUIEvidence: (item: unknown) => void;
  setGameUIAlerts: (items: unknown[]) => void;
  addGameUIAlert: (item: unknown) => void;
  setGameUITimeline: (events: unknown[]) => void;
  addGameUITimelineEvent: (event: unknown) => void;
  setGameUIMission: (mission: unknown) => void;
  setGameUIActivePanel: (panel: string) => void;

  listRenderingBackends: () => Array<{
    id: string;
    name: string;
    capabilities: Record<string, unknown>;
  }>;
  setActiveRenderingBackend: (backendId: string) => void;
  renderScene: (width: number, height: number, mode: string) => void;
  setRenderMode: (mode: string) => void;

  registerAsset: (name: string, type: string, path?: string) => void;
  importAssetFromContent: (
    name: string,
    type: string,
    content: string,
  ) => void;
  generateAssetPreviews: () => void;

  createSampleCyreScript: () => void;
  registerCyreScriptFromDefinition: (
    definition: Record<string, unknown>,
  ) => void;
  registerSamplePlugin: (name?: string) => void;

  registerBuildProfile: (
    id: string,
    name: string,
    target: string,
    flavor: string,
  ) => void;
  buildProfile: (profileId: string) => void;
  setReleaseChannel: (channel: string) => void;
  runCiCdPipeline: () => void;
  packageWebGame: (name: string) => void;
  packageDesktopGame: (name: string) => void;
  packageMobileGame: (name: string) => void;
  saveProject: () => void;
  loadSavedProject: () => boolean;
  hasSavedProject: () => boolean;
}

/**
 * The single Studio application instance for this browser session.
 * Exported so the test suite can reset desktop state between cases.
 */
export const studioApplication = new StudioApplication();

const subscribe = (onStoreChange: () => void): (() => void) =>
  studioApplication.subscribe(onStoreChange);

const getSnapshot = (): StudioSnapshot =>
  studioApplication.getState();

const StudioContext =
  createContext<StudioContextValue | null>(null);

/** Writes a text document to the user's downloads folder. */
function downloadText(filename: string, mime: string, content: string): void {
  try {
    const blob = new Blob([content], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    // Give the browser a frame to start the download before revoking.
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch {
    // Downloads can be blocked (sandboxed iframe, private mode); the caller
    // still gets the generated document through the notification trail.
  }
}

/** Opens a native file picker and resolves with the chosen document text. */
function pickTextFile(accept: string): Promise<string> {
  return new Promise((resolve) => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept;
      input.style.display = 'none';
      document.body.appendChild(input);

      const cleanup = (): void => {
        input.remove();
      };

      input.addEventListener('change', () => {
        const file = input.files?.[0];
        cleanup();
        if (!file) {
          resolve('');
          return;
        }

        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
        reader.onerror = () => resolve('');
        reader.readAsText(file);
      });

      // Cancelling the dialog never fires `change`; treat blur as a cancel.
      window.setTimeout(() => {
        window.addEventListener(
          'focus',
          () => {
            window.setTimeout(() => {
              if (document.body.contains(input) && !input.files?.length) {
                cleanup();
                resolve('');
              }
            }, 600);
          },
          { once: true },
        );
      }, 400);

      input.click();
    } catch {
      resolve('');
    }
  });
}

export function StudioProvider({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  const snapshot = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getSnapshot,
  );

  const [viewportSettings, setViewportSettingsState] = useState<ViewportSettings>(readViewportSettings);
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(null);
  const confirmSequence = useRef(0);

  const commands = useMemo<CommandRegistry>(() => indexCommands(createCommandDescriptors()), []);

  useEffect(() => {
    try {
      window.localStorage.setItem(VIEWPORT_SETTINGS_KEY, JSON.stringify(viewportSettings));
    } catch {
      // Private mode: viewport settings simply are not persisted.
    }
  }, [viewportSettings]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.dataset.appearance = snapshot.appearance;
    document.documentElement.dataset.motionReduced = String(snapshot.motionReduced);
  }, [snapshot.appearance, snapshot.motionReduced]);

  useEffect(() => {
    const container = document.getElementById('root');
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) {
        studioApplication.windows.setBounds({ width, height });
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const openWindow = useCallback((kind: WindowKind) => {
    const definition = getWindowDefinition(kind);
    studioApplication.windows.open(kind, {
      title: definition.title,
      rect: { width: definition.width, height: definition.height },
    });
  }, []);

  const commandContext = useMemo<CommandContext>(
    () => ({
      application: studioApplication,
      notify: (level, message) => studioApplication.notify(level, message),
      download: downloadText,
      pickTextFile,
      confirm: (title, message) =>
        new Promise<boolean>((resolve) => {
          confirmSequence.current += 1;
          setConfirmRequest({ id: confirmSequence.current, title, message, resolve });
        }),
      togglePalette: () => {
        window.dispatchEvent(new CustomEvent('cyre:toggle-palette'));
      },
      openWindow,
    }),
    [openWindow],
  );

  const runCommand = useCallback(
    (commandId: string) => {
      const command = commands.get(commandId);
      if (!command) {
        studioApplication.notify('warning', `Unknown command "${commandId}".`);
        return;
      }

      try {
        const result = command.run(commandContext);
        if (result instanceof Promise) {
          result.catch((error: unknown) => {
            studioApplication.notify(
              'error',
              error instanceof Error ? error.message : String(error),
            );
          });
        }
      } catch (error) {
        studioApplication.notify('error', error instanceof Error ? error.message : String(error));
      }
    },
    [commandContext, commands],
  );

  const setViewportSettings = useCallback((settings: ViewportSettings) => {
    setViewportSettingsState(settings);
  }, []);

  const resolveConfirm = useCallback((confirmed: boolean) => {
    setConfirmRequest((current) => {
      current?.resolve(confirmed);
      return null;
    });
  }, []);

  const value = useMemo<StudioContextValue>(
    () => ({
      application: studioApplication,
      state: snapshot,

      commands,
      runCommand,
      openWindow,
      viewportSettings,
      setViewportSettings,
      confirmRequest,
      resolveConfirm,

      togglePanel: (panelId) => studioApplication.togglePanel(panelId),
      setPanelVisible: (panelId, visible) => studioApplication.setPanelVisible(panelId, visible),
      setWorkspace: (workspaceId) => studioApplication.setWorkspace(workspaceId),

      dockPanel: (panelId, area) => studioApplication.dockPanel(panelId, area),
      undockPanel: (panelId) => studioApplication.undockPanel(panelId),
      movePanel: (panelId, area) => studioApplication.movePanel(panelId, area),
      resizePanel: (panelId, size) => studioApplication.resizePanel(panelId, size),
      setActivePanel: (panelId) => studioApplication.setActivePanel(panelId),
      maximizePanel: (panelId) => studioApplication.maximizePanel(panelId),
      restorePanel: () => studioApplication.restorePanel(),
      tabPanels: (panelIds) => studioApplication.tabPanels(panelIds),
      untabPanels: (panelIds) => studioApplication.untabPanels(panelIds),
      getDockLayout: () => studioApplication.getDockLayout(),
      restoreDockLayout: (layout) => studioApplication.restoreDockLayout(layout),
      saveDockLayout: (name) => studioApplication.saveDockLayout(name),
      listDockLayouts: () => studioApplication.listDockLayouts(),
      loadDockLayout: (name) => studioApplication.loadDockLayout(name),
      deleteDockLayout: (name) => studioApplication.deleteDockLayout(name),

      addProjectNode: (parentId, type, name) => studioApplication.addProjectNode(parentId, type, name),
      renameProjectNode: (nodeId, name) => studioApplication.renameProjectNode(nodeId, name),
      deleteProjectNode: (nodeId) => studioApplication.deleteProjectNode(nodeId),
      duplicateProjectNode: (nodeId) => studioApplication.duplicateProjectNode(nodeId),
      moveProjectNode: (nodeId, newParentId) => studioApplication.moveProjectNode(nodeId, newParentId),

      selectProjectNode: (nodeId) => studioApplication.selectProjectNode(nodeId),
      selectNetworkNode: (nodeId) => studioApplication.selectNetworkNode(nodeId),
      selectCyberHost: (hostId) => studioApplication.selectCyberHost(hostId),
      rendererBackend: snapshot.rendererBackend,
      setRendererBackend: (backend) => studioApplication.setRendererBackend(backend),
      createProject: (name) => studioApplication.createProject(name),
      toggleSelection: (item) => studioApplication.toggleSelection(item),
      clearMultiSelection: () => studioApplication.clearMultiSelection(),
      setInspectorPropertyValue: (key, value) => studioApplication.setInspectorPropertyValue(key, value),
      resetInspectorProperty: (key) => studioApplication.resetInspectorProperty(key),
      resetInspectorProperties: () => studioApplication.resetInspectorProperties(),
      clearInspectorSelection: () => studioApplication.clearInspectorSelection(),

      addNetworkNodeFromPalette: (itemId, x, y) => studioApplication.addNetworkNodeFromPalette(itemId, x, y),
      moveNetworkNode: (nodeId, x, y) => studioApplication.moveNetworkNode(nodeId, x, y),
      connectNetworkNodes: (sourceId, targetId, edgeType) => studioApplication.connectNetworkNodes(sourceId, targetId, edgeType),
      removeNetworkNode: (nodeId) => studioApplication.removeNetworkNode(nodeId),
      removeNetworkEdge: (edgeId) => studioApplication.removeNetworkEdge(edgeId),
      searchNetworkNodes: (query) => studioApplication.searchNetworkNodes(query),
      validateNetworkGraph: () => studioApplication.validateNetworkGraph(),

      notify: (level, message) => studioApplication.notify(level, message),
      clearNotifications: () => studioApplication.clearNotifications(),

      play: () => studioApplication.play(),
      pause: () => studioApplication.pause(),
      resume: () => studioApplication.resume(),
      stop: () => studioApplication.stop(),
      restart: () => studioApplication.restart(),
      setSimulationSpeed: (speed) => studioApplication.setSimulationSpeed(speed),
      executeCommand: (commandId) => studioApplication.executeCommand(commandId),

      acknowledgeMissionAlert: () => studioApplication.acknowledgeMissionAlert(),
      formMissionHypothesis: (description) => studioApplication.formMissionHypothesis(description),
      identifyMissionAttackPath: (source, target) => studioApplication.identifyMissionAttackPath(source, target),
      containMissionIncident: () => studioApplication.containMissionIncident(),
      recoverMissionIncident: () => studioApplication.recoverMissionIncident(),
      completeMissionPlaythrough: () => studioApplication.completeMissionPlaythrough(),

      addAttackGraphNode: (label, status, stage) => studioApplication.addAttackGraphNode(label, status, stage),
      connectAttackGraphNodes: (sourceId, targetId) => studioApplication.connectAttackGraphNodes(sourceId, targetId),
      removeAttackGraphNode: (nodeId) => studioApplication.removeAttackGraphNode(nodeId),

      addEvidenceGraphNode: (label, type) => studioApplication.addEvidenceGraphNode(label, type),
      connectEvidenceGraphNodes: (sourceId, targetId, relationType) => studioApplication.connectEvidenceGraphNodes(sourceId, targetId, relationType),
      removeEvidenceGraphNode: (nodeId) => studioApplication.removeEvidenceGraphNode(nodeId),

      addTimelineEntry: (timestamp, label, type) => studioApplication.addTimelineEntry(timestamp, label, type),
      removeTimelineEntry: (entryId) => studioApplication.removeTimelineEntry(entryId),

      createScenario: (name, description) => studioApplication.createScenario(name, description),
      addScenarioNetworkNode: (nodeType, nodeName) => studioApplication.addScenarioNetworkNode(nodeType, nodeName),
      addScenarioAsset: (name, type, value) => studioApplication.addScenarioAsset(name, type, value),
      addScenarioObjective: (description) => studioApplication.addScenarioObjective(description),
      buildScenario: () => studioApplication.buildScenario(),
      generateScenario: (options) => studioApplication.generateScenario(options),

      listCyberScenarios: () => studioApplication.listCyberScenarios(),
      selectCyberScenario: (scenarioId) => studioApplication.selectCyberScenario(scenarioId),
      exportSelectedCyberScenario: () => studioApplication.exportSelectedCyberScenario(),
      importCyberScenario: (json) => studioApplication.importCyberScenario(json),
      createMissionDesign: (name) => studioApplication.createMissionDesign(name),
      addMissionObjective: (description, type) => studioApplication.addMissionObjective(description, type),
      buildMissionDesign: () => studioApplication.buildMissionDesign(),

      addObjectiveGraphNode: (label, status) => studioApplication.addObjectiveGraphNode(label, status),
      connectObjectiveGraphNodes: (sourceId, targetId, edgeType) => studioApplication.connectObjectiveGraphNodes(sourceId, targetId, edgeType),

      addEventTriggerRule: (name, eventType, actionType) => studioApplication.addEventTriggerRule(name, eventType, actionType),

      captureLiveSimulation: () => studioApplication.captureLiveSimulation(),
      recordLiveEvent: (type, source, data) => studioApplication.recordLiveEvent(type as any, source, data),
      clearLiveEvents: () => studioApplication.clearLiveEvents(),

      startDebugger: () => studioApplication.startDebugger(),
      pauseDebugger: () => studioApplication.pauseDebugger(),
      resumeDebugger: () => studioApplication.resumeDebugger(),
      stopDebugger: () => studioApplication.stopDebugger(),
      refreshDebuggerSnapshot: () => studioApplication.refreshDebuggerSnapshot(),

      recordReplayEvent: (type, data) => studioApplication.recordReplayEvent(type, data),
      stepReplay: () => studioApplication.stepReplay(),
      playReplay: () => studioApplication.playReplay(),
      stopReplay: () => studioApplication.stopReplay(),
      jumpReplay: (index) => studioApplication.jumpReplay(index),
      addReplayBookmark: (label) => studioApplication.addReplayBookmark(label),
      gotoReplayBookmark: (bookmarkId) => studioApplication.gotoReplayBookmark(bookmarkId),

      activateTheme: (themeId) => studioApplication.activateTheme(themeId),
      setReduceMotion: (enabled) => studioApplication.setReduceMotion(enabled),
      setMotionDuration: (durationMs) => studioApplication.setMotionDuration(durationMs),
      setFontSizeScale: (scale) => studioApplication.setFontSizeScale(scale),
      setHighContrast: (enabled) => studioApplication.setHighContrast(enabled),
      runUxAudit: () => studioApplication.runUxAudit(),
      runVisualDesignAudit: () => studioApplication.runVisualDesignAudit(),

      refreshGameUI: () => studioApplication.refreshGameUI(),
      setGameUIEvidence: (items) => studioApplication.setGameUIEvidence(items),
      addGameUIEvidence: (item) => studioApplication.addGameUIEvidence(item),
      setGameUIAlerts: (items) => studioApplication.setGameUIAlerts(items),
      addGameUIAlert: (item) => studioApplication.addGameUIAlert(item),
      setGameUITimeline: (events) => studioApplication.setGameUITimeline(events),
      addGameUITimelineEvent: (event) => studioApplication.addGameUITimelineEvent(event),
      setGameUIMission: (mission) => studioApplication.setGameUIMission(mission),
      setGameUIActivePanel: (panel) => studioApplication.setGameUIActivePanel(panel),

      listRenderingBackends: () => studioApplication.listRenderingBackends(),
      setActiveRenderingBackend: (backendId) => studioApplication.setActiveRenderingBackend(backendId),
      renderScene: (width, height, mode) => studioApplication.renderScene(width, height, mode),

      setRenderMode: (mode) => studioApplication.setRenderMode(mode),

      registerAsset: (name, type, path) => studioApplication.registerAsset(name, type, path),
      importAssetFromContent: (name, type, content) => studioApplication.importAssetFromContent(name, type, content),
      generateAssetPreviews: () => studioApplication.generateAssetPreviews(),

      createSampleCyreScript: () => studioApplication.createSampleCyreScript(),
      registerCyreScriptFromDefinition: (definition) => studioApplication.registerCyreScriptFromDefinition(definition),
      registerSamplePlugin: (name) => studioApplication.registerSamplePlugin(name),

      registerBuildProfile: (id, name, target, flavor) =>
        studioApplication.registerBuildProfile(id, name, target, flavor),

      buildProfile: (profileId) =>
        studioApplication.buildProfile(profileId),

      setReleaseChannel: (channel) =>
        studioApplication.setReleaseChannel(channel),

      runCiCdPipeline: () =>
        studioApplication.runCiCdPipeline(),

      packageWebGame: (name) =>
        studioApplication.packageWebGame(name),

      packageDesktopGame: (name) =>
        studioApplication.packageDesktopGame(name),

      packageMobileGame: (name) =>
        studioApplication.packageMobileGame(name),

      saveProject: () => studioApplication.saveProject(),
      loadSavedProject: () => studioApplication.loadSavedProject(),
      hasSavedProject: () => studioApplication.hasSavedProject(),
    }),
    [
      commands,
      confirmRequest,
      openWindow,
      resolveConfirm,
      runCommand,
      setViewportSettings,
      snapshot,
      viewportSettings,
    ],
  );

  return (
    <StudioContext.Provider value={value}>
      {children}
    </StudioContext.Provider>
  );
}

export function useStudio(): StudioContextValue {
  const context = useContext(StudioContext);

  if (!context) {
    throw new Error(
      'useStudio must be used inside StudioProvider.',
    );
  }

  return context;
}
