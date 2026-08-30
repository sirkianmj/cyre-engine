/**
 * Window content registry
 * ------------------------
 * Maps every window kind in the catalog onto the component that renders its
 * body. The registry is exhaustive by type: adding a `WindowKind` without a
 * component is a compile error.
 */

import type { WindowKind } from '../shell/windowCatalog';

import {
  AssetImportWindow,
  AssetsWindow,
  AttackGraphWindow,
  BuildWindow,
  ContentBrowserWindow,
  DebuggerWindow,
  EntityPaletteWindow,
  EventTriggerWindow,
  EvidenceGraphWindow,
  GameUiWindow,
  HierarchyWindow,
  InspectorWindow,
  LiveEventsWindow,
  LiveInspectorWindow,
  MissionDesignerWindow,
  NetworkGraphWindow,
  ObjectiveGraphWindow,
  PresentationWindow,
  ProjectExplorerWindow,
  RendererWindow,
  ScenarioDesignerWindow,
  ScenarioGeneratorWindow,
  ScriptsWindow,
  TimelineWindow,
} from './PanelWindows';
import { AttackWindow, DetectionWindow, HostsWindow, SimulationWindow } from './SimulationWindows';
import { ScenarioEditorWindow, ScenarioLibraryWindow } from './ScenarioWindows';
import { PerformanceWindow, ReplayWindow, ResearchWindow, TelemetryWindow } from './ResearchWindows';
import {
  AboutWindow,
  OutputWindow,
  ProjectWindow,
  SecurityWindow,
  ShortcutsWindow,
  VisualizationWindow,
} from './StudioWindows';

export type WindowContent = () => JSX.Element;

export const WINDOW_CONTENT: Readonly<Record<WindowKind, WindowContent>> = {
  'scenario-library': ScenarioLibraryWindow,
  'scenario-editor': ScenarioEditorWindow,
  'scenario-designer': ScenarioDesignerWindow,
  'scenario-generator': ScenarioGeneratorWindow,
  simulation: SimulationWindow,
  attack: AttackWindow,
  detection: DetectionWindow,
  hosts: HostsWindow,
  telemetry: TelemetryWindow,
  replay: ReplayWindow,
  research: ResearchWindow,
  performance: PerformanceWindow,
  security: SecurityWindow,
  project: ProjectWindow,
  visualization: VisualizationWindow,
  output: OutputWindow,
  shortcuts: ShortcutsWindow,
  about: AboutWindow,
  'project-explorer': ProjectExplorerWindow,
  hierarchy: HierarchyWindow,
  'entity-palette': EntityPaletteWindow,
  inspector: InspectorWindow,
  'content-browser': ContentBrowserWindow,
  'attack-graph': AttackGraphWindow,
  'evidence-graph': EvidenceGraphWindow,
  timeline: TimelineWindow,
  'network-graph': NetworkGraphWindow,
  'mission-designer': MissionDesignerWindow,
  'objective-graph': ObjectiveGraphWindow,
  'event-triggers': EventTriggerWindow,
  'live-inspector': LiveInspectorWindow,
  'live-events': LiveEventsWindow,
  debugger: DebuggerWindow,
  'game-ui': GameUiWindow,
  renderer: RendererWindow,
  assets: AssetsWindow,
  'asset-import': AssetImportWindow,
  scripts: ScriptsWindow,
  build: BuildWindow,
  presentation: PresentationWindow,
};

/** Renders the body component registered for a window kind. */
export function renderWindowContent(kind: WindowKind): JSX.Element {
  const Content = WINDOW_CONTENT[kind];
  return <Content />;
}
