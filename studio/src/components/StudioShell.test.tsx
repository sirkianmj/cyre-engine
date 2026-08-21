import { describe, expect, it } from 'vitest';
import { StudioApplication } from '../studio/StudioApplication';

describe('StudioApplication', () => {
  it('starts in a stable editor state', () => {
    const application = new StudioApplication();
    const state = application.getState();

    expect(state.projectName).toBe('Untitled CYRE Project');
    expect(state.workspace).toBe('default');
    expect(state.isPlaying).toBe(false);
    expect(state.visiblePanels.project).toBe(true);
    expect(state.visiblePanels.inspector).toBe(true);
  });

  it('controls simulation lifecycle', () => {
    const application = new StudioApplication();

    application.play();
    expect(application.getState().isPlaying).toBe(true);
    expect(application.getState().isPaused).toBe(false);

    application.pause();
    expect(application.getState().isPaused).toBe(true);

    application.resume();
    expect(application.getState().isPaused).toBe(false);

    application.stop();
    expect(application.getState().isPlaying).toBe(false);
  });

  it('changes workspace and panel visibility', () => {
    const application = new StudioApplication();

    application.setWorkspace('network');
    expect(application.getState().workspace).toBe('network');

    application.togglePanel('inspector');
    expect(application.getState().visiblePanels.inspector).toBe(false);

    application.togglePanel('inspector');
    expect(application.getState().visiblePanels.inspector).toBe(true);
  });

  it('rejects invalid simulation speed', () => {
    const application = new StudioApplication();

    expect(() => application.setSimulationSpeed(0)).toThrow();
    expect(() => application.setSimulationSpeed(-1)).toThrow();
    expect(() => application.setSimulationSpeed(Number.NaN)).toThrow();
  });
});
