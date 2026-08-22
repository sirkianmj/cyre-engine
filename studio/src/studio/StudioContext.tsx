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

import type {
  DockLayoutSummary,
} from './StudioApplication';

import {
  StudioApplication,
} from './StudioApplication';

import type {
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

  addProjectNode: (
    parentId: string | undefined,
    type: ProjectNodeType,
    name: string,
  ) => void;
  renameProjectNode: (nodeId: string, name: string) => void;
  deleteProjectNode: (nodeId: string) => void;
  duplicateProjectNode: (nodeId: string) => void;
  moveProjectNode: (
    nodeId: string,
    newParentId?: string,
  ) => void;
  saveDockLayout: (name: string) => void;
  listDockLayouts: () => DockLayoutSummary[];
  loadDockLayout: (name: string) => void;
  deleteDockLayout: (name: string) => void;

  selectProjectNode: (nodeId: string) => void;
  selectNetworkNode: (nodeId: string) => void;
  toggleSelection: (item: SelectionItem) => void;
  clearMultiSelection: () => void;
  setInspectorPropertyValue: (key: string, value: unknown) => void;
  resetInspectorProperty: (key: string) => void;
  resetInspectorProperties: () => void;
  addNetworkNodeFromPalette: (
    itemId: string,
    x?: number,
    y?: number,
  ) => void;

  moveNetworkNode: (
    nodeId: string,
    x: number,
    y: number,
  ) => void;
  connectNetworkNodes: (
    sourceId: string,
    targetId: string,
    edgeType?: string,
  ) => void;
  removeNetworkNode: (nodeId: string) => void;
  removeNetworkEdge: (edgeId: string) => void;
  searchNetworkNodes: (
    query: string,
  ) => NetworkGraphNode[];
  validateNetworkGraph: () => void;

  addAttackGraphNode: (label: string, status?: string, stage?: string) => void;
  connectAttackGraphNodes: (sourceId: string, targetId: string) => void;
  removeAttackGraphNode: (nodeId: string) => void;
  addEvidenceGraphNode: (label: string, type?: string) => void;
  connectEvidenceGraphNodes: (sourceId: string, targetId: string, relationType?: string) => void;
  removeEvidenceGraphNode: (nodeId: string) => void;
  addTimelineEntry: (timestamp: number, label: string, type?: string) => void;
  removeTimelineEntry: (entryId: string) => void;

  notify: (
    level: StudioNotificationLevel,
    message: string,
  ) => void;

  clearNotifications: () => void;
  clearInspectorSelection: () => void;

  play: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  restart: () => void;
  setSimulationSpeed: (speed: number) => void;
  executeCommand: (commandId: string) => void;
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

      togglePanel: (panelId) =>
        studioApplication.togglePanel(panelId),

      setPanelVisible: (panelId, visible) =>
        studioApplication.setPanelVisible(panelId, visible),

      setWorkspace: (workspaceId) =>
        studioApplication.setWorkspace(workspaceId),

      dockPanel: (panelId, area) =>
        studioApplication.dockPanel(panelId, area),

      undockPanel: (panelId) =>
        studioApplication.undockPanel(panelId),

      movePanel: (panelId, area) =>
        studioApplication.movePanel(panelId, area),

      resizePanel: (panelId, size) =>
        studioApplication.resizePanel(panelId, size),

      setActivePanel: (panelId) =>
        studioApplication.setActivePanel(panelId),

      maximizePanel: (panelId) =>
        studioApplication.maximizePanel(panelId),

      restorePanel: () =>
        studioApplication.restorePanel(),

      tabPanels: (panelIds) =>
        studioApplication.tabPanels(panelIds),

      untabPanels: (panelIds) =>
        studioApplication.untabPanels(panelIds),

      getDockLayout: () =>
        studioApplication.getDockLayout(),

      restoreDockLayout: (layout) =>
        studioApplication.restoreDockLayout(layout),

      addProjectNode: (parentId, type, name) =>
        studioApplication.addProjectNode(parentId, type, name),

      renameProjectNode: (nodeId, name) =>
        studioApplication.renameProjectNode(nodeId, name),

      deleteProjectNode: (nodeId) =>
        studioApplication.deleteProjectNode(nodeId),

      duplicateProjectNode: (nodeId) =>
        studioApplication.duplicateProjectNode(nodeId),

      moveProjectNode: (nodeId, newParentId) =>
        studioApplication.moveProjectNode(nodeId, newParentId),

      saveDockLayout: (name) =>
        studioApplication.saveDockLayout(name),

      listDockLayouts: () =>
        studioApplication.listDockLayouts(),

      loadDockLayout: (name) =>
        studioApplication.loadDockLayout(name),

      deleteDockLayout: (name) =>
        studioApplication.deleteDockLayout(name),

      selectProjectNode: (nodeId) =>
        studioApplication.selectProjectNode(nodeId),

      selectNetworkNode: (nodeId) =>
        studioApplication.selectNetworkNode(nodeId),

      toggleSelection: (item) =>
        studioApplication.toggleSelection(item),

      clearMultiSelection: () =>
        studioApplication.clearMultiSelection(),

      setInspectorPropertyValue: (key, value) =>
        studioApplication.setInspectorPropertyValue(key, value),

      resetInspectorProperty: (key) =>
        studioApplication.resetInspectorProperty(key),

      resetInspectorProperties: () =>
        studioApplication.resetInspectorProperties(),

      addNetworkNodeFromPalette: (itemId, x, y) =>
        studioApplication.addNetworkNodeFromPalette(itemId, x, y),

      moveNetworkNode: (nodeId, x, y) =>
        studioApplication.moveNetworkNode(nodeId, x, y),

      connectNetworkNodes: (sourceId, targetId, edgeType) =>
        studioApplication.connectNetworkNodes(sourceId, targetId, edgeType),

      removeNetworkNode: (nodeId) =>
        studioApplication.removeNetworkNode(nodeId),

      removeNetworkEdge: (edgeId) =>
        studioApplication.removeNetworkEdge(edgeId),

      searchNetworkNodes: (query) =>
        studioApplication.searchNetworkNodes(query),

      validateNetworkGraph: () =>
        studioApplication.validateNetworkGraph(),

      addAttackGraphNode: (label, status, stage) =>
        studioApplication.addAttackGraphNode(label, status, stage),

      connectAttackGraphNodes: (sourceId, targetId) =>
        studioApplication.connectAttackGraphNodes(sourceId, targetId),

      removeAttackGraphNode: (nodeId) =>
        studioApplication.removeAttackGraphNode(nodeId),

      addEvidenceGraphNode: (label, type) =>
        studioApplication.addEvidenceGraphNode(label, type),

      connectEvidenceGraphNodes: (sourceId, targetId, relationType) =>
        studioApplication.connectEvidenceGraphNodes(sourceId, targetId, relationType),

      removeEvidenceGraphNode: (nodeId) =>
        studioApplication.removeEvidenceGraphNode(nodeId),

      addTimelineEntry: (timestamp, label, type) =>
        studioApplication.addTimelineEntry(timestamp, label, type),

      removeTimelineEntry: (entryId) =>
        studioApplication.removeTimelineEntry(entryId),

      notify: (level, message) =>
        studioApplication.notify(level, message),

      clearNotifications: () =>
        studioApplication.clearNotifications(),

      clearInspectorSelection: () =>
        studioApplication.clearInspectorSelection(),

      play: () => studioApplication.play(),
      pause: () => studioApplication.pause(),
      resume: () => studioApplication.resume(),
      stop: () => studioApplication.stop(),
      restart: () => studioApplication.restart(),

      setSimulationSpeed: (speed) =>
        studioApplication.setSimulationSpeed(speed),

      executeCommand: (commandId) =>
        studioApplication.executeCommand(commandId),
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
