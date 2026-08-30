/**
 * TransportBar
 * -------------
 * The single contextual toolbar. It only carries the controls that are used
 * constantly: transport, speed, render mode and the active scenario.
 * Everything else lives behind the menu bar.
 */

import { useStudio } from '../studio/StudioContext';
import { Icon } from '../ui/Icons';
import { Badge, IconButton, Segmented } from '../ui/primitives';

const SPEEDS = ['0.25', '0.5', '1', '2', '4'] as const;

export function TransportBar(): JSX.Element {
  const { state, application, runCommand, openWindow } = useStudio();
  const session = state.cyberSession;
  const running = state.isPlaying || state.isPaused;

  return (
    <div className="cyre-toolbar" data-testid="studio-toolbar">
      <div className="cyre-toolbar-group">
        <IconButton
          icon={running ? 'stop' : 'play'}
          title={running ? 'Stop simulation' : 'Play simulation'}
          aria-label={running ? 'Stop simulation' : 'Play simulation'}
          testId="transport-play"
          onClick={() => runCommand(running ? 'simulation.stop' : 'simulation.play')}
        />
        <IconButton
          icon={state.isPaused ? 'play' : 'pause'}
          title={state.isPaused ? 'Resume simulation' : 'Pause simulation'}
          aria-label={state.isPaused ? 'Resume simulation' : 'Pause simulation'}
          testId="transport-pause"
          disabled={!state.isPlaying && !state.isPaused}
          onClick={() => runCommand(state.isPaused ? 'simulation.resume' : 'simulation.pause')}
        />
        <IconButton
          icon="restart"
          title="Restart simulation"
          aria-label="Restart simulation"
          testId="transport-restart"
          onClick={() => runCommand('simulation.restart')}
        />
        <IconButton
          icon="step-forward"
          title="Step one deterministic tick"
          aria-label="Step one deterministic tick"
          testId="transport-step"
          disabled={!session.active}
          active={session.stepMode}
          onClick={() => runCommand('simulation.step')}
        />
      </div>

      <span className="cyre-toolbar-divider" />

      <Segmented
        ariaLabel="Simulation speed"
        value={String(state.simulationSpeed)}
        options={SPEEDS.map((speed) => ({ value: speed, label: `${speed}×` }))}
        testId="toolbar-speed"
        onChange={(value) => runCommand(`simulation.speed.${value}`)}
      />

      <span className="cyre-toolbar-divider" />

      <Segmented
        ariaLabel="Render mode"
        value={state.renderMode}
        options={[
          { value: '2d', label: '2D' },
          { value: '2.5d', label: '2.5D' },
          { value: '3d', label: '3D' },
        ]}
        testId="toolbar-mode"
        onChange={(value) => runCommand(`view.mode-${value}`)}
      />

      <span className="cyre-toolbar-spacer" />

      <button
        type="button"
        className="cyre-scenario-chip"
        title="Open the scenario library"
        data-testid="toolbar-scenario"
        onClick={() => openWindow('scenario-library')}
      >
        <Icon name="library" size={12} />
        <span>{session.scenarioName}</span>
        <Badge tone={state.hasCustomCyberScenario ? 'accent' : 'info'}>{session.scenarioId}</Badge>
      </button>

      <span className="cyre-toolbar-divider" />

      <IconButton
        icon="search"
        title="Command palette (⌘K)"
        aria-label="Open command palette"
        testId="toolbar-palette"
        onClick={() => runCommand('tools.palette')}
      />
      <IconButton
        icon="chart"
        title="Telemetry"
        aria-label="Open telemetry"
        testId="toolbar-telemetry"
        onClick={() => openWindow('telemetry')}
      />
      <IconButton
        icon="shield"
        title="Detection & response"
        aria-label="Open detection and response"
        testId="toolbar-detection"
        active={(session.state?.alerts.length ?? 0) > 0}
        onClick={() => openWindow('detection')}
      />
      <IconButton
        icon="terminal"
        title="Output"
        aria-label="Open output"
        testId="toolbar-output"
        onClick={() => openWindow('output')}
      />
      <span className="cyre-toolbar-label" aria-hidden="true">
        {application.getState().engineState}
      </span>
    </div>
  );
}
