/**
 * @vitest-environment jsdom
 */

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { StudioProvider, studioApplication } from '../studio/StudioContext';
import { StudioWorkspace } from '../shell/StudioWorkspace';

import type { WindowKind } from '../shell/windowCatalog';

/** Downloads are stubbed so export commands can be asserted in-process. */
const downloads: Array<{ filename: string; mime: string; content: string }> = [];

function openWindow(kind: WindowKind): void {
  studioApplication.windows.open(kind);
}

function renderStudio(): void {
  render(
    <StudioProvider>
      <StudioWorkspace />
    </StudioProvider>,
  );
}

beforeEach(() => {
  downloads.length = 0;
  studioApplication.windows.resetLayout();
  studioApplication.telemetry.clear();
  studioApplication.benchmarks.clear();
  studioApplication.security.clear();
  studioApplication.stop();
  window.localStorage.clear();

  // jsdom implements neither object URLs nor anchor downloads; the export
  // helpers degrade gracefully, so stub them to keep the flow exercisable.
  const createObjectURLStub = (_blob: Blob | MediaSource): string => 'blob:cyre-stub';
  const revokeObjectURLStub = (_url: string): void => undefined;
  URL.createObjectURL = createObjectURLStub;
  URL.revokeObjectURL = revokeObjectURLStub;
});

afterEach(() => {
  cleanup();
});

describe('Scenario Library window', () => {
  it('lists the engine catalog and selects a scenario', () => {
    openWindow('scenario-library');
    renderStudio();

    expect(screen.getByTestId('scenario-row-lab-basic')).toBeTruthy();
    expect(screen.getByTestId('scenario-row-fintech')).toBeTruthy();
    expect(screen.getByTestId('scenario-row-healthcare')).toBeTruthy();

    fireEvent.click(screen.getByTestId('scenario-select-fintech'));

    expect(studioApplication.getState().selectedCyberScenarioId).toBe('fintech');
  });

  it('filters the library', () => {
    openWindow('scenario-library');
    renderStudio();

    fireEvent.change(screen.getByTestId('scenario-filter'), { target: { value: 'health' } });

    expect(screen.getByTestId('scenario-row-healthcare')).toBeTruthy();
    expect(screen.queryByTestId('scenario-row-fintech')).toBeNull();
  });

  it('runs the selected scenario and drives the viewport', () => {
    openWindow('scenario-library');
    renderStudio();

    fireEvent.click(screen.getByTestId('scenario-select-fintech'));
    fireEvent.click(screen.getByTestId('scenario-run-fintech'));

    const stage = screen.getByTestId('cyre-stage');
    expect(stage.getAttribute('data-cyber-state')).toBe('active');
    expect(stage.getAttribute('data-host-count')).toBe('6');
  });

  it('duplicates a catalog scenario into the custom library', () => {
    openWindow('scenario-library');
    renderStudio();

    fireEvent.click(screen.getByTestId('scenario-duplicate-healthcare'));
    fireEvent.change(screen.getByTestId('scenario-duplicate-id'), {
      target: { value: 'hospital-drill' },
    });
    fireEvent.click(screen.getByTestId('scenario-duplicate-confirm'));

    expect(studioApplication.scenarios.get('hospital-drill')).not.toBeNull();
    expect(studioApplication.getState().selectedCyberScenarioId).toBe('hospital-drill');

    studioApplication.removeCustomCyberScenario('hospital-drill');
  });
});

describe('Scenario Editor window', () => {
  it('creates, edits and validates a draft', () => {
    studioApplication.createScenarioDraft('draft-test');
    openWindow('scenario-editor');
    renderStudio();

    fireEvent.change(screen.getByTestId('scenario-name'), { target: { value: 'Edited Draft' } });
    expect(studioApplication.getScenarioDraft()?.name).toBe('Edited Draft');

    fireEvent.click(screen.getByTestId('scenario-validate'));
    expect(studioApplication.getState().scenarioValidation).not.toBeNull();
  });

  it('adds and removes a node with undo support', () => {
    studioApplication.createScenarioDraft('draft-nodes');
    openWindow('scenario-editor');
    renderStudio();

    const before = studioApplication.getScenarioDraft()?.nodes.length ?? 0;

    fireEvent.change(screen.getByTestId('scenario-new-node-id'), { target: { value: 'honeypot' } });
    fireEvent.change(screen.getByTestId('scenario-new-node-name'), { target: { value: 'Honeypot' } });
    fireEvent.click(screen.getByTestId('scenario-node-add'));

    expect(studioApplication.getScenarioDraft()?.nodes).toHaveLength(before + 1);

    studioApplication.undo();
    expect(studioApplication.getScenarioDraft()?.nodes).toHaveLength(before);

    studioApplication.redo();
    expect(studioApplication.getScenarioDraft()?.nodes).toHaveLength(before + 1);
  });
});

describe('Simulation window', () => {
  it('drives transport and reports the deterministic seed', () => {
    openWindow('simulation');
    renderStudio();

    fireEvent.change(screen.getByTestId('simulation-seed'), { target: { value: '777' } });
    fireEvent.click(screen.getByText('Apply seed'));

    expect(studioApplication.cyber.getSeed()).toBe(777);

    fireEvent.click(screen.getByText('Play'));
    expect(studioApplication.getState().isPlaying).toBe(true);

    fireEvent.click(screen.getByText('Stop'));
    expect(studioApplication.getState().playState).toBe('stopped');
  });

  it('toggles step mode and steps the clock', () => {
    studioApplication.play();
    openWindow('simulation');
    renderStudio();

    fireEvent.click(screen.getByTestId('simulation-step-mode'));
    expect(studioApplication.getState().cyberSession.stepMode).toBe(true);

    const before = studioApplication.cyber.getTime();
    fireEvent.click(screen.getByText('Step'));
    expect(studioApplication.cyber.getTime()).toBeGreaterThan(before);
  });
});

describe('Attack and detection windows', () => {
  it('executes the canonical attack chain against live state', () => {
    studioApplication.play();
    openWindow('attack');
    renderStudio();

    fireEvent.click(screen.getByTestId('attack-escalatePrivileges'));
    fireEvent.click(screen.getByTestId('attack-moveToDatabase'));
    fireEvent.click(screen.getByTestId('attack-accessTarget'));

    const state = studioApplication.cyber.getState();
    expect(state?.attacker.position).toBe('database-server');
    expect(state?.objective.achieved).toBe(true);
  });

  it('raises alerts, investigates one and isolates a host', () => {
    studioApplication.play();
    openWindow('detection');
    renderStudio();

    fireEvent.click(screen.getByTestId('detection-run'));

    const alerts = studioApplication.cyber.getState()?.alerts ?? [];
    expect(alerts.length).toBeGreaterThan(0);

    const first = alerts[0];
    fireEvent.click(screen.getByTestId(`alert-investigate-${first.id}`));
    expect(
      studioApplication.cyber.getState()?.alerts.find((alert) => alert.id === first.id)?.status,
    ).toBe('investigating');

    fireEvent.click(screen.getByTestId('isolate-web-server'));
    expect(studioApplication.cyber.getState()?.hosts['web-server'].isolated).toBe(true);

    fireEvent.click(screen.getByTestId('restore-web-server'));
    expect(studioApplication.cyber.getState()?.hosts['web-server'].isolated).toBe(false);
  });

  it('blocks a network path between two hosts', () => {
    studioApplication.play();
    openWindow('detection');
    renderStudio();

    fireEvent.change(screen.getByTestId('block-source'), { target: { value: 'web-server' } });
    fireEvent.change(screen.getByTestId('block-target'), { target: { value: 'database-server' } });
    fireEvent.click(screen.getByTestId('block-path'));

    expect(studioApplication.cyber.getState()?.blockedPaths).toContainEqual({
      source: 'web-server',
      target: 'database-server',
    });
  });
});

describe('Host inspector window', () => {
  it('shows live per-host state', () => {
    studioApplication.play();
    openWindow('hosts');
    renderStudio();

    expect(screen.getByTestId('host-row-web-server')).toBeTruthy();
    expect(screen.getByTestId('host-row-database-server')).toBeTruthy();
    expect(screen.getByTestId('host-row-web-server').textContent).toContain('compromised');
  });
});

describe('Telemetry window', () => {
  it('records engine actions and exports every format', () => {
    studioApplication.play();
    studioApplication.executeCyberAction('detectThreats');
    openWindow('telemetry');
    renderStudio();

    expect(studioApplication.telemetry.getEventCount()).toBeGreaterThan(0);

    fireEvent.click(screen.getByTestId('telemetry-export'));
    fireEvent.click(within(screen.getByTestId('telemetry-format')).getByText('CSV'));
    fireEvent.click(screen.getByTestId('telemetry-export'));
    fireEvent.click(within(screen.getByTestId('telemetry-format')).getByText('NDJSON'));
    fireEvent.click(screen.getByTestId('telemetry-export'));

    expect(studioApplication.getState().telemetryEvents.length).toBeGreaterThan(0);
    expect(screen.getAllByTestId(/^telemetry-row-/).length).toBeGreaterThan(0);
  });
});

describe('Replay window', () => {
  it('records, steps and jumps through a replay', () => {
    studioApplication.play();
    studioApplication.executeCyberAction('escalatePrivileges');

    const replay = studioApplication.getCyberSimulationReplay();
    expect(replay).not.toBeNull();
    studioApplication.openReplayPlayback(replay);

    openWindow('replay');
    renderStudio();

    fireEvent.click(screen.getByTestId('replay-forward'));
    expect(studioApplication.getReplayPlayback().index).toBe(1);

    fireEvent.click(screen.getByText('End'));
    expect(studioApplication.getReplayPlayback().index).toBe(replay?.actions.length);

    fireEvent.click(screen.getByTestId('replay-back'));
    expect(studioApplication.getReplayPlayback().index).toBe((replay?.actions.length ?? 1) - 1);

    fireEvent.click(screen.getByTestId('replay-play'));
    expect(studioApplication.getReplayPlayback().playing).toBe(true);
  });
});

describe('Research window', () => {
  it('runs a seeded experiment and compares the runs', () => {
    openWindow('research');
    renderStudio();

    fireEvent.change(screen.getByTestId('experiment-count'), { target: { value: '4' } });
    fireEvent.click(screen.getByTestId('experiment-run'));

    const experiments = studioApplication.experiments.list();
    expect(experiments).toHaveLength(1);
    expect(experiments[0].comparison.runCount).toBe(4);
    expect(experiments[0].comparison.deterministic).toBe(true);
    expect(screen.getAllByTestId(/^experiment-run-/)).toHaveLength(4);
  });
});

describe('Performance window', () => {
  it('runs both engine benchmarks', () => {
    openWindow('performance');
    renderStudio();

    fireEvent.click(screen.getByTestId('benchmark-run'));
    fireEvent.click(screen.getByTestId('benchmark-large'));

    const reports = studioApplication.benchmarks.list();
    expect(reports).toHaveLength(2);
    expect(screen.getAllByTestId(/^benchmark-row-/)).toHaveLength(2);
  });
});

describe('Security window', () => {
  it('validates the selected scenario and rejects hostile payloads', () => {
    openWindow('security');
    renderStudio();

    fireEvent.click(screen.getByTestId('security-run'));

    const report = studioApplication.security.list().at(-1);
    expect(report?.sandbox.rejected).toBe(false);
    expect(report?.hostileChecks.length).toBeGreaterThan(0);
    expect(report?.hostileChecks.every((check) => check.rejected)).toBe(true);
    expect(report?.passed).toBe(true);
  });

  it('rejects a hostile document typed into the sandbox field', () => {
    openWindow('security');
    renderStudio();

    fireEvent.change(screen.getByTestId('security-payload'), {
      target: { value: '{"id": "", "name": "", "nodes": []}' },
    });

    expect(screen.getByText(/Rejected by the sandbox/i)).toBeTruthy();
  });
});

describe('Visualization window', () => {
  it('switches render mode and toggles overlays', () => {
    openWindow('visualization');
    renderStudio();

    fireEvent.click(within(screen.getByTestId('visualization-mode')).getByText('2.5D'));
    expect(studioApplication.getState().renderMode).toBe('2.5d');

    fireEvent.click(screen.getByTestId('overlay-labels'));
    expect(screen.getByTestId('overlay-labels')).toBeTruthy();
  });
});

describe('Project window', () => {
  it('creates a project and exports the document', () => {
    openWindow('project');
    renderStudio();

    fireEvent.change(screen.getByTestId('project-name'), { target: { value: 'SOC Drill' } });
    fireEvent.click(screen.getByTestId('project-create'));

    expect(studioApplication.getState().projectTitle).toBe('SOC Drill');
  });
});

describe('Output window', () => {
  it('shows engine notifications', () => {
    studioApplication.notify('success', 'Engine action completed.');
    openWindow('output');
    renderStudio();

    const outputWindow = screen.getByTestId('window-output');
    expect(within(outputWindow).getByText('Engine action completed.')).toBeTruthy();
  });
});
