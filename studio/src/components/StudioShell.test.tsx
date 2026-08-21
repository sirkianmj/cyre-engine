import { describe, expect, it } from 'vitest';
import { StudioApplication } from '../studio/StudioApplication';

describe('StudioApplication', () => {
  it('creates a default CYRE project', () => {
    const application = new StudioApplication();
    const state = application.getState();

    expect(state.projectTitle).toBe(
      'Untitled CYRE Project',
    );
    expect(state.projectData?.id).toBeTruthy();
    expect(state.playState).toBe('stopped');
    expect(state.workspaces.length).toBeGreaterThan(0);
    expect(state.engineState).toBeTruthy();
  });

  it('controls the real play mode lifecycle', () => {
    const application = new StudioApplication();

    application.play();
    expect(application.getState().playState).toBe('running');
    expect(application.getState().isPlaying).toBe(true);

    application.pause();
    expect(application.getState().playState).toBe('paused');
    expect(application.getState().isPaused).toBe(true);

    application.resume();
    expect(application.getState().playState).toBe('running');

    application.stop();
    expect(application.getState().playState).toBe('stopped');
  });

  it('creates and saves a project', () => {
    const application = new StudioApplication();

    application.createProject(
      'Test Project',
      'training-simulation',
    );

    expect(application.getState().projectTitle).toBe(
      'Test Project',
    );

    expect(() => application.saveProject()).not.toThrow();
  });

  it('rejects invalid simulation speed', () => {
    const application = new StudioApplication();

    expect(() => application.setSimulationSpeed(0)).toThrow();
    expect(() => application.setSimulationSpeed(-1)).toThrow();
    expect(() => application.setSimulationSpeed(Number.NaN)).toThrow();
  });
});
