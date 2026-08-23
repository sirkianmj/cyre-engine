import { useEffect, useState } from 'react';

import { useStudio } from '../studio/StudioContext';
import { EditorWorkspace } from './EditorWorkspace';

type StudioPhase = 'boot' | 'home' | 'editor';

function BootScreen(): JSX.Element {
  return (
    <div className="boot-screen">
      <div className="boot-mark-wrap">
        <div className="boot-mark-ring" />
        <div className="boot-mark">C</div>
      </div>
      <h1 className="boot-title">CYRE Studio</h1>
      <p className="boot-subtitle">Cybersecurity Reality Engine</p>
      <div className="boot-progress">
        <span />
      </div>
      <span className="boot-version">v1.0.0 · Deep Blue</span>
    </div>
  );
}

function HomeScreen({
  projectTitle,
  statusMessage,
  renderMode,
  hasSavedProject,
  onRenderModeChange,
  onContinue,
  onNewProject,
  onOpenSaved,
}: {
  projectTitle: string;
  statusMessage: string;
  renderMode: '2d' | '2.5d' | '3d';
  hasSavedProject: boolean;
  onRenderModeChange: (mode: '2d' | '2.5d' | '3d') => void;
  onContinue: () => void;
  onNewProject: () => void;
  onOpenSaved: () => void;
}): JSX.Element {
  return (
    <div className="home-screen">
      <nav className="home-nav">
        <div className="home-brand">
          <div className="home-brand-mark">C</div>
          <div>
            <strong>CYRE Studio</strong>
            <span>Professional cyber development</span>
          </div>
        </div>
        <button type="button" className="btn" onClick={onContinue}>
          Enter Studio
        </button>
      </nav>

      <main className="home-main">
        <div className="home-hero">
          <h1>
            Build the world&apos;s most <span>advanced cyber simulations.</span>
          </h1>
          <p>
            Design networks, missions, attacks, and training scenarios in a production editor
            with live 2D, 2.5D, and 3D engines.
          </p>

          <div className="home-card glass-strong">
            <div>
              <div className="home-card-title">Active project</div>
              <div className="home-card-name">{projectTitle}</div>
              <div className="home-card-status">{statusMessage}</div>
            </div>
            <button type="button" className="btn btn-primary" onClick={onContinue}>
              Continue
            </button>
          </div>

          <div className="home-render-select">
            <span>Default render mode</span>
            <div className="render-mode-options">
              {(['2d', '2.5d', '3d'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={renderMode === mode ? 'active' : ''}
                  onClick={() => onRenderModeChange(mode)}
                >
                  {mode === '2d' ? '2D' : mode === '2.5d' ? '2.5D' : '3D'}
                </button>
              ))}
            </div>
          </div>

          <div className="home-actions">
            <button type="button" className="btn btn-primary" onClick={onNewProject}>
              New Project
            </button>
            <button type="button" className="btn" onClick={onOpenSaved} disabled={!hasSavedProject}>
              Open Last Project
            </button>
          </div>
        </div>
      </main>

      <footer className="home-footer">
        <span>CYRE Engine · Liquid Glass Editor</span>
        <span>v1.0.0</span>
      </footer>
    </div>
  );
}

export function StudioShell(): JSX.Element {
  const {
    application,
    state,
    setRenderMode,
    loadSavedProject,
    hasSavedProject,
  } = useStudio();

  const [phase, setPhase] = useState<StudioPhase>('boot');

  useEffect(() => {
    const timer = window.setTimeout(() => setPhase('home'), 1400);
    return () => window.clearTimeout(timer);
  }, []);

  if (phase === 'boot') {
    return <BootScreen />;
  }

  if (phase === 'home') {
    return (
      <HomeScreen
        projectTitle={state.projectTitle}
        statusMessage={state.statusMessage}
        renderMode={state.renderMode}
        hasSavedProject={hasSavedProject()}
        onRenderModeChange={(mode) => setRenderMode(mode)}
        onContinue={() => setPhase('editor')}
        onNewProject={() => {
          application.createProject('Untitled CYRE Project', 'soc-game');
          setPhase('editor');
        }}
        onOpenSaved={() => {
          loadSavedProject();
          setPhase('editor');
        }}
      />
    );
  }

  return <EditorWorkspace onGoHome={() => setPhase('home')} />;
}
