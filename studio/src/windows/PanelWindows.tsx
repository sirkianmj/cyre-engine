/**
 * PanelWindows
 * -------------
 * The authoring and production panels that already existed in the engine
 * integration layer, presented as Studio windows. They keep their existing
 * engine wiring; the wrapper only supplies the window body container.
 */

import { AssetFilePanel } from '../components/AssetFilePanel';
import { AssetPipelinePanel } from '../components/AssetPipelinePanel';
import {
  EventTriggerPanel,
  MissionDesignerPanel,
  ObjectiveGraphPanel,
  ScenarioDesignerPanel,
  ScenarioGeneratorPanel,
} from '../components/AuthoringPanels';
import { BuildDeployPanel } from '../components/BuildDeployPanel';
import { AttackGraphPanel, EvidenceGraphPanel, TimelinePanel } from '../components/CyberGraphPanels';
import { DebuggerPanel } from '../components/DebugReplayPanels';
import { GameUIPanel } from '../components/GameUIPanel';
import { LiveEventsPanel, LiveInspectorPanel } from '../components/LivePanels';
import { PresentationPanel } from '../components/PresentationPanel';
import { RenderingPanel } from '../components/RenderingPanel';
import { ScriptingPluginPanel } from '../components/ScriptingPluginPanel';
import { Viewport } from '../components/Viewport';
import {
  ContentBrowserPanel,
  EntityPalettePanel,
  HierarchyPanel,
  InspectorPanel,
  ProjectExplorerPanel,
} from '../components/WorkspacePanels';
import { useStudio } from '../studio/StudioContext';

import type { ReactNode } from 'react';

/** Panels authored before the window system; styled by the compat layer. */
function LegacyPanel({ children }: { children: ReactNode }): JSX.Element {
  return <div className="cyre-legacy">{children}</div>;
}

export function ProjectExplorerWindow(): JSX.Element {
  return (
    <LegacyPanel>
      <ProjectExplorerPanel />
    </LegacyPanel>
  );
}

export function HierarchyWindow(): JSX.Element {
  return (
    <LegacyPanel>
      <HierarchyPanel />
    </LegacyPanel>
  );
}

export function EntityPaletteWindow(): JSX.Element {
  return (
    <LegacyPanel>
      <EntityPalettePanel />
    </LegacyPanel>
  );
}

export function InspectorWindow(): JSX.Element {
  return (
    <LegacyPanel>
      <InspectorPanel />
    </LegacyPanel>
  );
}

export function ContentBrowserWindow(): JSX.Element {
  return (
    <LegacyPanel>
      <ContentBrowserPanel />
    </LegacyPanel>
  );
}

export function AttackGraphWindow(): JSX.Element {
  return (
    <LegacyPanel>
      <AttackGraphPanel />
    </LegacyPanel>
  );
}

export function EvidenceGraphWindow(): JSX.Element {
  return (
    <LegacyPanel>
      <EvidenceGraphPanel />
    </LegacyPanel>
  );
}

export function TimelineWindow(): JSX.Element {
  return (
    <LegacyPanel>
      <TimelinePanel />
    </LegacyPanel>
  );
}

export function MissionDesignerWindow(): JSX.Element {
  return (
    <LegacyPanel>
      <MissionDesignerPanel />
    </LegacyPanel>
  );
}

export function ObjectiveGraphWindow(): JSX.Element {
  return (
    <LegacyPanel>
      <ObjectiveGraphPanel />
    </LegacyPanel>
  );
}

export function EventTriggerWindow(): JSX.Element {
  return (
    <LegacyPanel>
      <EventTriggerPanel />
    </LegacyPanel>
  );
}

export function ScenarioDesignerWindow(): JSX.Element {
  return (
    <LegacyPanel>
      <ScenarioDesignerPanel />
    </LegacyPanel>
  );
}

export function ScenarioGeneratorWindow(): JSX.Element {
  return (
    <LegacyPanel>
      <ScenarioGeneratorPanel />
    </LegacyPanel>
  );
}

export function LiveInspectorWindow(): JSX.Element {
  return (
    <LegacyPanel>
      <LiveInspectorPanel />
    </LegacyPanel>
  );
}

export function LiveEventsWindow(): JSX.Element {
  return (
    <LegacyPanel>
      <LiveEventsPanel />
    </LegacyPanel>
  );
}

export function DebuggerWindow(): JSX.Element {
  return (
    <LegacyPanel>
      <DebuggerPanel />
    </LegacyPanel>
  );
}

export function GameUiWindow(): JSX.Element {
  return (
    <LegacyPanel>
      <GameUIPanel />
    </LegacyPanel>
  );
}

export function RendererWindow(): JSX.Element {
  return (
    <LegacyPanel>
      <RenderingPanel />
    </LegacyPanel>
  );
}

export function AssetsWindow(): JSX.Element {
  return (
    <LegacyPanel>
      <AssetPipelinePanel />
    </LegacyPanel>
  );
}

export function AssetImportWindow(): JSX.Element {
  return (
    <LegacyPanel>
      <AssetFilePanel />
    </LegacyPanel>
  );
}

export function ScriptsWindow(): JSX.Element {
  return (
    <LegacyPanel>
      <ScriptingPluginPanel />
    </LegacyPanel>
  );
}

export function BuildWindow(): JSX.Element {
  return (
    <LegacyPanel>
      <BuildDeployPanel />
    </LegacyPanel>
  );
}

export function PresentationWindow(): JSX.Element {
  return (
    <LegacyPanel>
      <PresentationPanel />
    </LegacyPanel>
  );
}

/** The editable network topology graph, wired to the network graph editor. */
export function NetworkGraphWindow(): JSX.Element {
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

  return (
    <LegacyPanel>
      <div style={{ height: '100%', minHeight: 420, display: 'flex' }}>
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
      </div>
    </LegacyPanel>
  );
}
