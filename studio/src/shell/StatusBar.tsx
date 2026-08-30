/**
 * StatusBar
 * ----------
 * A quiet, information-dense strip: engine state, transport, scenario,
 * render mode, entity counts and the latest status message.
 */

import { CYRE_BRANDING, attribution, engineVersion } from '../branding';
import { useStudio } from '../studio/StudioContext';
import { Dot } from '../ui/primitives';

export function StatusBar(): JSX.Element {
  const { state, openWindow } = useStudio();
  const session = state.cyberSession;

  const transportTone = state.isPlaying ? 'success' : state.isPaused ? 'warning' : 'neutral';
  const transportLabel = state.isPlaying ? 'RUNNING' : state.isPaused ? 'PAUSED' : 'STOPPED';

  return (
    <footer className="cyre-statusbar" data-testid="studio-statusbar">
      <span className="cyre-statusbar-item" data-tone={transportTone === 'neutral' ? undefined : transportTone}>
        <Dot tone={transportTone} />
        {transportLabel}
      </span>
      <span className="cyre-statusbar-item">t={session.time}ms</span>
      <span className="cyre-statusbar-item">seed {session.seed}</span>
      <span className="cyre-statusbar-item">{session.state?.attackStage ?? session.scenarioId}</span>
      <span className="cyre-statusbar-item">{state.renderMode.toUpperCase()}</span>
      <span className="cyre-statusbar-item">
        {Object.keys(session.state?.hosts ?? {}).length || state.networkNodes.length} entities
      </span>
      <span className="cyre-statusbar-item">{state.telemetryEvents.length} telemetry</span>
      <span className="cyre-statusbar-item">
        <button type="button" onClick={() => openWindow('output')} data-testid="statusbar-windows">
          {state.windows.length} windows
        </button>
      </span>
      <span className="cyre-statusbar-message">{state.statusMessage}</span>

      {/* Attribution lives here so it is on screen while the editor is in use,
          not only in the About window or a console log. */}
      <span className="cyre-statusbar-brand" data-testid="statusbar-brand">
        <span data-testid="statusbar-engine-version">engine v{engineVersion()}</span>
        <span className="cyre-statusbar-sep" aria-hidden="true">
          ·
        </span>
        <span data-testid="statusbar-developer">{CYRE_BRANDING.developer}</span>
        <span className="cyre-statusbar-sep" aria-hidden="true">
          ·
        </span>
        <span data-testid="statusbar-developer-role">{attribution().split('· ')[1]}</span>
      </span>
    </footer>
  );
}
