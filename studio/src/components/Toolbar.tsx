import { useStudio } from '../studio/StudioContext';

export function Toolbar() {
  const { application, state } = useStudio();

  const simulationLabel = !state.isPlaying
    ? 'Play'
    : state.isPaused
      ? 'Resume'
      : 'Pause';

  const simulationIcon = !state.isPlaying
    ? '▶'
    : state.isPaused
      ? '▶'
      : 'Ⅱ';

  return (
    <div className="toolbar">
      <div className="toolbar-group">
        <button
          className="toolbar-button primary"
          onClick={() => {
            if (!state.isPlaying) {
              application.play();
            } else if (state.isPaused) {
              application.resume();
            } else {
              application.pause();
            }
          }}
          title={`${simulationLabel} simulation`}
        >
          <span>{simulationIcon}</span>
          <span>{simulationLabel}</span>
        </button>

        <button
          className="toolbar-button"
          onClick={() => application.stop()}
          disabled={!state.isPlaying}
          title="Stop simulation"
        >
          ■
        </button>

        <button
          className="toolbar-button"
          onClick={() => application.restart()}
          title="Restart simulation"
        >
          ↻
        </button>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group">
        <button
          className="toolbar-button"
          onClick={() =>
            window.dispatchEvent(new CustomEvent('cyre:command-palette'))
          }
          title="Command Palette"
        >
          ⌘
        </button>

        <button
          className="toolbar-button"
          onClick={() =>
            window.dispatchEvent(
              new CustomEvent('cyre:notification', {
                detail: 'Project saved.',
              }),
            )
          }
          title="Save Project"
        >
          ↓
        </button>
      </div>

      <div className="toolbar-spacer" />

      <div className="simulation-controls">
        <span className="simulation-label">SIM</span>
        <select
          value={state.simulationSpeed}
          onChange={(event) =>
            application.setSimulationSpeed(Number(event.target.value))
          }
          aria-label="Simulation speed"
        >
          <option value="0.25">0.25×</option>
          <option value="0.5">0.5×</option>
          <option value="1">1×</option>
          <option value="2">2×</option>
          <option value="4">4×</option>
        </select>
      </div>

      <div
        className={`runtime-indicator ${state.isPlaying ? 'running' : ''}`}
      >
        <span className="runtime-dot" />
        {state.isPlaying
          ? state.isPaused
            ? 'PAUSED'
            : 'RUNNING'
          : 'EDIT MODE'}
      </div>
    </div>
  );
}
