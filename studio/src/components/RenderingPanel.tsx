import { useState } from 'react';
import { useStudio } from '../studio/StudioContext';

export function RenderingPanel(): JSX.Element {
  const {
    state,
    listRenderingBackends,
    setActiveRenderingBackend,
    renderScene,
  } = useStudio();

  const [width, setWidth] = useState(1920);
  const [height, setHeight] = useState(1080);
  const [mode, setMode] = useState('2d');

  const backends = state.renderingBackends ?? listRenderingBackends();
  const result = state.renderResult as
    | {
        frameNumber?: number;
        backendId?: string;
        targetId?: string;
        renderedAt?: number;
        stats?: Record<string, unknown>;
        data?: Record<string, unknown>;
      }
    | null;

  return (
    <div className="authoring-panel">
      <h4>Rendering Backend</h4>
      <select
        value={state.activeRenderingBackendId ?? ''}
        onChange={(event) => setActiveRenderingBackend(event.target.value)}
      >
        {backends.map((backend) => (
          <option key={backend.id} value={backend.id}>
            {backend.name}
          </option>
        ))}
      </select>

      <div className="authoring-grid">
        <label>
          Width
          <input
            type="number"
            value={width}
            onChange={(event) => setWidth(Number(event.target.value))}
          />
        </label>

        <label>
          Height
          <input
            type="number"
            value={height}
            onChange={(event) => setHeight(Number(event.target.value))}
          />
        </label>

        <label>
          Mode
          <select value={mode} onChange={(event) => setMode(event.target.value)}>
            <option value="2d">2D</option>
            <option value="2.5d">2.5D</option>
            <option value="3d">3D</option>
            <option value="headless">Headless</option>
          </select>
        </label>
      </div>

      <button
        className="btn btn-primary"
        onClick={() => renderScene(width, height, mode)}
      >
        Render Scene
      </button>

      {result && (
        <pre className="authoring-preview">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
