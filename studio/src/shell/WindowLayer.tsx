/**
 * WindowLayer
 * ------------
 * Renders every open window on the desktop, ordered by z-index, plus the
 * tray of minimized windows. Dragging, resizing and focus are handled by
 * `WindowFrame`; this layer only decides what is on screen.
 */

import { useMemo } from 'react';

import { useStudio } from '../studio/StudioContext';
import { Icon } from '../ui/Icons';
import type { IconName } from '../ui/Icons';
import { renderWindowContent } from '../windows';

import { getWindowDefinition } from './windowCatalog';
import { WindowFrame } from './WindowFrame';

/** Live subtitle shown in each window's title bar. */
function useWindowSubtitle(kind: string): string {
  const { state } = useStudio();

  return useMemo(() => {
    switch (kind) {
      case 'simulation':
        return `seed ${state.cyberSession.seed} · t=${state.cyberSession.time}`;
      case 'attack':
        return state.cyberSession.state?.attackStage ?? 'idle';
      case 'detection':
        return `${state.cyberSession.state?.alerts.length ?? 0} alerts`;
      case 'hosts':
        return `${Object.keys(state.cyberSession.state?.hosts ?? {}).length} hosts`;
      case 'telemetry':
        return `${state.telemetryEvents.length} events`;
      case 'replay':
        return state.replayPlayback.replay
          ? `${state.replayPlayback.index}/${state.replayPlayback.replay.actions.length}`
          : 'no replay';
      case 'research':
        return `${state.experiments.length} experiments`;
      case 'performance':
        return `${state.benchmarks.length} reports`;
      case 'security':
        return `${state.securityReports.length} reports`;
      case 'scenario-library':
        return `${state.scenarioLibrary.length} scenarios`;
      case 'scenario-editor':
        return state.scenarioDraft?.id ?? 'no draft';
      case 'project':
        return state.projectTitle;
      case 'visualization':
        return state.renderMode;
      case 'output':
        return `${state.notifications.length} messages`;
      default:
        return '';
    }
  }, [kind, state]);
}

function WindowSlot({ windowId }: { windowId: string }): JSX.Element | null {
  const { state, application } = useStudio();
  const frame = state.windows.find((entry) => entry.id === windowId);
  const subtitle = useWindowSubtitle(frame?.kind ?? '');

  if (!frame || frame.minimized) return null;

  const definition = getWindowDefinition(frame.kind);

  return (
    <WindowFrame
      window={frame}
      subtitle={subtitle}
      icon={<Icon name={definition.icon as IconName} size={13} />}
      onFocus={(id) => application.windows.focus(id)}
      onClose={(id) => application.windows.close(id)}
      onMinimize={(id) => application.windows.minimize(id)}
      onToggleMaximize={(id) => application.windows.toggleMaximize(id)}
      onMove={(id, x, y) => application.windows.move(id, x, y)}
      onResize={(id, width, height) => application.windows.resize(id, width, height)}
    >
      {renderWindowContent(frame.kind)}
    </WindowFrame>
  );
}

export function WindowLayer(): JSX.Element {
  const { state, application } = useStudio();
  const minimized = state.windows.filter((entry) => entry.minimized);

  return (
    <>
      {state.windows.map((entry) => (
        <WindowSlot key={entry.id} windowId={entry.id} />
      ))}

      {minimized.length > 0 ? (
        <div className="cyre-window-minimized-tray" data-testid="window-tray">
          {minimized.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className="cyre-window-tray-chip"
              data-testid={`window-tray-${entry.kind}`}
              onClick={() => application.windows.restore(entry.id)}
            >
              <Icon name={getWindowDefinition(entry.kind).icon as IconName} size={12} />
              {entry.title}
            </button>
          ))}
        </div>
      ) : null}
    </>
  );
}
