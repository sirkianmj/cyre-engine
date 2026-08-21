import { useStudioState } from '../studio/StudioContext';

export function StatusBar(): JSX.Element {
  const state = useStudioState();
  const application = state.application;

  return (
    <footer className="status-bar">
      <div className="status-bar__section">
        <span className="status-bar__label">CYRE</span>
        <span>Studio 0.1.0</span>
      </div>

      <div className="status-bar__section">
        <span>
          Workspace: {application.getState().workspace}
        </span>
      </div>

      <div className="status-bar__section status-bar__section--right">
        <span>
          Simulation: {application.getState().isPlaying
            ? application.getState().isPaused
              ? 'paused'
              : 'running'
            : 'idle'}
        </span>
        <span>
          Speed: {application.getState().simulationSpeed}×
        </span>
        <span>
          Notifications: {state.notifications.length}
        </span>
      </div>
    </footer>
  );
}
