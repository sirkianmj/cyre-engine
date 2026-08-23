import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
} from 'react';

import type { ReactNode } from 'react';

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

export type StudioNotificationLevel =
  | 'info'
  | 'warning'
  | 'error'
  | 'success';

export interface StudioContextValue {
  application: StudioApplication;
  state: StudioSnapshot;

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
}

const studioApplication = new StudioApplication();

const subscribe = (onStoreChange: () => void): (() => void) =>
  studioApplication.subscribe(onStoreChange);

const getSnapshot = (): StudioSnapshot =>
  studioApplication.getState();

const StudioContext =
  createContext<StudioContextValue | null>(null);

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

  const value = useMemo<StudioContextValue>(
    () => ({
      application: studioApplication,
      state: snapshot,

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
    }),
    [snapshot],
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
