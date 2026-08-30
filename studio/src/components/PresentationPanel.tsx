import { useState } from 'react';
import { useStudio } from '../studio/StudioContext';

export function PresentationPanel(): JSX.Element {
  const {
    state,
    activateTheme,
    setReduceMotion,
    setMotionDuration,
    setFontSizeScale,
    setHighContrast,
    runUxAudit,
    runVisualDesignAudit,
  } = useStudio();

  const [fontScale, setFontScale] = useState(1);
  const [motionMs, setMotionMs] = useState(240);

  return (
    <div className="authoring-panel">
      <h4>Theme</h4>
      <select
        value={state.activeThemeId}
        onChange={(event) => activateTheme(event.target.value)}
      >
        {state.uiThemes.map((theme) => (
          <option key={theme.id} value={theme.id}>
            {theme.name}
          </option>
        ))}
      </select>

      <h4>Accessibility</h4>
      <div className="authoring-card">
        <label>Font Scale</label>
        <input
          type="range"
          min={0.75}
          max={1.75}
          step={0.05}
          value={fontScale}
          onChange={(event) => {
            const value = Number(event.target.value);
            setFontScale(value);
            setFontSizeScale(value);
          }}
        />
        <span>{fontScale.toFixed(2)}</span>

        <button
          onClick={() =>
            setHighContrast(!state.accessibilitySettings.highContrast)
          }
        >
          High Contrast: {state.accessibilitySettings.highContrast ? 'On' : 'Off'}
        </button>

        <button onClick={() => setReduceMotion(!state.motionReduced)}>
          Reduce Motion: {state.motionReduced ? 'On' : 'Off'}
        </button>
      </div>

      <h4>Motion</h4>
      <div className="authoring-card">
        <input
          type="range"
          min={0}
          max={500}
          step={10}
          value={motionMs}
          onChange={(event) => {
            const value = Number(event.target.value);
            setMotionMs(value);
            setMotionDuration(value);
          }}
        />
        <span>{motionMs}ms</span>
      </div>

      <div className="home-actions">
        <button className="btn" onClick={runUxAudit}>Run UX Audit</button>
        <button className="btn" onClick={runVisualDesignAudit}>Run Visual Audit</button>
      </div>

      {state.uxAuditReport && (
        <pre className="authoring-preview">UX: {state.uxAuditReport.summary}</pre>
      )}

      {state.visualDesignAuditReport && (
        <pre className="authoring-preview">Visual: {state.visualDesignAuditReport.summary}</pre>
      )}
    </div>
  );
}
